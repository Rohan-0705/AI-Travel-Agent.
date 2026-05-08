import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import MapPanel from "./MapPanel";

const trips = [
  {
    id: "goa",
    name: "Goa coastal reset",
    destination: "Goa, India",
    dates: "Jun 12-15",
    days: 3,
    travelers: 2,
    budget: "INR 42k",
    pace: "Balanced",
    status: "Ready",
    score: "92",
    mapQuery: "Goa beaches Panaji India",
    summary: "Beaches, Portuguese lanes, seafood, and one slow morning.",
    chips: ["Beach time", "Old Goa", "Seafood"],
    stats: [
      { label: "Daily spend", value: "INR 14k" },
      { label: "Transit", value: "2h 15m" },
      { label: "Open slots", value: "3" },
    ],
    itinerary: [
      {
        day: "Day 1",
        title: "Arrive, Panjim lanes, Candolim sunset",
        time: "11:20 AM",
        location: "Panjim + Candolim",
        note: "Keep lunch flexible and land at the beach before golden hour.",
      },
      {
        day: "Day 2",
        title: "Old Goa, Fontainhas, seafood trail",
        time: "9:30 AM",
        location: "Old Goa",
        note: "Cluster the heritage stops so the afternoon stays relaxed.",
      },
      {
        day: "Day 3",
        title: "South Goa coves and late checkout",
        time: "8:45 AM",
        location: "Palolem",
        note: "Start early, then leave a clean buffer for airport traffic.",
      },
    ],
    route: ["Dabolim Airport", "Panjim", "Candolim", "Old Goa", "Palolem"],
    stays: [
      { name: "Panjim boutique stay", fit: "Best for food walks", price: "INR 8.8k" },
      { name: "Candolim beach hotel", fit: "Best for sunsets", price: "INR 10.5k" },
    ],
    signals: [
      { label: "Weather", value: "30 C", tone: "teal" },
      { label: "Crowd level", value: "Medium", tone: "amber" },
      { label: "Food match", value: "High", tone: "coral" },
    ],
  },
  {
    id: "kyoto",
    name: "Kyoto slow culture",
    destination: "Kyoto, Japan",
    dates: "Oct 4-9",
    days: 5,
    travelers: 2,
    budget: "USD 2.8k",
    pace: "Slow",
    status: "Draft",
    score: "88",
    mapQuery: "Kyoto Japan temples",
    summary: "Temple mornings, market lunches, tea, ryokan time, and rail buffers.",
    chips: ["Temples", "Tea", "Rail"],
    stats: [
      { label: "Daily spend", value: "USD 560" },
      { label: "Transit", value: "4h 05m" },
      { label: "Open slots", value: "5" },
    ],
    itinerary: [
      {
        day: "Day 1",
        title: "Gion check-in and lantern walk",
        time: "3:10 PM",
        location: "Gion",
        note: "Keep the first evening local after the train transfer.",
      },
      {
        day: "Day 2",
        title: "Arashiyama, river lunch, private tea",
        time: "8:00 AM",
        location: "Arashiyama",
        note: "Move early before the bamboo path gets dense.",
      },
      {
        day: "Day 3",
        title: "Nishiki Market and Higashiyama",
        time: "10:00 AM",
        location: "Nishiki",
        note: "Food first, then a downhill temple walk.",
      },
    ],
    route: ["Kyoto Station", "Gion", "Arashiyama", "Nishiki Market", "Higashiyama"],
    stays: [
      { name: "Gion ryokan base", fit: "Best for walking", price: "USD 390" },
      { name: "Station design hotel", fit: "Best for rail hops", price: "USD 260" },
    ],
    signals: [
      { label: "Weather", value: "21 C", tone: "teal" },
      { label: "Crowd level", value: "High", tone: "coral" },
      { label: "Rail ease", value: "Great", tone: "amber" },
    ],
  },
  {
    id: "iceland",
    name: "Iceland ring sample",
    destination: "Iceland",
    dates: "Aug 18-25",
    days: 7,
    travelers: 4,
    budget: "USD 6.4k",
    pace: "Active",
    status: "Review",
    score: "84",
    mapQuery: "Iceland ring road",
    summary: "Waterfalls, black sand, glacier lagoons, and road weather checks.",
    chips: ["Road trip", "Glaciers", "Hot springs"],
    stats: [
      { label: "Daily spend", value: "USD 914" },
      { label: "Drive time", value: "19h" },
      { label: "Open slots", value: "2" },
    ],
    itinerary: [
      {
        day: "Day 1",
        title: "Reykjavik arrival and Blue Lagoon",
        time: "1:40 PM",
        location: "Reykjavik",
        note: "Use this as the recovery day after the flight.",
      },
      {
        day: "Day 2",
        title: "Golden Circle to Vik",
        time: "8:30 AM",
        location: "Vik",
        note: "Book dinner before arriving because options thin out late.",
      },
      {
        day: "Day 3",
        title: "Black sand beach and glacier lagoon",
        time: "7:45 AM",
        location: "Jokulsarlon",
        note: "Keep the glacier boat slot weather-flexible.",
      },
    ],
    route: ["Keflavik", "Reykjavik", "Vik", "Jokulsarlon", "Akureyri"],
    stays: [
      { name: "Reykjavik harbor hotel", fit: "Best first night", price: "USD 310" },
      { name: "Vik guesthouse", fit: "Best ring road base", price: "USD 280" },
    ],
    signals: [
      { label: "Weather", value: "12 C", tone: "teal" },
      { label: "Road risk", value: "Medium", tone: "amber" },
      { label: "View score", value: "Huge", tone: "coral" },
    ],
  },
];

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const savedTripsKey = "atlas-saved-trips";
const searchHistoryKey = "atlas-search-history";
const clientIdKey = "atlas-client-id";
const chatSessionKey = "atlas-active-chat-session";

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (window.location.port === "5173") {
    return "http://127.0.0.1:5000";
  }

  return window.location.origin;
};

