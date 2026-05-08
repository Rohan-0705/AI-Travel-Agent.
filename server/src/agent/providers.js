import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

const defaultProvider = "mock";

export function getConfiguredProviderName() {
  return (process.env.LLM_PROVIDER ?? defaultProvider).toLowerCase();
}

export function getProvider() {
  const providerName = getConfiguredProviderName();

  if (providerName === "openai" && process.env.OPENAI_API_KEY) {
    return createOpenAICompatibleProvider({
      name: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    });
  }

  if (providerName === "xai" && process.env.XAI_API_KEY) {
    return createOpenAICompatibleProvider({
      name: "xai",
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
      model: process.env.XAI_MODEL ?? "grok-4.20-reasoning",
      timeout: 360000,
    });
  }

  if (providerName === "gemini" && process.env.GEMINI_API_KEY) {
    return createGeminiProvider();
  }

  return createMockProvider(providerName);
}

function createOpenAICompatibleProvider({ name, apiKey, baseURL, model, timeout }) {
  const client = new OpenAI({
    apiKey,
    baseURL,
    timeout,
  });

  return {
    name,
    model,
    async generateJson({ system, user }) {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      return parseJson(response.choices?.[0]?.message?.content);
    },
    async streamText({ system, user, onToken }) {
      const stream = await client.chat.completions.create({
        model,
        temperature: 0.55,
        stream: true,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      let text = "";

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content ?? "";

        if (delta) {
          text += delta;
          onToken(delta);
        }
      }

      return text;
    },
  };
}

function createGeminiProvider() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  return {
    name: "gemini",
    model,
    async generateJson({ system, user }) {
      const response = await ai.models.generateContent({
        model,
        contents: `${system}\n\n${user}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      return parseJson(response.text);
    },
    async streamText({ system, user, onToken }) {
      const stream = await ai.models.generateContentStream({
        model,
        contents: `${system}\n\n${user}`,
        config: {
          temperature: 0.55,
        },
      });

      let text = "";

      for await (const chunk of stream) {
        const delta = chunk.text ?? "";

        if (delta) {
          text += delta;
          onToken(delta);
        }
      }

      return text;
    },
  };
}

function createMockProvider(requestedProvider) {
  return {
    name: "mock",
    model: requestedProvider === "mock" ? "local-demo" : `missing-key:${requestedProvider}`,
    async generateJson() {
      return null;
    },
    async streamText({ user, onToken }) {
      const parsed = parseJsonFromPrompt(user);
      const destination = parsed?.destination ?? "your destination";
      const days = parsed?.days?.length ? parsed.days : [];
      const cost = parsed?.cost?.total ?? "an estimated budget";
      const places = parsed?.places?.slice(0, 5).map((place) => place.name).filter(Boolean);
      const weather = parsed?.weather?.summary ?? "Weather data is estimated because no weather API key is configured.";
      const text = [
        `## Summary\nI built a practical ${destination} plan using the available tool results. ${weather}`,
        `\n## Day-wise plan\n${days
          .map((day) => `- ${day.day}: ${day.title} - ${day.description}`)
          .join("\n")}`,
        `\n## Estimated cost\n${cost}. This is a planning estimate, not a booking quote.`,
        `\n## Places worth saving\n${places?.length ? places.map((place) => `- ${place}`).join("\n") : "- Add places API keys for live POIs."}`,
        "\n## Travel tips\n- Keep arrival day light.\n- Group nearby places to reduce transit.\n- Recheck weather and prices before booking.",
      ].join("\n");

      for (const token of chunkText(text)) {
        await wait(18);
        onToken(token);
      }

      return text;
    },
  };
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/^```json/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function parseJsonFromPrompt(prompt) {
  const marker = "STRUCTURED_PLAN_JSON:";
  const index = prompt.indexOf(marker);

  if (index === -1) {
    return null;
  }

  try {
    return JSON.parse(prompt.slice(index + marker.length).trim());
  } catch {
    return null;
  }
}

function chunkText(text) {
  return text.match(/.{1,28}(\s|$)/g) ?? [text];
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
