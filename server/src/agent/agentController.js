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

  let structuredPlan = buildStructuredPlan(plan, toolResults, {
    agentTeam,
    memory,
  });
  structuredPlan = await improveWeakStructuredPlanWithProvider({
    provider,
    message: cleanMessage,
    plan,
    toolResults,
    structuredPlan,
    emit,
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
  const requestedScope = getDestinationScope(plan.destination);
  const placeLocality = inferPlaceLocality(placeResolution, plan.place);
  const shouldUsePlaceLocality =
    (plan.intent === "place_info" || plan.intent === "seasonal_info") &&
    placeResolution?.confidence >= 55 &&
    placeLocality;
  const resolvedDestination = requestedScope?.displayName || (shouldUsePlaceLocality
    ? placeLocality
    : destinationResolution?.confidence >= 45
      ? destinationResolution.name
      : plan.destination);
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

function getDestinationScope(destination = "") {
  const normalized = normalizeText(destination);

  if (normalized.includes("northgoa")) {
    return {
      key: "northGoa",
      displayName: "North Goa",
      allowedZones: ["North Goa"],
      blockedZones: ["South Goa", "Old Goa", "Panjim", "Nature"],
      include: /\b(aguada|sinquerim|candolim|calangute|baga|anjuna|vagator|chapora|morjim|ashwem|mandrem|arambol|mapusa|reis magos|saligao|assagao|siolim|tito|north goa)\b/i,
      exclude: /\b(dudhsagar|colva|palolem|cabo de rama|se cathedral|basilica of bom jesus|fontainhas|dona paula|old goa|panjim|panaji|south goa)\b/i,
    };
  }

  if (normalized.includes("southgoa")) {
    return {
      key: "southGoa",
      displayName: "South Goa",
      allowedZones: ["South Goa"],
      blockedZones: ["North Goa", "Old Goa", "Panjim"],
      include: /\b(colva|benaulim|varca|cavelossim|mobor|palolem|patnem|agonda|bogmalo|majorda|betalbatim|utorda|betul|cola beach|galgibaga|talpona|butterfly beach|cabo de rama|netravali|cotigao|margao|madgaon|chandor|loutolim|rachol|goa chitra|south goa)\b/i,
      exclude: /\b(aguada|calangute|baga|anjuna|vagator|chapora|morjim|ashwem|mandrem|arambol|mapusa|reis magos|old goa|fontainhas|panjim|panaji|north goa)\b/i,
    };
  }

  if (normalized.includes("oldgoa")) {
    return {
      key: "oldGoa",
      displayName: "Old Goa",
      allowedZones: ["Old Goa"],
      blockedZones: ["North Goa", "South Goa"],
      include: /\b(old goa|basilica|se cathedral|church|museum|archaeological|st augustine|viceroy)\b/i,
      exclude: /\b(calangute|baga|anjuna|palolem|colva|north goa|south goa)\b/i,
    };
  }

  if (/\b(panjim|panaji)\b/i.test(destination)) {
    return {
      key: "panjim",
      displayName: "Panjim",
      allowedZones: ["Panjim"],
      blockedZones: ["North Goa", "South Goa"],
      include: /\b(panjim|panaji|fontainhas|dona paula|miramar|mandovi|latin quarter|goa state museum)\b/i,
      exclude: /\b(calangute|baga|anjuna|palolem|colva|north goa|south goa)\b/i,
    };
  }

  return null;
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
  const destinationScope = getDestinationScope(destination);
  const daysCount = Math.max(1, Number(plan.days) || 3);
  const placeList = prepareItineraryPlaces({
    destination,
    places: places?.places ?? [],
    interests: plan.interests,
    scope: destinationScope,
    daysCount,
  });
  const dayGroups = buildDayPlaceGroups({
    destination,
    placeList,
    daysCount,
    interests: plan.interests,
    scope: destinationScope,
  });
  const enrichedPlaces = placeList.map((place) =>
    enrichItineraryPlace(place, { destination }),
  );
  const destinationBrief = buildDestinationBrief({
    destination,
    places: enrichedPlaces,
    daysCount,
    source: places?.source,
    warning: places?.warning,
  });

  const days = dayGroups.map((dayGroup, index) => {
    const dayPlaces = dayGroup.places.map((place) =>
      enrichItineraryPlace(place, { destination }),
    );
    const title = dayGroup.title || buildDayTitle({
      index,
      daysCount,
      dayPlaces,
      destination,
    });

    return {
      day: `Day ${index + 1}`,
      title,
      description:
        dayPlaces.length > 0
          ? buildDayDescription({ index, daysCount, dayPlaces, destination })
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
    destinationBrief,
    weather,
    places: enrichedPlaces,
    placeSource: places?.source ?? "",
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

async function improveWeakStructuredPlanWithProvider({
  provider,
  message,
  plan,
  toolResults,
  structuredPlan,
  emit = noop,
}) {
  if (
    plan.intent !== "trip_plan" ||
    !needsProviderItineraryRepair({ structuredPlan, toolResults, plan })
  ) {
    return structuredPlan;
  }

  emit("agent:status", {
    label: "Refining place results",
    detail: "Place sources need a travel-aware pass, so the planner is asking the LLM for destination-specific itinerary cards.",
  });

  try {
    const generated = await provider.generateJson({
      system: `${MASTER_PROMPT}

Return only valid JSON. Create a destination-specific itinerary from travel knowledge when live tools are weak.
Do not use generic placeholders such as "main market or walkable center", "nearby viewpoint or nature walk", "museum, temple, or cultural stop", or "relaxed shopping and departure buffer".
Respect the requested destination or sub-region exactly. If the user asks North Goa, do not include South Goa or Old Goa unless explicitly requested.
Prefer real, visitable attractions over nearby towns, hotels, generic cafes, technical peaks, or far-away places.
If the weak plan repeats the same category, replace it with a balanced mix of the destination's strongest attractions, local areas, nature/heritage/coast/markets, and only the most important devotional stops unless the user asked for a pilgrimage trip.
Do not use dishes, cuisine items, generic activities, hotels, airports, or source artifacts as itinerary stops.
For long regional/state trips, create the exact requested number of days with 2-3 real stops per day, grouped by practical bases or regions, and include transfer/rest buffers only as schedule notes, not fake places.
Every place must include: name, type, famousFor, brief, bestTime, visitDuration.
Brief must say what the place is known for, such as sunset, beach, rafting, wildlife, caves, market, fort, temple, viewpoint, food, or heritage.`,
      user: JSON.stringify({
        userRequest: message,
        destination: structuredPlan.destination,
        days: structuredPlan.days.length,
        travelers: structuredPlan.travelers,
        budgetStyle: plan.budgetStyle,
        interests: plan.interests,
        weakStructuredPlan: structuredPlan,
        toolResults,
        schema: {
          days: [
            {
              title: "string",
              description: "string",
              places: [
                {
                  name: "string",
                  type: "string",
                  famousFor: "string",
                  brief: "string",
                  bestTime: "string",
                  visitDuration: "string",
                },
              ],
              schedule: [
                { time: "Morning", activity: "string" },
                { time: "Afternoon", activity: "string" },
                { time: "Evening", activity: "string" },
              ],
            },
          ],
          places: [
            {
              name: "string",
              type: "string",
              famousFor: "string",
              brief: "string",
              bestTime: "string",
              visitDuration: "string",
            },
          ],
        },
      }),
    });

    return mergeGeneratedItinerary({
      generated,
      structuredPlan,
      allowUnmatchedPlaces: shouldAllowProviderPlaceKnowledge({
        structuredPlan,
        toolResults,
      }) || hasPoorItineraryDiversity(structuredPlan, plan?.interests),
    });
  } catch {
    return structuredPlan;
  }
}

function needsProviderItineraryRepair({ structuredPlan, toolResults, plan = {} }) {
  if (isWeakStructuredPlan(structuredPlan)) {
    return true;
  }

  if (hasThinItineraryCoverage(structuredPlan)) {
    return true;
  }

  if (hasPoorItineraryDiversity(structuredPlan, plan?.interests)) {
    return true;
  }

  const placesResult = findToolResult(toolResults, "getPlaces");
  const source = String(placesResult?.source ?? "");

  return /low-confidence local planning fallback|no verified/i.test(source);
}

function isWeakStructuredPlan(structuredPlan) {
  const places = structuredPlan.days
    ?.flatMap((day) => day.places ?? []) ?? [];

  if (!places.length) {
    return true;
  }

  const weakCount = places.filter((place) =>
    isWeakGeneratedPlaceName(place.name, structuredPlan.destination),
  ).length;

  return weakCount / places.length >= 0.35;
}

function hasThinItineraryCoverage(structuredPlan) {
  const days = structuredPlan.days ?? [];
  const places = days.flatMap((day) => day.places ?? []);

  return days.some((day) => !day.places?.length) ||
    places.length < Math.max(3, days.length * 2);
}

function hasPoorItineraryDiversity(structuredPlan, interests = []) {
  if (isReligionFocusedRequest(interests)) {
    return false;
  }

  const places = structuredPlan.days
    ?.flatMap((day) => day.places ?? []) ?? [];

  if (places.length < 6) {
    return false;
  }

  const categoryCounts = places.reduce((counts, place) => {
    const category = getPlaceDiversityCategory(place);

    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
  const devotionalCount = categoryCounts.devotion ?? 0;
  const indoorCultureCount = (categoryCounts.devotion ?? 0) + (categoryCounts.museum ?? 0);
  const variedOutdoorCount =
    (categoryCounts.coast ?? 0) +
    (categoryCounts.nature ?? 0) +
    (categoryCounts.river ?? 0) +
    (categoryCounts.local ?? 0);

  return devotionalCount >= 3 ||
    indoorCultureCount / places.length >= 0.62 ||
    (variedOutdoorCount === 0 && indoorCultureCount >= 4);
}

function shouldAllowProviderPlaceKnowledge({ structuredPlan, toolResults }) {
  const placesResult = findToolResult(toolResults, "getPlaces");
  const source = String(placesResult?.source ?? structuredPlan.placeSource ?? "");
  const sourcePlaces = structuredPlan.places ?? [];

  if (hasThinItineraryCoverage(structuredPlan)) {
    return true;
  }

  if (/no verified|low-confidence local planning fallback/i.test(source)) {
    return true;
  }

  if (/openstreetmap/i.test(source) && !/wikivoyage|wikipedia attraction list/i.test(source)) {
    return true;
  }

  return sourcePlaces.length < Math.max(4, (structuredPlan.days?.length ?? 1) * 2);
}

function isWeakGeneratedPlaceName(name = "", destination = "") {
  const text = String(name).toLowerCase();

  return (
    isDestinationOnlyName(name, destination) ||
    isDishLikePlaceName(name) ||
    /\bairport\b/i.test(text) ||
    /^(trekking\s*(?:and|&)\s*camping|camping|kitesurfing beach|paragliding beach|small waterfall|nature walk|water sports|watersports|scuba diving|river rafting)$/i.test(text) ||
    /\b(main market or walkable center|old-town or heritage area|nearby viewpoint or nature walk|local food street or cafe area|museum, temple, or cultural stop|relaxed shopping and departure buffer)\b/i.test(text) ||
    (/\b(or)\b/i.test(text) && /\b(market|walkable|viewpoint|nature|museum|temple|cultural|shopping|departure|food street|cafe area|heritage area)\b/i.test(text))
  );
}

function mergeGeneratedItinerary({ generated, structuredPlan, allowUnmatchedPlaces = false }) {
  const generatedDays = Array.isArray(generated?.days) ? generated.days : [];
  const normalizedDays = generatedDays
    .slice(0, structuredPlan.days.length)
    .map((day, index) => normalizeGeneratedDay({
      day,
      index,
      destination: structuredPlan.destination,
      fallbackDay: structuredPlan.days[index],
      daysCount: structuredPlan.days.length,
    }));
  const validPlaces = normalizedDays.flatMap((day) => day.places ?? []);

  if (
    normalizedDays.length < structuredPlan.days.length ||
    !validPlaces.length ||
    validPlaces.some((place) => isWeakGeneratedPlaceName(place.name, structuredPlan.destination)) ||
    hasUnverifiedGeneratedPlaces(validPlaces, structuredPlan.places, structuredPlan.destination, {
      allowUnmatchedPlaces,
    })
  ) {
    return structuredPlan;
  }

  const generatedPlaces = Array.isArray(generated?.places)
    ? generated.places
    : validPlaces;
  const places = dedupePlaces(
    generatedPlaces.map((place) =>
      enrichItineraryPlace(normalizeGeneratedPlace(place), {
        destination: structuredPlan.destination,
      }),
    ),
  );
  const planPlaces = places.length ? places : validPlaces;
  const destinationBrief = buildDestinationBrief({
    destination: structuredPlan.destination,
    places: planPlaces,
    daysCount: structuredPlan.days.length,
    source: structuredPlan.placeSource,
  });

  const improvedPlan = {
    ...structuredPlan,
    days: normalizedDays,
    places: planPlaces,
    destinationBrief,
    tips: [
      "Recheck opening hours, access rules, and local weather before finalizing.",
      "Keep travel buffers between far-apart outdoor stops.",
      "Use the place notes to decide what to prioritize each day.",
    ],
  };

  return {
    ...improvedPlan,
    booking: buildBookingHandoff(improvedPlan),
  };
}

function hasUnverifiedGeneratedPlaces(
  generatedPlaces = [],
  sourcePlaces = [],
  destination = "",
  { allowUnmatchedPlaces = false } = {},
) {
  const sourceNames = sourcePlaces.map((place) => normalizeText(place.name)).filter(Boolean);

  if (!sourceNames.length) {
    return !allowUnmatchedPlaces;
  }

  return generatedPlaces.some((place) => {
    const generatedName = normalizeText(place.name);

    const sourceMatch = sourceNames.some((sourceName) =>
      generatedName === sourceName ||
      (generatedName.length > 7 && sourceName.length > 7 && (
        generatedName.includes(sourceName) ||
        sourceName.includes(generatedName)
      )),
    );

    if (sourceMatch) {
      return false;
    }

    return !allowUnmatchedPlaces ||
      !isAcceptableProviderPlace(place, destination);
  });
}

function isAcceptableProviderPlace(place, destination = "") {
  const text = `${place?.name ?? ""} ${place?.type ?? ""} ${place?.famousFor ?? ""} ${place?.brief ?? ""}`;
  const scopedPlace = {
    ...place,
    description: text,
  };
  const scope = getDestinationScope(destination);

  if (
    !place?.name ||
    isWeakGeneratedPlaceName(place.name, destination) ||
    isDestinationOnlyName(place.name, destination) ||
    isDishLikePlaceName(place.name)
  ) {
    return false;
  }

  if (scope && !isPlaceInDestinationScope(scopedPlace, scope)) {
    return false;
  }

  if (/\b(main market or walkable center|old-town or heritage area|nearby viewpoint or nature walk|museum, temple, or cultural stop|relaxed shopping and departure buffer)\b/i.test(text)) {
    return false;
  }

  return /\b(beach|fort|castle|palace|museum|heritage|temple|mandir|church|cathedral|dargah|monastery|market|bazaar|lane|street|restaurant|cafe|promenade|viewpoint|view point|sunset|river|rafting|wildlife|sanctuary|forest|cave|caves|rock|falls|waterfall|lake|ghat|park|garden|nightlife)\b/i.test(text);
}

function normalizeGeneratedDay({ day, index, destination, fallbackDay, daysCount }) {
  const rawPlaces = Array.isArray(day?.places) ? day.places : [];
  const places = rawPlaces
    .map((place) =>
      enrichItineraryPlace(normalizeGeneratedPlace(place), { destination }),
    )
    .filter((place) => place.name && !isWeakGeneratedPlaceName(place.name, destination))
    .slice(0, 3);

  return {
    day: `Day ${index + 1}`,
    title: cleanGeneratedText(day?.title) || fallbackDay?.title || buildDayTitle({
      index,
      daysCount,
      dayPlaces: places,
      destination,
    }),
    description: cleanGeneratedText(day?.description) || buildDayDescription({
      index,
      daysCount,
      dayPlaces: places,
      destination,
    }),
    places,
    schedule: normalizeGeneratedSchedule(day?.schedule, {
      index,
      daysCount,
      dayPlaces: places,
      destination,
    }),
  };
}

function normalizeGeneratedPlace(place) {
  if (typeof place === "string") {
    return { name: place, type: "local stop" };
  }

  return {
    ...place,
    name: cleanGeneratedText(place?.name),
    type: cleanGeneratedText(place?.type),
    famousFor: cleanGeneratedText(place?.famousFor),
    brief: cleanGeneratedText(place?.brief),
    bestTime: cleanGeneratedText(place?.bestTime),
    visitDuration: cleanGeneratedText(place?.visitDuration),
  };
}

function normalizeGeneratedSchedule(schedule, context) {
  if (!Array.isArray(schedule) || schedule.length < 3) {
    return buildDaySchedule(context);
  }

  const allowedTimes = ["Morning", "Afternoon", "Evening"];

  return allowedTimes.map((time, index) => {
    const item = schedule.find((entry) =>
      sameNormalizedPlace(entry?.time, time),
    ) ?? schedule[index];

    return {
      time,
      activity: cleanGeneratedText(item?.activity) || buildDaySchedule(context)[index]?.activity,
    };
  });
}

function dedupePlaces(places = []) {
  const seen = new Set();

  return places.filter((place) => {
    const normalized = normalizeText(place.name);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function cleanGeneratedText(value = "") {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDayPlaceGroups({ placeList, daysCount }) {
  const coveredPlaces = ensurePlaceCoverage({
    placeList,
  }).slice(0, daysCount * 3);

  if (!coveredPlaces.length) {
    return Array.from({ length: daysCount }, () => ({ places: [] }));
  }

  const anchors = selectDayAnchors(coveredPlaces, daysCount);
  const anchorNames = new Set(anchors.map((place) => normalizeText(place.name)));
  const groups = Array.from({ length: daysCount }, (_item, index) => ({
    places: anchors[index] ? [anchors[index]] : [],
  }));

  for (const place of coveredPlaces) {
    if (anchorNames.has(normalizeText(place.name))) {
      continue;
    }

    const bestGroup = groups
      .map((group, index) => ({ group, index }))
      .filter(({ group }) => group.places.length < 3)
      .map(({ group, index }) => ({
        index,
        score: scoreDayGroupFit(group.places, place),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (bestGroup) {
      groups[bestGroup.index].places.push(place);
    }
  }

  return groups.map((group) => ({
    places: orderPlacesForDay(group.places),
  }));
}

function selectDayAnchors(places = [], daysCount = 3) {
  const anchors = [];
  const usedNames = new Set();
  const usedCategories = new Set();
  const ranked = places
    .map((place, index) => ({
      place,
      index,
      category: getPlaceDiversityCategory(place),
    }))
    .sort((a, b) => {
      const priorityDiff = categoryDiversityPriority(b.category) - categoryDiversityPriority(a.category);

      return Math.abs(priorityDiff) >= 18 ? priorityDiff : a.index - b.index;
    });

  for (const candidate of ranked) {
    if (anchors.length >= daysCount) {
      break;
    }

    const normalizedName = normalizeText(candidate.place.name);

    if (!normalizedName || usedNames.has(normalizedName) || usedCategories.has(candidate.category)) {
      continue;
    }

    anchors.push(candidate.place);
    usedNames.add(normalizedName);
    usedCategories.add(candidate.category);
  }

  for (const place of places) {
    if (anchors.length >= daysCount) {
      break;
    }

    const normalizedName = normalizeText(place.name);

    if (!normalizedName || usedNames.has(normalizedName)) {
      continue;
    }

    anchors.push(place);
    usedNames.add(normalizedName);
  }

  return anchors;
}

function scoreDayGroupFit(groupPlaces = [], place) {
  if (!groupPlaces.length) {
    return 0;
  }

  const anchor = groupPlaces[0];
  const distanceScores = groupPlaces
    .map((existingPlace) => placeDistanceKm(existingPlace, place))
    .filter(Number.isFinite)
    .map((distance) => Math.max(-80, 80 - distance * 2.4));
  const distanceScore = distanceScores.length
    ? Math.max(...distanceScores)
    : 0;
  const themeScore = groupPlaces.some((existingPlace) =>
    getSinglePlaceTheme(existingPlace) === getSinglePlaceTheme(place)
  )
    ? 36
    : 0;
  const zoneScore = anchor.zone && place.zone
    ? sameNormalizedPlace(anchor.zone, place.zone)
      ? 48
      : -24
    : 0;

  return distanceScore + themeScore + zoneScore - groupPlaces.length * 4;
}

function orderPlacesForDay(places = []) {
  return [...places].sort((a, b) => placeDayOrder(a) - placeDayOrder(b));
}

function placeDayOrder(place) {
  const text = `${place?.name ?? ""} ${place?.type ?? ""} ${place?.famousFor ?? ""}`.toLowerCase();

  if (/\b(museum|palace|fort|castle|heritage|temple|mandir|church|cathedral|basilica|caves?|wildlife|sanctuary|waterfall|falls)\b/.test(text)) {
    return 1;
  }

  if (/\b(market|bazaar|street|lane|food|nightlife|sunset|promenade|beach|coast)\b/.test(text)) {
    return 3;
  }

  return 2;
}

function getSinglePlaceTheme(place) {
  return getDayTheme([place]).key;
}

function placeDistanceKm(placeA, placeB) {
  const coordinatesA = getPlaceCoordinates(placeA);
  const coordinatesB = getPlaceCoordinates(placeB);

  if (!coordinatesA || !coordinatesB) {
    return null;
  }

  return distanceInKm(
    coordinatesA.latitude,
    coordinatesA.longitude,
    coordinatesB.latitude,
    coordinatesB.longitude,
  );
}

function getPlaceCoordinates(place) {
  const latitude = Number(place?.location?.latitude ?? place?.location?.lat);
  const longitude = Number(place?.location?.longitude ?? place?.location?.lon ?? place?.location?.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function distanceInKm(latA, lonA, latB, lonB) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const radiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLon = toRadians(lonB - lonA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * radiusKm * Math.asin(Math.sqrt(a));
}

function enrichItineraryPlace(place, { destination = "" } = {}) {
  const rawName = String(place?.name ?? "").trim();
  const type = String(place?.type ?? "").trim();
  const sourceDescription = cleanPlaceDescription(place?.description);
  const providedBrief = cleanPlaceDescription(place?.brief);
  const providedBestTime = cleanPlaceDescription(place?.bestTime);
  const providedVisitDuration = cleanPlaceDescription(place?.visitDuration);
  const famousFor = cleanGeneratedText(place?.famousFor) || inferPlaceFamousFor({
    name: rawName,
    type,
    destination,
    description: sourceDescription,
  });
  const name = normalizeItineraryPlaceName(rawName, {
    famousFor,
    destination,
    description: sourceDescription,
  });
  const generatedBrief = buildPlaceBrief({
    name,
    type,
    destination,
    famousFor,
  });
  const brief = providedBrief || buildCombinedPlaceBrief({
    name,
    famousFor,
    generatedBrief,
    sourceDescription,
  });
  const bestTime = providedBestTime || buildPlaceBestTime({
    name,
    type,
    destination,
    famousFor,
    description: sourceDescription,
  });
  const visitDuration = providedVisitDuration || buildVisitDuration({
    name,
    type,
    famousFor,
    description: sourceDescription,
  });
  const openingHint = cleanGeneratedText(place?.openingHint) || buildOpeningHint(place);

  return {
    ...place,
    name,
    type,
    famousFor,
    brief,
    bestTime,
    visitDuration,
    openingHint,
  };
}

function normalizeItineraryPlaceName(name, {
  famousFor = "",
  destination = "",
  description = "",
} = {}) {
  const cleanedName = String(name)
    .replace(/\bfort$/i, "Fort")
    .replace(/\bmuseum$/i, "Museum")
    .trim();

  if (
    !/\bbeach\b/i.test(cleanedName) &&
    (famousFor === "beach time" || /\bbeach(?:es)?\b|\bbeach-side\b/i.test(description))
  ) {
    return `${cleanedName} Beach`;
  }

  if (famousFor === "river rafting" && /^rafting$/i.test(cleanedName)) {
    return `${destination} River Rafting`;
  }

  return cleanedName;
}

function buildCombinedPlaceBrief({
  name,
  famousFor = "",
  generatedBrief = "",
  sourceDescription = "",
}) {
  const sourceNote = polishSourceDescription(sourceDescription, {
    name,
    famousFor,
  });

  if (!sourceNote) {
    return generatedBrief;
  }

  if (normalizeText(sourceNote) === normalizeText(generatedBrief)) {
    return generatedBrief;
  }

  if (sourceNote.length <= 95) {
    return `${generatedBrief} ${sourceNote}`;
  }

  return generatedBrief;
}

function polishSourceDescription(description = "", { name = "", famousFor = "" } = {}) {
  const cleanDescription = cleanPlaceDescription(description);

  if (!cleanDescription) {
    return "";
  }

  if (
    famousFor === "beach time" &&
    (
      /\bbeach located\b/i.test(cleanDescription) ||
      /\beasily accessible from\b/i.test(cleanDescription) ||
      (/\btown\b/i.test(cleanDescription) &&
      !/\b(sun|swim|sand|sea|coast|walk|tourist|beach)\b/i.test(cleanDescription))
    )
  ) {
    return "";
  }

  if (normalizeText(cleanDescription) === normalizeText(name)) {
    return "";
  }

  const subjectMatch = cleanDescription.match(/^([A-Z][A-Za-z\s.'-]{2,45})\s+is\b/);

  if (
    subjectMatch &&
    !normalizeText(name).includes(normalizeText(subjectMatch[1]))
  ) {
    return "";
  }

  if (new RegExp(`^${escapeRegExp(name)}\\b`, "i").test(cleanDescription)) {
    return cleanDescription.endsWith(".") ? cleanDescription : `${cleanDescription}.`;
  }

  if (/^(is|are|has|offers|sits|lies|works)\b/i.test(cleanDescription)) {
    return `${name} ${cleanDescription}${/[.!?]$/.test(cleanDescription) ? "" : "."}`;
  }

  if (/^(a|an|the)\b/i.test(cleanDescription)) {
    return `${name} is ${cleanDescription}${/[.!?]$/.test(cleanDescription) ? "" : "."}`;
  }

  return `${name} is known for ${cleanDescription}${/[.!?]$/.test(cleanDescription) ? "" : "."}`;
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanPlaceDescription(description = "") {
  const text = String(description)
    .replace(/\s+/g, " ")
    .replace(/^or\s+[^:]{1,90}:\s*/i, "")
    .trim();

  const firstSentence = text.match(/^(.{45,220}?[.!?])(?:\s|$)/)?.[1];
  const compactText = firstSentence || text;
  const cleanText = compactText.replace(/[.!?]$/, "");

  if (cleanText.length <= 180) {
    return cleanText;
  }

  return cleanText
    .slice(0, 180)
    .replace(/\s+\S*$/, "")
    .replace(/[,:;-]$/, "");
}

function inferPlaceFamousFor({ name = "", type = "", destination = "", description = "" }) {
  const text = `${name} ${type} ${destination} ${description}`.toLowerCase();

  if (/\b(rafting|rapids|canoeing|kayaking|kali river)\b/.test(text)) {
    return "river rafting";
  }

  if (/\b(tiger reserve|wildlife|sanctuary|national park|nature camp)\b/.test(text)) {
    return "wildlife and forest";
  }

  if (/\b(cave|caves|rock|rocks)\b/.test(text)) {
    return "caves and rock formations";
  }

  if (/\b(sunsets?|chapora|vagator|dona paula|marine drive|queen'?s necklace|sykes point|fort aguada|cabo de rama|reis magos)\b/.test(text)) {
    return "sunset views";
  }

  if (/\b(beach|calangute|baga|candolim|anjuna|morjim|ashwem|mandrem|palolem|colva|benaulim|agonda|sinquerim|vagator)\b/.test(text)) {
    return "beach time";
  }

  if (/\b(fort|castle|palace|wada|heritage|monument|basilica|cathedral|church|old goa|reis magos|aguada)\b/.test(text)) {
    return "heritage";
  }

  if (/\b(market|bazaar|flea|mapusa|shopping|mall road|causeway)\b/.test(text)) {
    return "local shopping";
  }

  if (/\b(temple|mandir|shrine|dattatraya|narasimha saraswati|audumbar|dargah|mosque|monastery|sacred|pilgrimage)\b/.test(text)) {
    return "devotion";
  }

  if (/\b(bridge|riverfront)\b/.test(text)) {
    return "river landmark";
  }

  if (/\b(waterfall|falls|lake|river|ghat|forest|sanctuary|wildlife|park|garden|valley|nature|backwater)\b/.test(text)) {
    return "nature";
  }

  if (/\b(food|cafe|restaurant|lane|street|tito|nightlife)\b/.test(text)) {
    return "food and nightlife";
  }

  if (/\b(commercial capital|cultural capital|town|village|city|local life)\b/.test(text)) {
    return "local culture";
  }

  if (/\b(museum|gallery|art|science)\b/.test(text)) {
    return "museum stop";
  }

  return type || "local stop";
}

function isReligionFocusedRequest(interests = []) {
  return interests.some((interest) =>
    /\b(temple|mandir|church|cathedral|mosque|dargah|monastery|spiritual|devotion|pilgrimage|religion|religious)\b/i.test(String(interest)),
  );
}

function isDishLikePlaceName(name = "") {
  const text = String(name ?? "").toLowerCase();

  if (/\b(food street|food court|food market|night market|restaurant|cafe|café|bazaar|market|lane|street)\b/i.test(text)) {
    return false;
  }

  return /\b(poitabhat|pitha|bhat|pickles?|pickle|chutney|curry|thali|pav|misal|vada|poha|upma|ladoo|laddu|sweet|sweets|tea|chai|rice|fish|snack|snacks|dish|dishes)\b/i.test(text);
}

function getPlaceDiversityCategory(place = {}) {
  const text = `${place.name ?? ""} ${place.type ?? ""} ${place.famousFor ?? ""} ${place.brief ?? ""} ${place.description ?? ""}`.toLowerCase();

  if (/\b(beach|coast|sea|shore|promenade|calangute|baga|candolim|anjuna|vagator|palolem|colva|benaulim|sinquerim)\b/.test(text)) {
    return "coast";
  }

  if (/\b(wildlife|sanctuary|national park|nature reserve|forest|waterfall|falls|lake|garden|park|viewpoint|view point|valley|ghat|backwater|rafting|river rafting|cave|caves|rock|cliff)\b/.test(text)) {
    return "nature";
  }

  if (/\b(bridge|riverfront|river-side|riverside|ghat|confluence|promenade)\b/.test(text)) {
    return "river";
  }

  if (/\b(fort|castle|palace|wada|heritage|monument|old town|historic|history|architecture|caves?)\b/.test(text)) {
    return "heritage";
  }

  if (/\b(market|bazaar|food|cafe|restaurant|street|lane|shopping|nightlife|local culture|old-city|old city)\b/.test(text)) {
    return "local";
  }

  if (/\b(museum|gallery|darbar|exhibit|art|science)\b/.test(text)) {
    return "museum";
  }

  if (/\b(temple|mandir|shrine|dattatraya|datta|ganapati|ganpati|church|cathedral|basilica|mosque|dargah|monastery|sacred|pilgrimage|devotion|place_of_worship)\b/.test(text)) {
    return "devotion";
  }

  return "attraction";
}

function buildPlaceBrief({ name = "", type = "", destination = "", famousFor = "" }) {
  const text = `${name} ${type} ${destination}`.toLowerCase();

  if (famousFor === "sunset views") {
    return `${name} is best used for open views, golden-hour photos, and a slower sunset stop.`;
  }

  if (famousFor === "beach time") {
    return `${name} is a useful beach stop for sand, cafes, water-side walks, and relaxed coastal time.`;
  }

  if (famousFor === "heritage") {
    return `${name} adds history and architecture to the route, with good context for the area's older identity.`;
  }

  if (famousFor === "local shopping") {
    return `${name} works well for local shopping, snacks, souvenirs, and seeing the everyday market side of ${destination}.`;
  }

  if (famousFor === "devotion") {
    return `${name} is a devotional stop; visit respectfully and keep local timing, dress, and crowd patterns in mind.`;
  }

  if (famousFor === "river landmark") {
    return `${name} works best as a short river-side landmark stop for local context, views, and an easy photo break.`;
  }

  if (famousFor === "nature") {
    if (/\b(waterfall|falls)\b/i.test(text)) {
      return `${name} is a scenic waterfall stop, best kept for daylight when paths, viewpoints, and weather are easier to manage.`;
    }

    if (/\b(lake|dam|river|ghat|backwater)\b/i.test(text)) {
      return `${name} is useful for water views, calmer walking time, photos, and a lighter break between bigger sightseeing blocks.`;
    }

    return `${name} is best for greenery, fresh air, views, or a lighter nature break within the itinerary.`;
  }

  if (famousFor === "wildlife and forest") {
    return `${name} is useful for forest scenery, wildlife context, birding, and a slower nature-focused part of ${destination}.`;
  }

  if (famousFor === "river rafting") {
    return `${name} is the adventure anchor for Kali River rafting, canoeing, coracle rides, and water-based outdoor time.`;
  }

  if (famousFor === "caves and rock formations") {
    if (!/\b(cave|caves|rock|gorge)\b/i.test(name)) {
      return `${name} works best as a daylight base for nearby caves, waterfalls, viewpoints, and high-rainfall scenery.`;
    }

    return `${name} is known for its cave, rock, or gorge setting, so keep it for daylight and wear shoes with grip.`;
  }

  if (famousFor === "food and nightlife") {
    return `${name} is better later in the day for food, cafes, music, and a livelier local atmosphere.`;
  }

  if (famousFor === "local culture") {
    return `${name} gives the route local context through markets, food, everyday streets, and the town side of ${destination}.`;
  }

  if (famousFor === "museum stop") {
    return `${name} gives the day an indoor culture stop with local history, art, or exhibits.`;
  }

  if (/\b(pass|viewpoint|view point|hill|valley)\b/.test(text)) {
    return `${name} is mainly for views and scenic movement, so keep it in daylight and check road conditions.`;
  }

  return `${name} is included as a practical ${type || "local"} stop near ${destination}, useful for balancing the route.`;
}

function buildPlaceBestTime({
  name = "",
  type = "",
  famousFor = "",
  description = "",
} = {}) {
  const text = `${name} ${type} ${famousFor} ${description}`.toLowerCase();

  if (/\b(wildlife|sanctuary|forest|bird|national park|nature camp)\b/.test(text)) {
    return "Early morning is best for cooler weather, quieter trails, and better wildlife or bird activity.";
  }

  if (/\b(rafting|rapids|canoeing|kayaking|water sports?)\b/.test(text)) {
    return "Book a morning or early-afternoon slot, when operators have more daylight buffer and conditions are easier to manage.";
  }

  if (/\b(waterfall|falls)\b/.test(text)) {
    return "Visit in daylight, especially monsoon or post-monsoon, and avoid heavy-rain hours or closed paths.";
  }

  if (/\b(sunset|chapora|vagator|dona paula|promenade|viewpoint|view point|fort aguada|cabo de rama|reis magos)\b/.test(text)) {
    return "Late afternoon to sunset is the strongest window for views, photos, and a slower finish.";
  }

  if (/\b(beach|coast|sea|shore|sand)\b/.test(text)) {
    return "Go early morning for calm beach time or late afternoon for softer light and cooler walking.";
  }

  if (/\b(market|bazaar|flea|shopping|street|lane|food|nightlife|tito)\b/.test(text)) {
    return "Late afternoon or evening works best, when shops, food stalls, and the local atmosphere are more active.";
  }

  if (/\b(temple|mandir|shrine|dargah|mosque|church|cathedral|basilica|monastery|pilgrimage|devotion)\b/.test(text)) {
    return "Morning or early evening is usually best for calmer visits, softer light, and easier crowd management.";
  }

  if (/\b(museum|gallery|palace|heritage|fort|castle|monument|caves?)\b/.test(text)) {
    return "Morning is best for cooler weather, clearer photos, and more time before closing hours.";
  }

  if (/\b(lake|garden|park|river|ghat|backwater|valley|hill|pass|nature)\b/.test(text)) {
    return "Morning or late afternoon is best, when heat is lower and the light is better for views.";
  }

  return "Keep it in daylight, preferably morning or late afternoon, and check current opening hours before going.";
}

function buildVisitDuration({
  name = "",
  type = "",
  famousFor = "",
  description = "",
} = {}) {
  const text = `${name} ${type} ${famousFor} ${description}`.toLowerCase();

  if (/\b(wildlife|sanctuary|national park|nature camp|rafting|water sports?|backwater|trek|hike)\b/.test(text)) {
    return "Plan 3-5 hours, plus transfer time.";
  }

  if (/\b(beach|market|bazaar|food|nightlife|promenade|lake|waterfall|falls|garden|park)\b/.test(text)) {
    return "Plan 1.5-3 hours.";
  }

  if (/\b(museum|palace|fort|castle|caves?|heritage|church|cathedral|basilica|temple|mandir|monastery|dargah)\b/.test(text)) {
    return "Plan 45-90 minutes.";
  }

  return "Plan 45-120 minutes.";
}

function buildOpeningHint(place = {}) {
  if (typeof place.openNow === "boolean") {
    return place.openNow
      ? "Listed as open now by the place source."
      : "Listed as closed now; confirm hours before going.";
  }

  const firstHoursLine = Array.isArray(place.openingHours)
    ? cleanGeneratedText(place.openingHours[0])
    : "";

  return firstHoursLine ? `Hours sample: ${firstHoursLine}` : "";
}

function buildDestinationBrief({
  destination = "this destination",
  places = [],
  daysCount = 3,
  source = "",
  warning = "",
} = {}) {
  const usablePlaces = places.filter((place) => place?.name);
  const anchors = usablePlaces.slice(0, 5).map((place) => place.name);

  if (!anchors.length) {
    return warning ||
      `I could not verify enough place data for ${destination}, so the app should ask for a narrower area or retry live place sources before making a detailed route.`;
  }

  const focus = inferDestinationStrengths(usablePlaces);
  const sourceText = source && !/no verified/i.test(source)
    ? "from live place sources"
    : "from the available place results";
  const focusText = focus.length
    ? `around ${formatPlaceList(focus)}`
    : "around the strongest verified stops";
  const dayText = daysCount === 1
    ? "For one day, the route should stay tight and avoid distant add-ons."
    : `For ${daysCount} days, the route should group nearby stops, keep travel buffers, and explain why each anchor is worth the time.`;

  return `${destination} is best planned ${focusText}, led by ${formatPlaceList(anchors.slice(0, 4))} ${sourceText}. ${dayText}`;
}

function inferDestinationStrengths(places = []) {
  const categories = [
    { label: "beaches and coastal walks", pattern: /\b(beach|coastal|sea|sand|seafront)\b/i },
    { label: "viewpoints and scenic stops", pattern: /\b(sunset|golden-hour|viewpoint|view point|fort aguada|chapora|vagator)\b/i },
    { label: "forts and heritage", pattern: /\b(heritage|fort|castle|palace|monument|church|cathedral|basilica|old town)\b/i },
    { label: "nature and outdoor time", pattern: /\b(nature|wildlife|forest|sanctuary|river|rafting|waterfall|falls|cave|park|garden|valley)\b/i },
    { label: "food, markets, and nightlife", pattern: /\b(food|market|bazaar|shopping|cafe|restaurant|lane|street|nightlife|tito)\b/i },
    { label: "spiritual and cultural stops", pattern: /\b(devotion|temple|mandir|monastery|dargah|mosque|museum|gallery|culture)\b/i },
  ];

  return categories
    .map((category) => ({
      ...category,
      score: places.filter((place) =>
        category.pattern.test(`${place.name ?? ""} ${place.type ?? ""} ${place.famousFor ?? ""} ${place.brief ?? ""}`),
      ).length,
    }))
    .filter((category) => category.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((category) => category.label);
}

function prepareItineraryPlaces({ destination, places = [], interests = [], scope = null, daysCount = 3 }) {
  const seen = new Set();
  const minimum = Math.max(5, daysCount * 2);
  const cleanPlaces = places
    .filter((place) => isUsableItineraryPlace(place, destination, interests))
    .filter((place) => isPlaceInDestinationScope(place, scope))
    .filter((place) => {
      const normalized = normalizeText(place.name);

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });

  const strongPlaces = preferStrongItineraryPlaces({
    places: cleanPlaces,
    destination,
    minimum,
    interests,
  });

  return balanceItineraryPlaceDiversity({
    places: strongPlaces,
    interests,
    daysCount,
    minimum,
  });
}

function preferStrongItineraryPlaces({ places = [], destination = "", minimum = 6, interests = [] }) {
  const strongPlaces = places.filter((place) =>
    !isBackupItineraryPlace(place, destination, interests),
  );

  if (strongPlaces.length >= minimum) {
    return strongPlaces;
  }

  return [
    ...strongPlaces,
    ...places.filter((place) => isBackupItineraryPlace(place, destination, interests)),
  ];
}

function balanceItineraryPlaceDiversity({ places = [], interests = [], daysCount = 3, minimum = 6 }) {
  if (isReligionFocusedRequest(interests) || places.length <= 4) {
    return places;
  }

  const target = Math.min(places.length, Math.max(minimum, daysCount * 3));
  const categoryCaps = {
    devotion: Math.max(1, Math.min(2, Math.ceil(daysCount / 2))),
    museum: Math.max(1, Math.min(2, daysCount)),
    river: Math.max(1, Math.min(2, daysCount)),
    local: Math.max(1, Math.min(2, daysCount)),
    nature: Math.max(2, Math.min(4, daysCount + 1)),
    coast: Math.max(2, Math.min(4, daysCount + 1)),
    heritage: Math.max(2, Math.min(4, daysCount + 1)),
    attraction: Math.max(1, Math.min(3, daysCount)),
  };
  const buckets = new Map();

  places.forEach((place, index) => {
    const category = getPlaceDiversityCategory(place);
    const bucket = buckets.get(category) ?? [];

    bucket.push({ place, index });
    buckets.set(category, bucket);
  });

  const categories = [...buckets.keys()].sort((a, b) => {
    const firstA = buckets.get(a)?.[0]?.index ?? Number.MAX_SAFE_INTEGER;
    const firstB = buckets.get(b)?.[0]?.index ?? Number.MAX_SAFE_INTEGER;
    const priorityDiff = categoryDiversityPriority(b) - categoryDiversityPriority(a);

    return Math.abs(priorityDiff) >= 18 ? priorityDiff : firstA - firstB;
  });
  const picked = [];
  const pickedNames = new Set();
  const categoryCounts = {};
  let added = true;

  while (picked.length < target && added) {
    added = false;

    for (const category of categories) {
      const bucket = buckets.get(category) ?? [];
      const cap = categoryCaps[category] ?? 3;

      if ((categoryCounts[category] ?? 0) >= cap) {
        continue;
      }

      const next = bucket.find(({ place }) => !pickedNames.has(normalizeText(place.name)));

      if (!next) {
        continue;
      }

      picked.push(next.place);
      pickedNames.add(normalizeText(next.place.name));
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      added = true;

      if (picked.length >= target) {
        break;
      }
    }
  }

  const remainder = places.filter((place) => !pickedNames.has(normalizeText(place.name)));

  return [...picked, ...remainder];
}

function categoryDiversityPriority(category) {
  const priorities = {
    coast: 95,
    nature: 90,
    heritage: 82,
    river: 76,
    local: 72,
    museum: 60,
    devotion: 54,
    attraction: 46,
  };

  return priorities[category] ?? 40;
}

function isBackupItineraryPlace(place, destination = "", interests = []) {
  const text = `${place?.name ?? ""} ${place?.type ?? ""} ${place?.address ?? ""} ${place?.description ?? ""}`;
  const destinationText = String(destination ?? "").toLowerCase();
  const isKolhapur = /\bkolhapur\b/i.test(destinationText);
  const wantsReligion = isReligionFocusedRequest(interests);

  if (/\blocal green space, useful only as a light break\b/i.test(text)) {
    return true;
  }

  if (/\b(is mapped as a place of worship|mapped as a place of worship)\b/i.test(text) &&
    !wantsReligion &&
    !/\b(temblai|temlabai|audumbar|famous|major|important|sacred|pilgrimage|historic|landmark)\b/i.test(text) &&
    !(isKolhapur && /\b(mahalaxmi|mahalakshmi|ambabai|jyotiba)\b/i.test(text))
  ) {
    return true;
  }

  if (!wantsReligion &&
    /\b(temple|mandir|ganapati|ganpati|datta mandir|dattatreya|place_of_worship)\b/i.test(text) &&
    !/\b(famous|major|important|historic|landmark|sacred|pilgrimage|audumbar|mahalaxmi|mahalakshmi|ambabai|jyotiba|basilica|cathedral|unesco|world heritage)\b/i.test(text)
  ) {
    return true;
  }

  if (/\b(on the way from [^.]{0,80}\bto\b|2\s*[-–]\s*3\s*hours?|two\s+to\s+three\s+hours?|80\s*km|90\s*km|100\s*km|120\s*km)\b/i.test(text)) {
    return true;
  }

  if (/\bmapped as a bridge or river-side landmark\b/i.test(text) &&
    !normalizeText(text).includes(normalizeText(destination))
  ) {
    return true;
  }

  if (/\b(monument|memorial)\b/i.test(place?.type ?? "") &&
    !/\b(famous|major|important|museum|landmark|samadhi|memorial museum)\b/i.test(text)
  ) {
    return true;
  }

  if (/\b(statue|putala)\b/i.test(text) &&
    !/\b(statue of unity|major landmark|iconic|famous|memorial museum)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}

function isUsableItineraryPlace(place, destination, interests = []) {
  const name = String(place?.name ?? "").trim();
  const text = `${name} ${place?.type ?? ""} ${place?.address ?? ""} ${place?.description ?? ""}`;

  if (!name || isDestinationOnlyName(name, destination)) {
    return false;
  }

  if (/\b(sacred trees?|flexible|rest block|central stay|verified nearby attraction)\b/i.test(text)) {
    return false;
  }

  if (isDishLikePlaceName(name)) {
    return false;
  }

  if (
    /\b(statue|putala)\b/i.test(text) &&
    !/\b(statue of unity|major landmark|iconic|famous|memorial museum)\b/i.test(text)
  ) {
    return false;
  }

  if (/\blocal green space, useful only as a light break\b/i.test(text)) {
    return false;
  }

  if (
    /\bmapped as a heritage stop\b/i.test(text) &&
    /\b(fort|castle|historic)\b/i.test(place?.type ?? "") &&
    !/\b(fort|castle|palace|museum|darbar|wada)\b/i.test(name)
  ) {
    return false;
  }

  if (isTechnicalOutdoorPlace(text, interests)) {
    return false;
  }

  return true;
}

function isPlaceInDestinationScope(place, scope) {
  if (!scope) {
    return true;
  }

  const zone = String(place?.zone ?? "");
  const text = `${place?.name ?? ""} ${place?.type ?? ""} ${place?.address ?? ""} ${place?.description ?? ""}`;

  if (scope.blockedZones?.some((blockedZone) => sameNormalizedPlace(zone, blockedZone))) {
    return false;
  }

  if (scope.allowedZones?.some((allowedZone) => sameNormalizedPlace(zone, allowedZone))) {
    return true;
  }

  if (scope.exclude?.test(text)) {
    return false;
  }

  return scope.include?.test(text) ?? true;
}

function isDestinationOnlyName(name, destination) {
  const normalizedName = normalizeText(name);
  const destinationParts = String(destination ?? "")
    .split(",")
    .map((part) => normalizeText(part))
    .filter(Boolean);
  const normalizedDestination = normalizeText(destination);

  if (!normalizedName) {
    return true;
  }

  if (normalizedName === normalizedDestination || destinationParts.includes(normalizedName)) {
    return true;
  }

  const hasSpecificSignal = /\b(temple|fort|palace|museum|lake|beach|market|park|garden|waterfall|falls|viewpoint|pass|valley|cave|promenade|castle|hot spring|road|street|bridge|ghat|monastery|sanctuary|wildlife)\b/i.test(name);

  return !hasSpecificSignal && (
    normalizedDestination.includes(normalizedName) ||
    destinationParts.some((part) => normalizedName.includes(part) || part.includes(normalizedName))
  );
}

function isTechnicalOutdoorPlace(text, interests = []) {
  const wantsTrekking = interests.some((interest) =>
    /\b(trek|trekking|hike|hiking|adventure|mountain|peak|summit)\b/i.test(String(interest)),
  );

  if (wantsTrekking) {
    return false;
  }

  const hasTechnicalName = /\b(tibba|deo tibba|hanuman tibba|indrasan|shikar beh|summit|technical peak)\b/i.test(text);
  const hasEasyVisitorSignal = /\b(viewpoint|view point|pass|valley|lake|temple|market|waterfall|falls|park|garden|hot spring|museum|castle|fort|promenade|road|street)\b/i.test(text);

  return hasTechnicalName && !hasEasyVisitorSignal;
}

function ensurePlaceCoverage({ placeList }) {
  const seen = new Set();

  return placeList.filter((place) => {
    const normalized = normalizeText(place.name);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function buildDayTitle({ index, daysCount, dayPlaces, destination }) {
  const primary = dayPlaces[0];
  const theme = getDayTheme(dayPlaces);

  if (!primary) {
    return `Verified places unavailable for ${destination}`;
  }

  if (index === 0) {
    return `Arrival, ${theme.label}, and ${shortPlaceName(primary.name)}`;
  }

  if (index === daysCount - 1) {
    return `Easy close around ${shortPlaceName(primary.name)}`;
  }

  return `${theme.title} around ${shortPlaceName(primary.name)}`;
}

function buildDayDescription({ index, daysCount, dayPlaces, destination }) {
  const names = dayPlaces.map((place) => place.name);
  const theme = getDayTheme(dayPlaces);

  if (!dayPlaces.length) {
    return `No verified place data was returned for ${destination}. Add a places API key, retry with internet access, or ask for a narrower area before building a day route.`;
  }

  if (index === 0) {
    return withDayPlaceIntro(
      `Keep arrival gentle: settle in, then cover ${formatPlaceList(names.slice(0, 2))} without turning the first day into a long transfer.`,
      dayPlaces,
    );
  }

  if (index === daysCount - 1) {
    return withDayPlaceIntro(
      `Use the final day for ${formatPlaceList(names.slice(0, 3))}, keeping lunch, shopping, and departure timing easy to adjust.`,
      dayPlaces,
    );
  }

  if (theme.key === "nature") {
    return withDayPlaceIntro(
      `Make this the outdoor day: start early for ${names[0]}, keep weather and daylight buffers, and avoid stacking far-apart mountain stops.`,
      dayPlaces,
    );
  }

  if (theme.key === "coast") {
    return withDayPlaceIntro(
      `Keep this as a coastal day around ${formatPlaceList(names.slice(0, 3))}, with beach time, food breaks, and sunset kept close together.`,
      dayPlaces,
    );
  }

  if (theme.key === "heritage") {
    return withDayPlaceIntro(
      `Cluster the heritage stops around ${names[0]} so the day feels like a focused culture route instead of scattered sightseeing.`,
      dayPlaces,
    );
  }

  if (theme.key === "local") {
    return withDayPlaceIntro(
      `Keep this day neighborhood-led around ${destination}, with time for food, markets, and slow walking between nearby stops.`,
      dayPlaces,
    );
  }

  return withDayPlaceIntro(
    `Use this as a balanced sightseeing day for ${formatPlaceList(names.slice(0, 3))}, with enough buffer for food and local transit.`,
    dayPlaces,
  );
}

function withDayPlaceIntro(baseDescription, dayPlaces = []) {
  const intro = dayPlaces
    .slice(0, 3)
    .map((place) => `${place.name}: ${place.brief}`)
    .join(" ");

  return intro ? `${baseDescription} ${intro}` : baseDescription;
}

function buildDaySchedule({ index, daysCount, dayPlaces, destination }) {
  if (!dayPlaces.length) {
    return [
      {
        time: "Morning",
        activity: `No verified ${destination} stop is available for this block yet.`,
      },
      {
        time: "Afternoon",
        activity: "Retry after place sources are available instead of using a guessed attraction.",
      },
      {
        time: "Evening",
        activity: "Keep this unscheduled until the app has verified places for the destination.",
      },
    ];
  }

  const [primary, secondary, tertiary] = dayPlaces;
  const theme = getDayTheme(dayPlaces);
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
        activity: secondary
          ? `${actionVerb(primary)} ${primary.name}, then continue to ${secondary.name} if check-in and traffic timing are comfortable.`
          : `${actionVerb(primary)} ${primary.name} as the first easy stop after check-in.`,
      },
      {
        time: "Evening",
        activity: tertiary
          ? `${eveningVerb(tertiary)} ${tertiary.name}, then keep dinner close to your stay.`
          : `Try a local dinner in ${destination} and keep the night light.`,
      },
    ];
  }

  if (isLastDay) {
    return [
      {
        time: "Morning",
        activity: `${morningVerb(primary)} ${primary.name}${theme.key === "nature" ? " while light and weather are better" : ""}.`,
      },
      {
        time: "Afternoon",
        activity: secondary
          ? `${actionVerb(secondary)} ${secondary.name}, then keep time for lunch, shopping, or checkout tasks.`
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
      activity: `${morningVerb(primary)} ${primary.name}${theme.key === "nature" ? " before the route gets busy" : " while energy is highest"}.`,
    },
    {
      time: "Afternoon",
      activity: secondary
        ? `${actionVerb(secondary)} ${secondary.name}, grouping lunch and nearby stops instead of backtracking.`
        : "Use the afternoon for a nearby market, museum, or cafe.",
    },
    {
      time: "Evening",
      activity: tertiary
        ? `${eveningVerb(tertiary)} ${tertiary.name}, or swap it with dinner if the day runs long.`
        : `Return toward central ${destination} for dinner and a calmer evening.`,
    },
  ];
}

function getDayTheme(places = []) {
  const text = places.map((place) => `${place.name ?? ""} ${place.type ?? ""}`).join(" ").toLowerCase();
  const natureScore = countThemeMatches(text, /\b(valley|waterfall|falls|lake|park|garden|forest|sanctuary|wildlife|viewpoint|pass|hill|nature|river|ghat)\b/g);
  const heritageScore = countThemeMatches(text, /\b(fort|palace|castle|museum|heritage|monument|temple|mandir|shrine|dattatraya|church|dargah|monastery|cultural|culture)\b/g);
  const localScore = countThemeMatches(text, /\b(market|bazaar|food|cafe|street|mall road|old town|old-town|walkable|local)\b/g);

  if (/\b(beach|coast|promenade|sea)\b/.test(text)) {
    return { key: "coast", label: "beach time", title: "Beach and sunset day" };
  }

  if (heritageScore >= natureScore && heritageScore > 0) {
    return { key: "heritage", label: "heritage stops", title: "Heritage and culture day" };
  }

  if (natureScore > 0) {
    return { key: "nature", label: "outdoor time", title: "Nature and viewpoint day" };
  }

  if (localScore > 0) {
    return { key: "local", label: "local walk", title: "Markets and local-life day" };
  }

  return { key: "mixed", label: "nearby stops", title: "Balanced sightseeing day" };
}

function countThemeMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function actionVerb(place) {
  const text = `${place?.name ?? ""} ${place?.type ?? ""}`.toLowerCase();

  if (/\b(market|bazaar|food|cafe|street|mall road|old town|walkable)\b/.test(text)) {
    return "Walk through";
  }

  if (/\b(beach|coast|promenade)\b/.test(text)) {
    return "Spend time at";
  }

  if (/\b(valley|waterfall|falls|lake|park|garden|forest|viewpoint|pass|river|ghat)\b/.test(text)) {
    return "Use daylight for";
  }

  return "Visit";
}

function morningVerb(place) {
  const text = `${place?.name ?? ""} ${place?.type ?? ""}`.toLowerCase();

  if (/\b(valley|waterfall|falls|viewpoint|pass|forest|park|garden|lake)\b/.test(text)) {
    return "Start early for";
  }

  if (/\b(beach|coast)\b/.test(text)) {
    return "Begin at";
  }

  if (/\b(market|food|cafe|street|mall road)\b/.test(text)) {
    return "Begin with a relaxed walk around";
  }

  return "Begin with";
}

function eveningVerb(place) {
  const text = `${place?.name ?? ""} ${place?.type ?? ""}`.toLowerCase();

  if (/\b(market|food|cafe|street|mall road|old town|walkable)\b/.test(text)) {
    return "Keep the evening for";
  }

  if (/\b(beach|viewpoint|promenade|lake|river|ghat|park|garden)\b/.test(text)) {
    return "Use golden hour around";
  }

  return "End with";
}

function formatPlaceList(names = []) {
  if (names.length <= 1) {
    return names[0] ?? "nearby local stops";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function shortPlaceName(name = "") {
  return String(name)
    .replace(/\s*,\s*India$/i, "")
    .replace(/\s*,\s*Himachal Pradesh$/i, "")
    .trim();
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
  const placeCards = (placeInsight?.recommendations?.length
    ? placeInsight.recommendations.map((name) => ({ name, type: "recommendation" }))
    : places?.places ?? []
  ).map((place) => enrichItineraryPlace(place, { destination }));
  const answer = buildTravelAnswer({
    plan,
    weather,
    places,
    cost,
    travelGuide,
    placeInsight,
    placeCards,
  });

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
    places: placeCards,
    cost,
    flights: null,
    travelGuide,
    placeInsight,
    travelAnswer: answer,
    tips: answer.bullets,
  };
}

function buildTravelAnswer({ plan, weather, places, cost, travelGuide, placeInsight, placeCards = [] }) {
  const destination = plan.destination || "your destination";

  if (plan.intent === "place_info" || plan.intent === "seasonal_info") {
    const recommendationItems = (placeInsight?.recommendations ?? [])
      .slice(0, 6)
      .map((item) => enrichItineraryPlace(
        { name: item, type: placeInsight.season ? `${placeInsight.season} option` : "recommendation" },
        { destination },
      ));

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
      items: recommendationItems.map((place) => ({
        label: place.name,
        value: place.brief,
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
    const topPlaces = (placeCards.length ? placeCards : places?.places ?? []).slice(0, 6);

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
        value: place.brief || [place.type, place.rating ? `${place.rating}/5` : ""].filter(Boolean).join(" - "),
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

DESTINATION_BRIEF:
${structuredPlan.destinationBrief ?? ""}

Write only a compact response for the chat bubble.
Do not repeat the full itinerary, cost breakdown, weather paragraph, or places list because the UI renders those as cards.
Format:
Ready: [2 short sentences. First describe the destination and why these places fit. Second confirm the trip length and pace.]

- Route: [mention the day themes and top 2-3 places]
- Place notes:
  - [Place name]: [one short intro explaining what it is famous for]
  - [Repeat for every place used in the visible day plan, up to 10 places]
- Budget/weather: [one compact sentence with total cost and weather range]
- Next: [one practical next action]
`;
}

function findToolResult(toolResults, name) {
  return toolResults.find((toolResult) => toolResult.name === name)?.result ?? null;
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
  const overview = [structuredPlan.summary, structuredPlan.destinationBrief]
    .filter(Boolean)
    .join(" ");
  const note = reason ? ` ${reason}` : "";
  const placeNoteLines = buildPlaceNoteLines(structuredPlan);

  return [
    `Ready: ${overview}${note}`,
    "",
    `- Route: ${structuredPlan.days.map((day) => day.title).join(" -> ")}.`,
    ...(placeNoteLines.length
      ? [
          "- Place notes:",
          ...placeNoteLines.map((line) => `  - ${line}`),
        ]
      : []),
    `- Budget/weather: ${structuredPlan.cost?.formattedTotal ?? "Cost estimate ready"} with ${weatherRange} conditions.`,
    `- Next: Start with ${topPlaces || structuredPlan.destination} and keep one buffer slot each day.`,
  ].join("\n");
}

function buildPlaceNoteLines(structuredPlan) {
  const seen = new Set();
  const places = (structuredPlan.days ?? [])
    .flatMap((day) => day.places ?? [])
    .filter((place) => {
      const normalized = normalizeText(place.name);

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });

  return places.slice(0, 10).map((place) => {
    const brief = place.brief || buildPlaceBrief({
      name: place.name,
      type: place.type,
      destination: structuredPlan.destination,
      famousFor: place.famousFor,
    });
    const bestTime = place.bestTime ? ` Best time: ${place.bestTime}` : "";
    const visitDuration = place.visitDuration ? ` Time needed: ${place.visitDuration}` : "";

    return `${place.name}: ${brief}${bestTime}${visitDuration}`;
  });
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

    if (providerMessage?.includes("User location is not supported")) {
      return "The selected AI provider is unavailable from this region. The app used live tools and the backend planner instead.";
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

    if (rawMessage.includes("User location is not supported")) {
      return "The selected AI provider is unavailable from this region. The app used live tools and the backend planner instead.";
    }
  }

  return `Provider error: ${rawMessage}`;
}
