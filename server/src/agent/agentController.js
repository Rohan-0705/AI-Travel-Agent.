import { MASTER_PROMPT, PLANNING_PROMPT } from "./masterPrompt.js";
import {
  buildBookingHandoff,
  runSpecialistAgents,
} from "./multiAgentOrchestrator.js";
import { getProvider } from "./providers.js";
import { extractTripDetails, normalizePlan } from "./tripParser.js";
import { getTravelMemory, updateTravelMemory } from "../db.js";
import { resolveTravelDestination } from "../tools/destinationResolver.js";
import { toolDefinitions } from "../tools/index.js";

const noop = () => {};
const directAnswerIntents = new Set([
  "food_info",
  "weather_info",
  "places_info",
  "place_info",
  "seasonal_info",
  "budget_info",
  "travel_advice",
]);

export async function runTravelAgent({
  message,
  history = [],
  tripContext = {},
  sessionId = "demo-session",
  clientId = "default",
  emit = noop,
}) {
  const cleanMessage = String(message ?? "").trim();

  if (!cleanMessage) {
    throw new Error("Message is required.");
  }

  const provider = getProvider();
  const memory = await getTravelMemory(clientId);

  emit("agent:status", {
    label: "Understanding intent",
    detail: "Reading destination, dates, budget, travelers, and tool needs.",
  });

  emit("agent:memory", {
    memory,
    detail: memory.lastDestination
      ? `Using memory from ${memory.lastDestination}.`
      : "Starting with a fresh travel memory.",
  });

  const plan = await createExecutionPlan({
    provider,
    message: cleanMessage,
    history,
    tripContext: {
      ...tripContext,
      memory,
    },
  });

  emit("agent:plan", {
    sessionId,
    plan,
    provider: provider.name,
    model: provider.model,
  });

  const { agentTeam, toolResults } = await runSpecialistAgents({
    plan,
    memory,
    emit,
  });

  emit("agent:status", {
    label: directAnswerIntents.has(plan.intent)
      ? "Composing travel answer"
      : "Composing itinerary",
    detail: directAnswerIntents.has(plan.intent)
      ? "Turning the selected tool results into a direct travel answer."
      : "Combining tool outputs into a day-wise travel plan.",
  });

  const structuredPlan = buildStructuredPlan(plan, toolResults, {
    agentTeam,
    memory,
  });
  const synthesisPrompt = buildSynthesisPrompt({
    message: cleanMessage,
    plan,
    toolResults,
    structuredPlan,
  });

  let text;

  if (directAnswerIntents.has(plan.intent)) {
    text = fallbackText(structuredPlan, "");

    for (const delta of text.match(/.{1,32}(\s|$)/g) ?? [text]) {
      emit("agent:chunk", { delta });
    }
  } else {
    try {
      text = await provider.streamText({
        system: MASTER_PROMPT,
        user: synthesisPrompt,
        onToken: (delta) => emit("agent:chunk", { delta }),
      });
    } catch (error) {
      text = fallbackText(structuredPlan, getFriendlyErrorMessage(error));

      for (const delta of text.match(/.{1,32}(\s|$)/g) ?? [text]) {
        emit("agent:chunk", { delta });
      }
    }
  }

  const updatedMemory = await updateTravelMemory({
    clientId,
    message: cleanMessage,
    structuredPlan,
  });
  structuredPlan.memory = publicMemory(updatedMemory);

  emit("agent:memory", {
    memory: updatedMemory,
    detail: "Travel memory updated from this request.",
  });

  emit("agent:final", {
    text,
    structuredPlan,
    toolResults,
    agentTeam,
    memory: updatedMemory,
    provider: provider.name,
    model: provider.model,
  });

  return {
    text,
    structuredPlan,
    toolResults,
    agentTeam,
    memory: updatedMemory,
    provider: provider.name,
    model: provider.model,
  };
}

async function createExecutionPlan({ provider, message, history, tripContext }) {
  const heuristic = extractTripDetails(message, tripContext);
  let plan;

  if (heuristic.intent !== "trip_plan") {
    plan = normalizePlan(null, heuristic);
  } else {
    try {
      const planned = await provider.generateJson({
        system: `${MASTER_PROMPT}\n\n${PLANNING_PROMPT}`,
        user: JSON.stringify({
          userRequest: message,
          recentHistory: history.slice(-6),
          tripContext,
          availableTools: toolDefinitions,
        }),
      });

      plan = normalizePlan(planned, heuristic);
    } catch {
      plan = normalizePlan(null, heuristic);
    }
  }

  return resolveExecutionPlanDestination(plan);
}