const Home = () => {
  const clientIdRef = useRef(getClientId());
  const [initialSessionState] = useState(() => readChatSessionState());

  const [activeTripId, setActiveTripId] = useState(
    () => initialSessionState.activeTripId ?? "goa",
  );
  const [messagesByTrip, setMessagesByTrip] = useState(() =>
    normalizeMessagesByTrip(initialSessionState.messagesByTrip),
  );
  const [livePlansByTrip, setLivePlansByTrip] = useState(
    () => initialSessionState.livePlansByTrip ?? {},
  );
  const [savedTrips, setSavedTrips] = useState(() =>
    readStoredList(savedTripsKey),
  );
  const [searchHistory, setSearchHistory] = useState(() =>
    readStoredList(searchHistoryKey),
  );
  const [historyIdsByTrip, setHistoryIdsByTrip] = useState(
    () => initialSessionState.historyIdsByTrip ?? {},
  );
  const [agentEvents, setAgentEvents] = useState([]);
  const [tripSettingsByTrip, setTripSettingsByTrip] = useState(
    () => initialSessionState.tripSettingsByTrip ?? {},
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [socketState, setSocketState] = useState({
    status: "connecting",
    provider: "mock",
  });
  const socketRef = useRef(null);
  const activeTripIdRef = useRef(activeTripId);
  const activeRunRef = useRef(null);

  const pushAgentEvent = useCallback((event) => {
    setAgentEvents((current) => [
      { id: createId(), ...event },
      ...current.slice(0, 5),
    ]);
  }, []);

  useEffect(() => {
    activeTripIdRef.current = activeTripId;
  }, [activeTripId]);

  useEffect(() => {
    persistChatSession({
      activeTripId,
      messagesByTrip,
      livePlansByTrip,
      tripSettingsByTrip,
      historyIdsByTrip,
    });
  }, [activeTripId, messagesByTrip, livePlansByTrip, tripSettingsByTrip, historyIdsByTrip]);

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketState((current) => ({
        ...current,
        status: "connected",
      }));
    });

    socket.on("disconnect", () => {
      setSocketState((current) => ({
        ...current,
        status: "offline",
      }));
    });

    socket.on("server:ready", (payload) => {
      setSocketState({
        status: "connected",
        provider: payload.provider ?? "mock",
      });
    });

    socket.on("agent:status", (payload) => {
      pushAgentEvent({
        type: "status",
        label: payload.label,
        detail: payload.detail,
      });
    });

    socket.on("agent:plan", (payload) => {
      pushAgentEvent({
        type: "plan",
        label: "Plan created",
        detail: `${payload.plan?.tools?.length ?? 0} tools selected`,
      });
    });

    socket.on("agent:team", (payload) => {
      pushAgentEvent({
        type: "team",
        label: "Agent team assembled",
        detail: `${payload.agents?.length ?? 0} specialists ready`,
      });
    });

    socket.on("agent:delegate", (payload) => {
      pushAgentEvent({
        type: "delegate",
        label: `${payload.agentName} ${payload.status}`,
        detail: payload.detail ?? "",
      });
    });

    socket.on("agent:memory", (payload) => {
      pushAgentEvent({
        type: "memory",
        label: "Memory updated",
        detail: payload.detail ?? "",
      });
    });

    socket.on("agent:tool", (payload) => {
      pushAgentEvent({
        type: "tool",
        label: `${payload.name} ${payload.status}`,
        detail: payload.reason ?? payload.result?.source ?? "",
      });
    });

    socket.on("agent:chunk", ({ delta }) => {
      const run = activeRunRef.current;

      if (!run) {
        return;
      }

      setMessagesByTrip((current) => ({
        ...current,
        [run.tripId]: (current[run.tripId] ?? []).map((message) =>
          message.id === run.assistantId
            ? {
                ...message,
                text: `${message.text ?? ""}${delta}`,
                isStreaming: true,
              }
            : message,
        ),
      }));
    });

    socket.on("agent:final", (payload) => {
      const run = activeRunRef.current;

      if (!run) {
        return;
      }

      setLivePlansByTrip((current) => ({
        ...current,
        [run.tripId]: payload.structuredPlan,
      }));

      setMessagesByTrip((current) => ({
        ...current,
        [run.tripId]: (current[run.tripId] ?? []).map((message) =>
          message.id === run.assistantId
            ? {
                ...message,
                title: getAssistantTitle(payload.structuredPlan?.intent),
                text: payload.text,
                structuredPlan: payload.structuredPlan,
                toolResults: payload.toolResults,
                isStreaming: false,
              }
            : message,
        ),
      }));

      setSearchHistory((current) =>
        persistList(
          searchHistoryKey,
          current.map((item) =>
            item.id === run.historyItemId
              ? {
                  ...item,
                  destination: payload.structuredPlan?.destination ?? item.destination,
                  intent: payload.structuredPlan?.intent ?? item.intent,
                }
              : item,
          ),
        ),
      );

      setIsStreaming(false);
      pushAgentEvent({
        type: "done",
        label: "Response complete",
        detail: `${payload.provider} / ${payload.model}`,
      });
      activeRunRef.current = null;
    });

    socket.on("agent:error", (payload) => {
      const run = activeRunRef.current;

      if (run) {
        setMessagesByTrip((current) => ({
          ...current,
          [run.tripId]: (current[run.tripId] ?? []).map((message) =>
            message.id === run.assistantId
              ? {
                  ...message,
                  title: "Agent error",
                  text: payload.message,
                  isStreaming: false,
                }
              : message,
          ),
        }));
      }

      setIsStreaming(false);
      pushAgentEvent({
        type: "error",
        label: "Agent error",
        detail: payload.message,
      });
      activeRunRef.current = null;
    });

    return () => {
      socket.disconnect();
    };
  }, [pushAgentEvent]);

  useEffect(() => {
    const clientId = clientIdRef.current;

    fetch(`${getSocketUrl()}/api/saved-trips?clientId=${clientId}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }

        setSavedTrips((current) =>
          persistList(savedTripsKey, mergeStoredItems(current, items.map(fromServerTrip))),
        );
      })
      .catch(() => {});

    fetch(`${getSocketUrl()}/api/search-history?clientId=${clientId}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => {
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }

        setSearchHistory((current) =>
          persistList(searchHistoryKey, mergeStoredItems(current, items.map(fromServerHistory)).slice(0, 30)),
        );
      })
      .catch(() => {});
  }, []);

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId) ?? trips[0],
    [activeTripId],
  );
  const activeTripSettings = useMemo(
    () => tripSettingsByTrip[activeTrip.id] ?? {},
    [activeTrip.id, tripSettingsByTrip],
  );
  const configuredActiveTrip = useMemo(() => {
    const selectedStartDate =
      activeTripSettings.travelStartDate ?? activeTripSettings.travelDate ?? "";
    const selectedEndDate = activeTripSettings.travelEndDate ?? "";
    const selectedDays = selectedStartDate && selectedEndDate
      ? calculateInclusiveDays(selectedStartDate, selectedEndDate)
      : Number(activeTripSettings.days ?? activeTrip.days);

    return {
      ...activeTrip,
      days: selectedDays,
      dates: formatDateRange(selectedStartDate, selectedEndDate, activeTrip.dates),
      selectedDate: selectedStartDate,
      selectedStartDate,
      selectedEndDate,
      travelers: Number(activeTripSettings.travelers ?? activeTrip.travelers),
    };
  }, [activeTrip, activeTripSettings]);

  const messages = messagesByTrip[activeTrip.id] ?? [];
  const livePlan = livePlansByTrip[activeTrip.id];
  const hasActiveConversation = Boolean(livePlan) || messages.length > 0;
  const promptTripContext = useMemo(
    () =>
      livePlan
        ? {
            ...configuredActiveTrip,
            destination: livePlan.destination ?? configuredActiveTrip.destination,
            days: livePlan.days?.length || configuredActiveTrip.days,
            dates: livePlan.dates ?? configuredActiveTrip.dates,
            travelers: livePlan.travelers ?? configuredActiveTrip.travelers,
            budget: livePlan.cost?.formattedTotal ?? configuredActiveTrip.budget,
          }
        : configuredActiveTrip,
    [configuredActiveTrip, livePlan],
  );

  const quickPrompts = useMemo(
    () => {
      if (!livePlan?.destination) {
        return [];
      }

      const promptDestination = promptTripContext.destination;

      return [
        `Make ${promptDestination} more affordable`,
        `Add local food stops`,
        `Reduce transit time`,
        `Find a calmer stay`,
      ];
    },
    [livePlan?.destination, promptTripContext.destination],
  );

  const handleTripSettingsChange = (updates) => {
    setTripSettingsByTrip((current) => ({
      ...current,
      [activeTrip.id]: {
        ...(current[activeTrip.id] ?? {}),
        ...updates,
      },
    }));
  };

  const handleSendMessage = (text, options = {}) => {
    const cleanText = String(text ?? "").trim();

    if (!cleanText || isStreaming) {
      return;
    }

    const runTripContext = options.tripContext ?? promptTripContext;
    const runHistory = options.resetChat
      ? []
      : options.historyMessages ?? messages;
    const historyItemId =
      options.historyItemId ||
      (!options.resetChat ? historyIdsByTrip[runTripContext.id] : "") ||
      createId();
    const assistantId = createId();
    const run = {
      tripId: runTripContext.id,
      assistantId,
      historyItemId,
    };
    activeRunRef.current = run;
    setHistoryIdsByTrip((current) => ({
      ...current,
      [runTripContext.id]: historyItemId,
    }));
    setIsStreaming(true);
    setAgentEvents([]);
    setSearchHistory((current) =>
      persistList(
        searchHistoryKey,
        upsertSearchHistoryItem(current, {
          id: historyItemId,
          message: cleanText,
          destination: "",
          createdAt: new Date().toISOString(),
        }),
      ),
    );

    const assistantReply = {
      id: assistantId,
      role: "assistant",
      title: "Travel AI is planning",
      text: "",
      isStreaming: true,
    };

    setMessagesByTrip((current) => ({
      ...current,
      [runTripContext.id]: [
        ...(options.resetChat ? [] : current[runTripContext.id] ?? []),
        { id: createId(), role: "user", text: cleanText },
        assistantReply,
      ],
    }));

    socketRef.current?.emit("chat:message", {
      message: cleanText,
      history: runHistory.map((messageItem) => ({
        role: messageItem.role,
        content: messageItem.text,
      })),
      tripContext: runTripContext,
      sessionId: runTripContext.id,
      clientId: clientIdRef.current,
      historyItemId,
    });

    if (!socketRef.current?.connected) {
      setIsStreaming(false);
      setMessagesByTrip((current) => ({
        ...current,
        [run.tripId]: (current[run.tripId] ?? []).map((messageItem) =>
          messageItem.id === assistantId
            ? {
                ...messageItem,
                title: "Backend offline",
                text: "Start the backend with npm run dev:server, then try again.",
                isStreaming: false,
              }
            : messageItem,
        ),
      }));
    }
  };

  const handleNewChat = () => {
    setMessagesByTrip((current) => ({
      ...current,
      [configuredActiveTrip.id]: [],
    }));
    setLivePlansByTrip((current) => ({
      ...current,
      [configuredActiveTrip.id]: null,
    }));
    setHistoryIdsByTrip((current) => {
      const next = { ...current };
      delete next[configuredActiveTrip.id];
      return next;
    });
    setAgentEvents([]);
  };

  const handleSaveCurrentTrip = () => {
    const plan = livePlan;
    const destination = plan?.destination ?? configuredActiveTrip.destination;
    const days = plan?.days?.length ?? configuredActiveTrip.days;
    const savedTrip = {
      id: createId(),
      tripId: configuredActiveTrip.id,
      title: `${destination} ${days}-day plan`,
      destination,
      summary: plan?.summary ?? configuredActiveTrip.summary,
      days,
      travelers: plan?.travelers ?? configuredActiveTrip.travelers,
      budget: plan?.cost?.formattedTotal ?? configuredActiveTrip.budget,
      savedAt: new Date().toISOString(),
      structuredPlan: plan ?? null,
    };

    setSavedTrips((current) =>
      persistList(savedTripsKey, [savedTrip, ...current].slice(0, 20)),
    );

    fetch(`${getSocketUrl()}/api/saved-trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clientIdRef.current,
        ...savedTrip,
      }),
    }).catch(() => {});
  };

  const handleSelectSavedTrip = (savedTrip) => {
    const targetTripId = savedTrip.tripId ?? configuredActiveTrip.id;
    setActiveTripId(targetTripId);

    if (savedTrip.structuredPlan) {
      setLivePlansByTrip((current) => ({
        ...current,
        [targetTripId]: savedTrip.structuredPlan,
      }));
      setMessagesByTrip((current) => ({
        ...current,
        [targetTripId]: [
          {
            id: createId(),
            role: "assistant",
            title: getAssistantTitle(savedTrip.structuredPlan.intent),
            text: savedTrip.summary || savedTrip.structuredPlan.summary || savedTrip.title,
            structuredPlan: savedTrip.structuredPlan,
            isStreaming: false,
          },
        ],
      }));
    } else {
      setMessagesByTrip((current) => ({
        ...current,
        [targetTripId]: [
          {
            id: createId(),
            role: "assistant",
            title: "Saved chat",
            text: savedTrip.summary || savedTrip.title,
            isStreaming: false,
          },
        ],
      }));
    }
  };

  const handleDeleteSavedTrip = (savedTrip) => {
    setSavedTrips((current) =>
      persistList(
        savedTripsKey,
        current.filter((trip) => trip.id !== savedTrip.id),
      ),
    );

    fetch(
      `${getSocketUrl()}/api/saved-trips/${encodeURIComponent(savedTrip.id)}?clientId=${encodeURIComponent(clientIdRef.current)}`,
      { method: "DELETE" },
    ).catch(() => {});
  };

  const handleDeleteHistory = (historyItem) => {
    setSearchHistory((current) =>
      persistList(
        searchHistoryKey,
        current.filter((item) => item.id !== historyItem.id),
      ),
    );
    setHistoryIdsByTrip((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, id]) => id !== historyItem.id),
      ),
    );

    fetch(
      `${getSocketUrl()}/api/search-history/${encodeURIComponent(historyItem.id)}?clientId=${encodeURIComponent(clientIdRef.current)}`,
      { method: "DELETE" },
    ).catch(() => {});
  };

  const closeMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const closeMobilePreview = () => {
    setIsPreviewOpen(false);
  };

  const handleDrawerNewChat = () => {
    handleNewChat();
    closeMobileSidebar();
  };

  const handleDrawerSelectSavedTrip = (savedTrip) => {
    handleSelectSavedTrip(savedTrip);
    closeMobileSidebar();
  };

  const handleDrawerDeleteSavedTrip = (savedTrip) => {
    handleDeleteSavedTrip(savedTrip);
  };

  const handleDrawerSelectHistory = (item) => {
    handleSelectHistory(item);
    closeMobileSidebar();
  };

  const handleDrawerDeleteHistory = (item) => {
    handleDeleteHistory(item);
  };

  const handleSelectHistory = (item) => {
    const historyItem =
      typeof item === "string" ? { message: item, destination: "" } : item;
    const destination = historyItem.destination || "";
    const historyTripContext = {
      ...configuredActiveTrip,
      destination,
      name: destination,
    };

    setActiveTripId(historyTripContext.id);
    setLivePlansByTrip((current) => ({
      ...current,
      [historyTripContext.id]: null,
    }));
    handleSendMessage(historyItem.message, {
      tripContext: historyTripContext,
      historyMessages: [],
      historyItemId: historyItem.id,
      resetChat: true,
    });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#edf3f1] text-slate-950 lg:h-screen lg:overflow-hidden">
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isSidebarOpen ? "" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close saved chats"
          onClick={closeMobileSidebar}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity ${
            isSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute left-0 top-0 h-full w-[min(92vw,420px)] transition-transform duration-200 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            drawer
            savedTrips={savedTrips}
            searchHistory={searchHistory}
            onNewChat={handleDrawerNewChat}
            onDeleteSavedTrip={handleDrawerDeleteSavedTrip}
            onDeleteHistory={handleDrawerDeleteHistory}
            onSelectSavedTrip={handleDrawerSelectSavedTrip}
            onSelectHistory={handleDrawerSelectHistory}
          />
        </div>
      </div>
      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          isPreviewOpen ? "" : "pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close trip preview"
          onClick={closeMobilePreview}
          className={`absolute inset-0 bg-slate-950/45 transition-opacity ${
            isPreviewOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute right-0 top-0 h-full w-[min(94vw,430px)] transition-transform duration-200 ${
            isPreviewOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <MapPanel
            drawer
            activeTrip={configuredActiveTrip}
            livePlan={livePlan}
            agentEvents={agentEvents}
            hasActiveConversation={hasActiveConversation}
          />
        </div>
      </div>
      <main className="mx-auto grid h-[100dvh] min-h-0 w-full max-w-[1440px] grid-cols-1 items-stretch gap-2 overflow-hidden p-0 sm:p-2 lg:h-screen lg:grid-cols-[260px_minmax(0,620px)_minmax(280px,1fr)] xl:grid-cols-[280px_minmax(0,660px)_minmax(320px,1fr)] 2xl:grid-cols-[300px_minmax(0,700px)_minmax(340px,1fr)]">
        <div className="hidden lg:order-1 lg:block">
          <Sidebar
            savedTrips={savedTrips}
            searchHistory={searchHistory}
            onNewChat={handleNewChat}
            onDeleteSavedTrip={handleDeleteSavedTrip}
            onDeleteHistory={handleDeleteHistory}
            onSelectSavedTrip={handleSelectSavedTrip}
            onSelectHistory={handleSelectHistory}
          />
        </div>
        <div className="order-2 min-w-0 lg:order-2">
          <ChatWindow
            activeTrip={configuredActiveTrip}
            livePlan={livePlan}
            hasActiveConversation={hasActiveConversation}
            messages={messages}
            quickPrompts={quickPrompts}
            connectionStatus={socketState}
            isStreaming={isStreaming}
            onTripSettingsChange={handleTripSettingsChange}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onOpenPreview={() => setIsPreviewOpen(true)}
            onSaveTrip={handleSaveCurrentTrip}
            onPromptSelect={handleSendMessage}
            onSendMessage={handleSendMessage}
          />
        </div>
        <div className="order-3 hidden min-w-0 lg:block">
          <MapPanel
            activeTrip={configuredActiveTrip}
            livePlan={livePlan}
            agentEvents={agentEvents}
            hasActiveConversation={hasActiveConversation}
          />
        </div>
      </main>
    </div>
  );
};

function formatDateForTrip(value) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startValue, endValue, fallback) {
  if (!startValue) {
    return fallback;
  }

  if (!endValue) {
    return `${formatDateForTrip(startValue)} - choose end date`;
  }

  return `${formatDateForTrip(startValue)} - ${formatDateForTrip(endValue)}`;
}

function calculateInclusiveDays(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  return Math.max(Math.round((end - start) / 86400000) + 1, 1);
}

function readStoredList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function persistList(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
  return items;
}

function upsertSearchHistoryItem(items, nextItem) {
  const existing = items.find((item) => item.id === nextItem.id);
  const updated = {
    ...existing,
    ...nextItem,
    createdAt: existing?.createdAt ?? nextItem.createdAt,
  };

  return [
    updated,
    ...items.filter((item) => item.id !== nextItem.id),
  ].slice(0, 30);
}

function readChatSessionState() {
  try {
    return JSON.parse(sessionStorage.getItem(chatSessionKey) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function persistChatSession(state) {
  try {
    sessionStorage.setItem(chatSessionKey, JSON.stringify(state));
  } catch {
    // Session persistence is a convenience; the app can still run without it.
  }
}

function normalizeMessagesByTrip(value) {
  const base = Object.fromEntries(trips.map((trip) => [trip.id, []]));

  if (!value || typeof value !== "object") {
    return base;
  }

  return Object.fromEntries(
    Object.entries({
      ...base,
      ...value,
    }).map(([tripId, messages]) => [
      tripId,
      Array.isArray(messages)
        ? messages.map((message) => ({
            ...message,
            isStreaming: false,
          }))
        : [],
    ]),
  );
}

function getClientId() {
  const existing = localStorage.getItem(clientIdKey);

  if (existing) {
    return existing;
  }

  const clientId = createId();
  localStorage.setItem(clientIdKey, clientId);
  return clientId;
}

function mergeStoredItems(current, incoming) {
  const seen = new Set();

  return [...incoming, ...current].filter((item) => {
    const key = item.id ?? `${item.message}-${item.createdAt}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function fromServerTrip(item) {
  return {
    id: item._id ?? item.id ?? createId(),
    tripId: item.tripId,
    title: item.title ?? `${item.destination} plan`,
    destination: item.destination ?? "",
    summary: item.summary ?? "",
    days: item.days ?? item.structuredPlan?.days?.length ?? 0,
    travelers: item.travelers ?? item.structuredPlan?.travelers ?? 1,
    budget: item.budget ?? item.structuredPlan?.cost?.formattedTotal ?? "",
    savedAt: item.createdAt ?? item.savedAt ?? new Date().toISOString(),
    structuredPlan: item.structuredPlan ?? null,
  };
}

function fromServerHistory(item) {
  return {
    id: item.clientItemId ?? item._id ?? item.id ?? createId(),
    message: item.message ?? "",
    destination: item.destination ?? "",
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
}

function getAssistantTitle(intent) {
  const titles = {
    food_info: "Food guide ready",
    weather_info: "Weather answer ready",
    places_info: "Places answer ready",
    place_info: "Place guide ready",
    seasonal_info: "Seasonal guide ready",
    budget_info: "Budget answer ready",
    travel_advice: "Travel advice ready",
  };

  return titles[intent] ?? "Trip plan streamed";
}

export default Home;
