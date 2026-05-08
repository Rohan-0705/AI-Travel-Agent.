import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { runTravelAgent } from "./src/agent/agentController.js";
import { getConfiguredProviderName } from "./src/agent/providers.js";
import { API_SOURCES } from "./src/apiSources.js";
import {
  connectDatabase,
  deleteSavedTrip,
  deleteSearchHistory,
  getTravelMemory,
  listSavedTrips,
  listSearchHistory,
  saveConversation,
  saveSearchHistory,
  saveTravelMemory,
  saveTrip,
} from "./src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config({ path: path.join(__dirname, ".env") });

const port = Number(process.env.PORT ?? 5000);
const clientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://127.0.0.1:5173", "http://localhost:5173"];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigins,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: clientOrigins,
  }),
);
app.use(express.json({ limit: "1mb" }));

const dbState = await connectDatabase();

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    provider: getConfiguredProviderName(),
    mongo: dbState.enabled,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/sources", (_request, response) => {
  response.json(API_SOURCES);
});

app.get("/api/saved-trips", async (request, response) => {
  const clientId = request.query.clientId ?? "default";
  response.json(await listSavedTrips(clientId));
});

app.post("/api/saved-trips", async (request, response) => {
  const saved = await saveTrip({
    clientId: request.body?.clientId ?? "default",
    clientItemId: request.body?.id ?? request.body?.clientItemId ?? "",
    title: request.body?.title ?? "Saved trip",
    destination: request.body?.destination ?? "",
    summary: request.body?.summary ?? "",
    days: Number(request.body?.days) || 0,
    travelers: Number(request.body?.travelers) || 1,
    budget: request.body?.budget ?? "",
    structuredPlan: request.body?.structuredPlan ?? {},
  });

  response.json({ ok: true, saved });
});

app.delete("/api/saved-trips/:id", async (request, response) => {
  const clientId = request.query.clientId ?? "default";
  const result = await deleteSavedTrip({
    id: request.params.id,
    clientId,
  });

  response.json({ ok: true, deletedCount: result.deletedCount ?? 0 });
});

app.get("/api/search-history", async (request, response) => {
  const clientId = request.query.clientId ?? "default";
  response.json(await listSearchHistory(clientId));
});

app.delete("/api/search-history/:id", async (request, response) => {
  const clientId = request.query.clientId ?? "default";
  const result = await deleteSearchHistory({
    id: request.params.id,
    clientId,
  });

  response.json({ ok: true, deletedCount: result.deletedCount ?? 0 });
});

app.get("/api/memory", async (request, response) => {
  const clientId = request.query.clientId ?? "default";
  response.json(await getTravelMemory(clientId));
});

app.post("/api/memory", async (request, response) => {
  const memory = await saveTravelMemory({
    clientId: request.body?.clientId ?? "default",
    memory: request.body?.memory ?? {},
  });

  response.json({ ok: true, memory });
});

app.post("/api/agent/run", async (request, response) => {
  const chunks = [];
  const events = [];

  try {
    const result = await runTravelAgent({
      message: request.body?.message ?? "",
      history: request.body?.history ?? [],
      tripContext: request.body?.tripContext ?? {},
      clientId: request.body?.clientId ?? "default",
      emit: (event, payload) => {
        events.push({ event, payload });

        if (event === "agent:chunk") {
          chunks.push(payload.delta);
        }
      },
    });

      await saveSearchHistory({
        clientId: request.body?.clientId ?? "default",
        clientItemId: request.body?.historyItemId ?? "",
        sessionId: request.body?.sessionId ?? "api",
      message: request.body?.message ?? "",
      destination: result.structuredPlan?.destination ?? "",
      intent: result.structuredPlan?.intent ?? "",
    });

    response.json({
      ...result,
      text: chunks.join("") || result.text,
      events,
    });
  } catch (error) {
    response.status(500).json({
      error: error.message,
    });
  }
});

io.on("connection", (socket) => {
  socket.emit("server:ready", {
    provider: getConfiguredProviderName(),
    socketId: socket.id,
  });

  socket.on("chat:message", async (payload = {}) => {
    const emit = (event, data) => socket.emit(event, data);

    try {
      const result = await runTravelAgent({
        message: payload.message ?? "",
        history: payload.history ?? [],
        tripContext: payload.tripContext ?? {},
        sessionId: payload.sessionId ?? socket.id,
        clientId: payload.clientId ?? "default",
        emit,
      });

      await saveConversation({
        sessionId: payload.sessionId ?? socket.id,
        userMessage: payload.message ?? "",
        assistantMessage: result.text,
        structuredPlan: result.structuredPlan,
        toolResults: result.toolResults,
        provider: result.provider,
      });

      await saveSearchHistory({
        clientId: payload.clientId ?? "default",
        clientItemId: payload.historyItemId ?? "",
        sessionId: payload.sessionId ?? socket.id,
        message: payload.message ?? "",
        destination: result.structuredPlan?.destination ?? "",
        intent: result.structuredPlan?.intent ?? "",
      });
    } catch (error) {
      emit("agent:error", {
        message: error.message,
      });
    }
  });
});

app.use(express.static(distDir));
app.use((_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

server.listen(port, () => {
  console.log(`AI Travel Agent server running on http://127.0.0.1:${port}`);
});