async function resolveExecutionPlanDestination(plan) {
  const placeResolution = plan.place
    ? await resolveTravelDestination(plan.place).catch(() => null)
    : null;
  const destinationResolution = await resolveTravelDestination(plan.destination).catch(() => null);
  const placeLocality = inferPlaceLocality(placeResolution, plan.place);
  const shouldUsePlaceLocality =
    (plan.intent === "place_info" || plan.intent === "seasonal_info") &&
    placeResolution?.confidence >= 55 &&
    placeLocality;
  const resolvedDestination = shouldUsePlaceLocality
    ? placeLocality
    : destinationResolution?.confidence >= 45
      ? destinationResolution.name
      : plan.destination;
  const resolvedPlace = placeResolution?.confidence >= 55
    ? placeResolution.name
    : plan.place;
  const destinationResolutionPayload = shouldUsePlaceLocality
    ? placeResolution
    : destinationResolution;
  const resolvedPlan = {
    ...plan,
    destination: resolvedDestination,
    place: resolvedPlace,
    destinationResolution: destinationResolutionPayload
      ? {
          name: destinationResolutionPayload.name,
          locality: shouldUsePlaceLocality ? placeLocality : destinationResolutionPayload.locality,
          state: destinationResolutionPayload.state,
          confidence: destinationResolutionPayload.confidence,
          source: destinationResolutionPayload.source,
        }
      : null,
  };

  resolvedPlan.tools = plan.tools.map((toolCall) => ({
    ...toolCall,
    args: {
      ...toolCall.args,
      city: toolUsesDestinationCity(toolCall.name)
        ? resolvedPlan.destination
        : toolCall.args?.city,
      place: toolCall.name === "getPlaceInsight"
        ? resolvedPlan.place
        : toolCall.args?.place,
    },
  }));

  return resolvedPlan;
}

function inferPlaceLocality(placeResolution, place = "") {
  const candidates = [
    placeResolution?.locality,
    placeResolution?.name,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const parts = String(candidate)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const placeIndex = parts.findIndex((part) => sameNormalizedPlace(part, place));
    const nextPart = placeIndex >= 0 ? parts[placeIndex + 1] : "";
    const locality = nextPart || (parts.length > 1 ? parts[parts.length - 1] : "");

    if (locality && !sameNormalizedPlace(locality, place) && !/^india$/i.test(locality)) {
      return locality;
    }
  }

  const locality = placeResolution?.locality;

  return locality && !sameNormalizedPlace(locality, place) ? locality : "";
}

function toolUsesDestinationCity(toolName) {
  return [
    "getWeather",
    "getPlaces",
    "estimateCost",
    "getFoodGuide",
    "getTravelGuide",
    "getPlaceInsight",
  ].includes(toolName);
}

function sameNormalizedPlace(a, b) {
  const normalizedA = String(a ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedB = String(b ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  return normalizedA && normalizedB && (
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  );
}

function buildStructuredPlan(plan, toolResults, { agentTeam = [], memory = {} } = {}) {
  if (plan.intent === "food_info") {
    return withAgentMetadata(buildFoodGuideResponse(plan, toolResults), {
      agentTeam,
      memory,
    });
  }

  if (plan.intent !== "trip_plan") {
    return withAgentMetadata(buildDirectTravelResponse(plan, toolResults), {
      agentTeam,
      memory,
    });
  }

  const weather = findToolResult(toolResults, "getWeather");
  const places = findToolResult(toolResults, "getPlaces");
  const cost = findToolResult(toolResults, "estimateCost");
  const flights = findToolResult(toolResults, "searchFlights");
  const destination = plan.destination || "Destination";
  const daysCount = Math.max(1, Number(plan.days) || 3);
  const placeList = places?.places?.length ? places.places : fallbackPlaces(destination);
  const dayGroups = buildDayPlaceGroups({
    destination,
    placeList,
    daysCount,
    interests: plan.interests,
  });

  const days = dayGroups.map((dayGroup, index) => {
    const dayPlaces = dayGroup.places;
    const title =
      dayGroup.title ||
      (index === 0
        ? `Arrive and settle into ${destination}`
        : index === daysCount - 1
          ? `Slow final day in ${destination}`
          : `Explore ${dayPlaces[0]?.name ?? destination}`);

    return {
      day: `Day ${index + 1}`,
      title,
      description:
        dayPlaces.length > 0
          ? buildDayDescription({ index, daysCount, dayPlaces })
          : "Keep this day flexible and use it for local food, markets, and recovery time.",
      places: dayPlaces,
      schedule: buildDaySchedule({ index, daysCount, dayPlaces, destination }),
    };
  });

  const structuredPlan = {
    intent: "trip_plan",
    destination,
    origin: plan.origin ?? "",
    days,
    dates: plan.dates,
    travelers: plan.travelers,
    summary: `${daysCount}-day ${plan.budgetStyle} trip for ${plan.travelers} traveler${plan.travelers === 1 ? "" : "s"}.`,
    weather,
    places: placeList,
    cost,
    flights,
    tips: [
      "Keep the first day lighter than the middle days.",
      "Group nearby places to save transit time.",
      "Recheck live weather and prices before booking.",
    ],
  };

  return withAgentMetadata(
    {
      ...structuredPlan,
      booking: buildBookingHandoff(structuredPlan),
    },
    {
      agentTeam,
      memory,
    },
  );
}

function buildDayPlaceGroups({ destination, placeList, daysCount, interests = [] }) {
  const normalizedDestination = normalizeText(destination);
  const coveredPlaces = ensurePlaceCoverage({
    destination,
    placeList,
    daysCount,
  });
  const seasonKey = getSeasonKey(interests);
  const templateKey = Object.keys(destinationDayTemplates).find((key) =>
    normalizedDestination.includes(key),
  );
  const seasonalTemplates = templateKey && seasonKey
    ? destinationSeasonalDayTemplates[templateKey]?.[seasonKey]
    : null;

  if (seasonalTemplates?.length) {
    return buildTemplatedDayGroups({
      templates: seasonalTemplates,
      placeList: coveredPlaces,
      daysCount,
    });
  }

  if (templateKey) {
    return buildTemplatedDayGroups({
      templates: destinationDayTemplates[templateKey],
      placeList: coveredPlaces,
      daysCount,
    });
  }

  const perDay = daysCount <= 3 && coveredPlaces.length >= daysCount * 3 ? 3 : 2;
  const groups = [];
  let cursor = 0;

  for (let index = 0; index < daysCount; index += 1) {
    const places = coveredPlaces.slice(cursor, cursor + perDay);
    cursor += perDay;

    if (!places.length && coveredPlaces.length) {
      places.push(coveredPlaces[index % coveredPlaces.length]);
    }

    groups.push({ places });
  }

  return groups;
}

function getSeasonKey(interests = []) {
  const interestText = interests.map(String).join(" ").toLowerCase();

  if (/\b(monsoon|mansoon|rainy|water\s*falls?|waterfalls?)\b/.test(interestText)) {
    return "monsoon";
  }

  if (/\b(winter|hill station|hill stations|hills)\b/.test(interestText)) {
    return "winter";
  }

  return "";
}

function ensurePlaceCoverage({ destination, placeList, daysCount }) {
  const minimumPlaces = Math.max(daysCount * 2, daysCount);
  const seen = new Set();
  const fallback = placeList.length ? [] : fallbackPlaces(destination);
  const merged = [...placeList, ...fallback].filter((place) => {
    const normalized = normalizeText(place.name);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });

  if (merged.length >= minimumPlaces || !merged.length) {
    return merged;
  }

  return [
    ...merged,
    ...Array.from({ length: minimumPlaces - merged.length }, (_item, index) => ({
      name: `${destination} flexible food or rest block ${index + 1}`,
      type: "flexible block",
    })),
  ];
}

function buildTemplatedDayGroups({ templates, placeList, daysCount }) {
  const placesByName = new Map(
    placeList.map((place) => [normalizeText(place.name), place]),
  );
  const used = new Set();
  const fallbackQueue = [...placeList];

  return Array.from({ length: daysCount }, (_item, index) => {
    const template = templates[index % templates.length];
    const places = template.placeNames
      .map((name) => {
        const normalized = normalizeText(name);
        const livePlace = placesByName.get(normalized);

        used.add(normalized);
        return livePlace ?? { name, type: template.type ?? "highlight" };
      })
      .filter(Boolean);

    while (places.length < 3 && fallbackQueue.length) {
      const candidate = fallbackQueue.shift();
      const normalized = normalizeText(candidate.name);

      if (!used.has(normalized)) {
        used.add(normalized);
        places.push(candidate);
      }
    }

    return {
      title: template.title,
      places: places.slice(0, 3),
    };
  });
}

const destinationDayTemplates = {
  goa: [
    {
      title: "Old Goa and Panjim heritage",
      placeNames: [
        "Basilica of Bom Jesus",
        "Se Cathedral",
        "Fontainhas Latin Quarter",
      ],
    },
    {
      title: "North Goa beaches and forts",
      placeNames: ["Fort Aguada", "Calangute Beach", "Baga Beach"],
    },
    {
      title: "South Goa and nature",
      placeNames: ["Dudhsagar Falls", "Colva Beach", "Palolem Beach"],
    },
    {
      title: "Markets, sunsets, and cafes",
      placeNames: ["Anjuna Flea Market", "Chapora Fort", "Dona Paula View Point"],
    },
  ],
  karad: [
    {
      title: "Pritisangam and Karad riverfront",
      placeNames: [
        "Pritisangam",
        "Yashwantrao Chavan Samadhi",
        "Krishnamai Temple",
      ],
    },
    {
      title: "Caves, forts, and hill views",
      placeNames: ["Agashiv Caves", "Sadashivgad Fort", "Vasantgad Fort"],
    },
    {
      title: "Chaphal, Koyna side, and local markets",
      placeNames: ["Chaphal Ram Mandir", "Koyna Dam", "Karad local market"],
    },
    {
      title: "Slow Karad food and ghats",
      placeNames: ["Krishna Ghat", "Pritisangam", "Karad local market"],
    },
  ],
  satara: [
    {
      title: "Satara city heritage and fort views",
      placeNames: ["Ajinkyatara Fort", "Natraj Mandir", "Baramotichi Vihir"],
    },
    {
      title: "Kaas Plateau and waterfall day",
      placeNames: ["Kaas Plateau", "Thoseghar Waterfalls", "Chalkewadi Windmill Farms"],
    },
    {
      title: "Sajjangad, Koyna side, and local market",
      placeNames: ["Sajjangad Fort", "Shivsagar Lake and Koyna backwaters", "Satara local market"],
    },
    {
      title: "Temples and relaxed Satara close",
      placeNames: ["Yamai Devi Temple, Aundh", "Natraj Mandir", "Satara local market"],
    },
  ],
  pune: [
    {
      title: "Old Pune heritage and temple walk",
      placeNames: ["Shaniwar Wada", "Dagdusheth Halwai Ganpati Temple", "Lal Mahal"],
    },
    {
      title: "Palace, museum, and cave temple day",
      placeNames: ["Aga Khan Palace", "Raja Dinkar Kelkar Museum", "Pataleshwar Cave Temple"],
    },
    {
      title: "Fort views, gardens, and local food",
      placeNames: ["Sinhagad Fort", "Parvati Hill", "FC Road food street"],
    },
    {
      title: "Markets, gardens, and cafes",
      placeNames: ["Tulshibaug Market", "Pune Okayama Friendship Garden", "Koregaon Park cafe walk"],
    },
  ],
};

const destinationSeasonalDayTemplates = {
  karad: {
    monsoon: [
      {
        title: "Monsoon riverside and greenery",
        placeNames: ["Pritisangam", "Koyna Dam", "Krishna Ghat"],
      },
      {
        title: "Waterfall and Koyna-side day",
        placeNames: ["Thoseghar Falls", "Koyna Dam", "Karad local market"],
      },
      {
        title: "Safe heritage and food backup",
        placeNames: ["Krishnamai Temple", "Yashwantrao Chavan Samadhi", "Karad local market"],
      },
    ],
    winter: [
      {
        title: "Forts, caves, and hill views",
        placeNames: ["Agashiv Caves", "Sadashivgad Fort", "Vasantgad Fort"],
      },
      {
        title: "Hill-station extension day",
        placeNames: ["Mahabaleshwar / Panchgani hill station extension", "Chaphal Ram Mandir", "Koyna Dam"],
      },
      {
        title: "Pritisangam and relaxed city close",
        placeNames: ["Pritisangam", "Krishna Ghat", "Karad local market"],
      },
    ],
  },
  satara: {
    monsoon: [
      {
        title: "Waterfalls and green valleys",
        placeNames: ["Thoseghar Waterfalls", "Chalkewadi Windmill Farms", "Kaas Plateau"],
      },
      {
        title: "Koyna backwaters and scenic drive",
        placeNames: ["Shivsagar Lake and Koyna backwaters", "Sajjangad Fort", "Satara local market"],
      },
      {
        title: "Safe city heritage backup",
        placeNames: ["Ajinkyatara Fort", "Natraj Mandir", "Baramotichi Vihir"],
      },
    ],
    winter: [
      {
        title: "Forts and city views",
        placeNames: ["Ajinkyatara Fort", "Sajjangad Fort", "Natraj Mandir"],
      },
      {
        title: "Kaas and Chalkewadi viewpoints",
        placeNames: ["Kaas Plateau", "Chalkewadi Windmill Farms", "Thoseghar Waterfalls"],
      },
      {
        title: "Heritage wells and market close",
        placeNames: ["Baramotichi Vihir", "Yamai Devi Temple, Aundh", "Satara local market"],
      },
    ],
  },
  pune: {
    monsoon: [
      {
        title: "Green fort and city heritage",
        placeNames: ["Sinhagad Fort", "Shaniwar Wada", "Dagdusheth Halwai Ganpati Temple"],
      },
      {
        title: "Dam and hill-station extension",
        placeNames: ["Mulshi Dam", "Panshet Dam", "Lonavala / Khandala hill-station extension"],
      },
      {
        title: "Rain-safe museums and food",
        placeNames: ["Aga Khan Palace", "Raja Dinkar Kelkar Museum", "FC Road food street"],
      },
    ],
    winter: [
      {
        title: "Forts and viewpoints",
        placeNames: ["Sinhagad Fort", "Parvati Hill", "Vetal Tekdi"],
      },
      {
        title: "Old Pune heritage",
        placeNames: ["Shaniwar Wada", "Dagdusheth Halwai Ganpati Temple", "Lal Mahal"],
      },
      {
        title: "Museums, gardens, and cafes",
        placeNames: ["Aga Khan Palace", "Pune Okayama Friendship Garden", "Koregaon Park cafe walk"],
      },
    ],
  },
  goa: {
    monsoon: [
      {
        title: "Waterfalls and green Goa",
        placeNames: ["Dudhsagar Falls", "Fontainhas Latin Quarter", "Old Goa churches"],
      },
    ],
    winter: [
      {
        title: "Winter beaches and forts",
        placeNames: ["Fort Aguada", "Calangute Beach", "Anjuna Flea Market"],
      },
    ],
  },
};

function buildDayDescription({ index, daysCount, dayPlaces }) {
  const names = dayPlaces.map((place) => place.name);

  if (index === 0) {
    return `Start with ${names.slice(0, 2).join(" and ")}, then use ${names[2] ?? "a nearby local stop"} as an easy evening area so arrival day stays relaxed.`;
  }

  if (index === daysCount - 1) {
    return `Keep the final day lighter around ${names.join(" and ")} with time for shopping, food, and departure buffer.`;
  }

  return `Use this as the main sightseeing day for ${names.join(" and ")}. Start early, keep lunch nearby, and leave enough travel buffer between stops.`;
}

function buildDaySchedule({ index, daysCount, dayPlaces, destination }) {
  if (!dayPlaces.length) {
    return [
      {
        time: "Morning",
        activity: `Slow breakfast and choose one nearby ${destination} neighborhood to explore.`,
      },
      {
        time: "Afternoon",
        activity: "Keep this block flexible for rest, shopping, or a food stop.",
      },
      {
        time: "Evening",
        activity: "Take an easy local walk and prepare for the next travel leg.",
      },
    ];
  }

  const [primary, secondary, tertiary] = dayPlaces;
  const isFirstDay = index === 0;
  const isLastDay = index === daysCount - 1;

  if (isFirstDay) {
    return [
      {
        time: "Morning",
        activity: "Arrive, check in, freshen up, and keep luggage handling unhurried.",
      },
      {
        time: "Afternoon",
        activity: `Visit ${primary.name}${secondary ? ` and continue to ${secondary.name}` : ""}.`,
      },
      {
        time: "Evening",
        activity: tertiary
          ? `Walk through ${tertiary.name}, then try a local dinner nearby.`
          : `Try a local dinner in ${destination} and keep the night light.`,
      },
    ];
  }

  if (isLastDay) {
    return [
      {
        time: "Morning",
        activity: `Start early with ${primary.name}.`,
      },
      {
        time: "Afternoon",
        activity: secondary
          ? `Visit ${secondary.name}, then keep time for lunch or shopping.`
          : "Keep time for lunch, shopping, and packing.",
      },
      {
        time: "Evening",
        activity: tertiary
          ? `Use ${tertiary.name} only if timing is comfortable, then keep a departure buffer.`
          : "Keep a departure buffer and avoid adding far-away stops late in the day.",
      },
    ];
  }

  return [
    {
      time: "Morning",
      activity: `Begin with ${primary.name} before the day gets crowded or hot.`,
    },
    {
      time: "Afternoon",
      activity: secondary
        ? `Move to ${secondary.name} after lunch and group nearby stops together.`
        : "Use the afternoon for a nearby market, museum, or cafe.",
    },
    {
      time: "Evening",
      activity: tertiary
        ? `End with ${tertiary.name} or nearby dinner, depending on energy.`
        : `Return toward central ${destination} for dinner and a calmer evening.`,
    },
  ];
}

function buildFoodGuideResponse(plan, toolResults) {
  const foodGuide = findToolResult(toolResults, "getFoodGuide");
  const destination = plan.destination || foodGuide?.city || "this city";
  const places = (foodGuide?.areas ?? []).map((area) => ({
    name: area,
    type: "food area",
  }));

  return {
    intent: "food_info",
    destination,
    origin: "",
    days: [],
    dates: plan.dates,
    travelers: plan.travelers,
    summary: `${destination} food guide`,
    weather: null,
    places,
    cost: null,
    flights: null,
    foodGuide,
    tips: foodGuide?.tips ?? [],
  };
}

function withAgentMetadata(structuredPlan, { agentTeam, memory }) {
  return {
    ...structuredPlan,
    agentTeam,
    memory: publicMemory(memory),
  };
}

function publicMemory(memory = {}) {
  return {
    lastDestination: memory?.lastDestination ?? "",
    budgetStyle: memory?.budgetStyle ?? "",
    travelers: memory?.travelers ?? 0,
    interests: memory?.interests ?? [],
    foodPreferences: memory?.foodPreferences ?? [],
    preferredPace: memory?.preferredPace ?? "",
  };
}

function buildDirectTravelResponse(plan, toolResults) {
  const weather = findToolResult(toolResults, "getWeather");
  const places = findToolResult(toolResults, "getPlaces");
  const cost = findToolResult(toolResults, "estimateCost");
  const travelGuide = findToolResult(toolResults, "getTravelGuide");
  const placeInsight = findToolResult(toolResults, "getPlaceInsight");
  const destination = placeInsight?.city || plan.destination || "your destination";
  const answer = buildTravelAnswer({ plan, weather, places, cost, travelGuide, placeInsight });

  return {
    intent: plan.intent,
    topic: plan.topic ?? "general",
    destination,
    origin: plan.origin ?? "",
    days: [],
    dates: plan.dates,
    travelers: plan.travelers,
    summary: answer.title,
    weather,
    places: placeInsight?.recommendations?.length
      ? placeInsight.recommendations.map((name) => ({ name, type: "recommendation" }))
      : places?.places ?? [],
    cost,
    flights: null,
    travelGuide,
    placeInsight,
    travelAnswer: answer,
    tips: answer.bullets,
  };
}

function buildTravelAnswer({ plan, weather, places, cost, travelGuide, placeInsight }) {
  const destination = plan.destination || "your destination";

  if (plan.intent === "place_info" || plan.intent === "seasonal_info") {
    return {
      label: plan.intent === "seasonal_info" ? "Seasonal guide" : "Place guide",
      title: placeInsight?.label ?? `${destination} place guidance`,
      summary: placeInsight?.summary ?? `Here is practical place guidance for ${destination}.`,
      bullets: [
        ...(placeInsight?.bestFor?.length
          ? [`Best for: ${placeInsight.bestFor.slice(0, 4).join(", ")}.`]
          : []),
        ...(placeInsight?.tips ?? []).slice(0, 3),
      ],
      items: (placeInsight?.recommendations ?? []).slice(0, 6).map((item) => ({
        label: item,
        value: placeInsight.season
          ? `Good ${placeInsight.season} option`
          : "Worth checking for this route",
      })),
    };
  }

  if (plan.intent === "weather_info") {
    const samples = weather?.samples ?? [];
    const temps = samples.map((sample) => sample.tempC).filter(Number.isFinite);
    const range = temps.length
      ? `${Math.min(...temps)}-${Math.max(...temps)} C`
      : "weather checked";
    const conditions = [...new Set(samples.map((sample) => sample.condition).filter(Boolean))].slice(0, 3);

    return {
      label: "Weather",
      title: `${destination} weather guidance`,
      summary: weather?.summary ?? `${destination} weather has been checked for travel planning.`,
      bullets: [
        `Expected range: ${range}.`,
        conditions.length ? `Likely conditions: ${conditions.join(", ")}.` : "Use this as a planning check, then recheck before leaving.",
        travelGuide?.advice?.[0] ?? "Pack comfortable clothes and keep a small buffer for weather changes.",
      ],
      items: samples.slice(0, 4).map((sample) => ({
        label: sample.time,
        value: `${sample.tempC} C, ${sample.condition}`,
      })),
    };
  }

  if (plan.intent === "places_info") {
    const topPlaces = places?.places?.slice(0, 6) ?? [];

    return {
      label: "Places",
      title: `${destination} places to consider`,
      summary: topPlaces.length
        ? `These are the strongest places found for ${destination}.`
        : `I could not find live places for ${destination}, so keep this as a general sightseeing prompt.`,
      bullets: topPlaces.slice(0, 3).map((place) =>
        `${place.name}${place.type ? ` (${place.type})` : ""}`,
      ),
      items: topPlaces.map((place) => ({
        label: place.name,
        value: [place.type, place.rating ? `${place.rating}/5` : ""].filter(Boolean).join(" - "),
      })),
    };
  }

  if (plan.intent === "budget_info") {
    const breakdown = cost?.breakdown
      ? Object.entries(cost.breakdown).map(([key, value]) => ({
          label: formatLabel(key),
          value: `INR ${Intl.NumberFormat("en-IN").format(value)}`,
        }))
      : [];

    return {
      label: "Budget",
      title: `${destination} budget guidance`,
      summary: cost
        ? `${cost.formattedTotal} estimated for ${cost.days} days and ${cost.travelers} traveler${cost.travelers === 1 ? "" : "s"}.`
        : `Budget estimate is ready for ${destination}.`,
      bullets: [
        cost?.formattedDailyPerTraveler
          ? `Daily estimate: ${cost.formattedDailyPerTraveler} per traveler.`
          : "Use a daily budget instead of one large number.",
        cost?.note ?? "Keep a buffer for local transport and food choices.",
        "Intercity flights or trains are separate from the city budget.",
      ],
      items: breakdown,
    };
  }

  return {
    label: formatLabel(plan.topic ?? "Travel"),
    title: `${destination} travel guidance`,
    summary: `Here is practical ${plan.topic ?? "travel"} advice for ${destination}.`,
    bullets: travelGuide?.advice ?? [
      "Group nearby places together.",
      "Keep buffer time for traffic, meals, and rest.",
      "Recheck local timings before leaving.",
    ],
    items: Object.entries(travelGuide?.related ?? {}).map(([key, value]) => ({
      label: formatLabel(key),
      value,
    })),
  };
}

function buildSynthesisPrompt({ message, plan, toolResults, structuredPlan }) {
  if (plan.intent === "food_info") {
    return `
USER_REQUEST:
${message}

FOOD_GUIDE_JSON:
${JSON.stringify(structuredPlan.foodGuide, null, 2)}

Write only a compact food answer for the chat bubble.
Do not create a trip itinerary.
Format:
Food in ${structuredPlan.destination}: [one sentence overview]

- Must try: [4-6 items]
- Best areas: [2-3 areas]
- Budget/tip: [one practical sentence]
`;
  }

  return `
USER_REQUEST:
${message}

EXECUTION_PLAN:
${JSON.stringify(plan, null, 2)}

TOOL_RESULTS:
${JSON.stringify(toolResults, null, 2)}

STRUCTURED_PLAN_JSON:
${JSON.stringify(structuredPlan, null, 2)}

Write only a compact response for the chat bubble.
Do not repeat the full itinerary, cost breakdown, weather paragraph, or places list because the UI renders those as cards.
Format:
Ready: [one sentence overview]

- Route: [mention the day themes and top 2-3 places]
- Budget/weather: [one compact sentence with total cost and weather range]
- Next: [one practical next action]
`;
}

function findToolResult(toolResults, name) {
  return toolResults.find((toolResult) => toolResult.name === name)?.result ?? null;
}

function fallbackPlaces(destination) {
  return [
    { name: `${destination} central stay area`, type: "local base" },
    { name: `${destination} main market or food area`, type: "food/local culture" },
    { name: `${destination} verified nearby attraction`, type: "confirm before visiting" },
  ];
}

function fallbackText(structuredPlan, reason) {
  if (structuredPlan.intent === "food_info") {
    const guide = structuredPlan.foodGuide;

    return [
      `Food in ${structuredPlan.destination}: ${guide?.style ?? "Local food is best explored through busy markets, snacks, thalis, and simple restaurants."}`,
      "",
      `- Must try: ${(guide?.mustTry ?? []).slice(0, 6).join(", ") || "local snacks, thali, sweets, and tea stalls"}.`,
      `- Best areas: ${(guide?.areas ?? []).slice(0, 3).join("; ") || "main market lanes and old-town areas"}.`,
      `- Budget/tip: ${[guide?.budget ?? "Keep a simple daily food budget and choose busy stalls.", reason].filter(Boolean).join(" ")}`,
    ].join("\n");
  }

  if (structuredPlan.intent !== "trip_plan") {
    const answer = structuredPlan.travelAnswer;

    return [
      `${answer?.title ?? "Travel answer"}: ${answer?.summary ?? "Here is a direct travel answer."}`,
      "",
      ...(answer?.bullets ?? []).slice(0, 4).map((bullet) => `- ${bullet}`),
      reason ? `- Note: ${reason}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const topPlaces = structuredPlan.places
    .slice(0, 3)
    .map((place) => place.name)
    .join(", ");
  const weatherSamples = structuredPlan.weather?.samples ?? [];
  const temps = weatherSamples
    .map((sample) => sample.tempC)
    .filter(Number.isFinite);
  const weatherRange = temps.length
    ? `${Math.min(...temps)}-${Math.max(...temps)} C`
    : "weather checked";

  return [
    `Ready: ${structuredPlan.summary} ${reason}`,
    "",
    `- Route: ${structuredPlan.days.map((day) => day.title).join(" -> ")}.`,
    `- Budget/weather: ${structuredPlan.cost?.formattedTotal ?? "Cost estimate ready"} with ${weatherRange} conditions.`,
    `- Next: Start with ${topPlaces || structuredPlan.destination} and keep one flexible food or rest slot each day.`,
  ].join("\n");
}

function formatLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getFriendlyErrorMessage(error) {
  const rawMessage = error?.message ?? "Unknown provider error.";

  try {
    const parsed = JSON.parse(rawMessage);
    const providerMessage = parsed?.error?.message ?? parsed?.message;
    const retryDelay = parsed?.error?.details
      ?.find((detail) => detail["@type"]?.includes("RetryInfo"))
      ?.retryDelay;

    if (providerMessage?.includes("API key not valid")) {
      return "Gemini rejected the API key. Create a new Gemini API key, update GEMINI_API_KEY in .env, and restart the backend.";
    }

    if (
      parsed?.error?.code === 429 ||
      parsed?.error?.status === "RESOURCE_EXHAUSTED" ||
      providerMessage?.includes("quota")
    ) {
      return `Using live tools and the backend planner for this result${retryDelay ? `; AI streaming can retry in about ${retryDelay}` : ""}.`;
    }

    if (
      parsed?.error?.code === 503 ||
      parsed?.error?.status === "UNAVAILABLE" ||
      providerMessage?.includes("high demand")
    ) {
      return "Gemini is temporarily overloaded. The app used the backend plan builder and live tool results instead; try again in a minute.";
    }

    if (providerMessage) {
      return providerMessage;
    }
  } catch {
    if (rawMessage.includes("API key not valid")) {
      return "Gemini rejected the API key. Create a new Gemini API key, update GEMINI_API_KEY in .env, and restart the backend.";
    }

    if (rawMessage.includes("quota") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
      return "Using live tools and the backend planner for this result.";
    }

    if (rawMessage.includes("high demand") || rawMessage.includes("UNAVAILABLE")) {
      return "Gemini is temporarily overloaded. The app used the backend plan builder and live tool results instead; try again in a minute.";
    }
  }

  return `Provider error: ${rawMessage}`;
}
