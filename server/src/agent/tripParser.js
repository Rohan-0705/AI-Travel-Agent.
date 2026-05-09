const cityToIata = {
  delhi: "DEL",
  newdelhi: "DEL",
  mumbai: "BOM",
  bombay: "BOM",
  goa: "GOI",
  bengaluru: "BLR",
  bangalore: "BLR",
  chennai: "MAA",
  hyderabad: "HYD",
  kolkata: "CCU",
  pune: "PNQ",
  jaipur: "JAI",
  kochi: "COK",
  mysore: "MYQ",
  mysuru: "MYQ",
  kolhapur: "KLH",
  karad: "PNQ",
  nagpur: "NAG",
  nashik: "ISK",
  satara: "PNQ",
  sangli: "SLI",
  solapur: "SSE",
  miraj: "MRJ",
  paris: "PAR",
  london: "LON",
  tokyo: "TYO",
  kyoto: "OSA",
  reykjavik: "REK",
};

const cityAliases = {
  sagli: "sangli",
  sanglii: "sangli",
  sangliii: "sangli",
  mumbaii: "mumbai",
  mumbaai: "mumbai",
  bombai: "mumbai",
  goaa: "goa",
  goaaa: "goa",
  punee: "pune",
  poona: "pune",
  hydrabad: "hyderabad",
  hyderbad: "hyderabad",
  hyderabd: "hyderabad",
  benglore: "bangalore",
  bengalore: "bangalore",
  mahisur: "mysore",
  mahisuru: "mysore",
  maisur: "mysore",
  maisuru: "mysore",
  mysur: "mysore",
  mysor: "mysore",
  delhii: "delhi",
  jaipurr: "jaipur",
  banglore: "bangalore",
  karsd: "karad",
  kard: "karad",
  karadd: "karad",
  satra: "satara",
  sataraa: "satara",
  kolhapr: "kolhapur",
  nasik: "nashik",
  solapoor: "solapur",
  sholapur: "solapur",
};

const knownCityNames = [...new Set([
  ...Object.keys(cityToIata),
  ...Object.values(cityAliases),
])];

export function extractTripDetails(message, tripContext = {}) {
  const normalizedMessage = normalizeUserMessage(message);
  const lower = normalizedMessage.toLowerCase();
  const rawLower = String(message ?? "").toLowerCase();
  let intent = extractIntent(lower, rawLower);
  const season = extractSeason(lower);
  const days = Number(lower.match(/(\d+)\s*-?\s*(?:day|days|night|nights)/)?.[1]) || tripContext.days || 3;
  const travelers =
    Number(lower.match(/(\d+)\s*(?:traveler|travelers|people|person|adults?)/)?.[1]) ||
    tripContext.travelers ||
    2;
  const extractedDestination = extractDestination(normalizedMessage);
  const destination =
    extractedDestination ||
    tripContext.destination ||
    tripContext.name ||
    "Goa";
  const place = extractPlaceName(normalizedMessage, destination);
  if (intent === "travel_advice" && place) {
    intent = "place_info";
  }
  if (
    intent === "travel_advice" &&
    !place &&
    isBareDestinationPlanRequest({
      message: normalizedMessage,
      extractedDestination,
      destination,
      tripContext,
    })
  ) {
    intent = "trip_plan";
  }
  const origin = extractOrigin(normalizedMessage);
  const topic = extractTopic(lower);
  const interests = intent === "food_info" ? ["food", "restaurants", "local cuisine"] : extractInterests(lower);
  const dates = extractDates(normalizedMessage, tripContext.dates);
  const budgetStyle = lower.includes("luxury") || lower.includes("premium")
    ? "premium"
    : lower.includes("cheap") || lower.includes("budget") || lower.includes("affordable")
      ? "budget"
      : "balanced";

  const tools = getToolsForIntent({
    intent,
    destination,
    dates,
    interests,
    days,
    travelers,
    budgetStyle,
    topic,
    question: normalizedMessage,
    place,
    season,
  });

  if ((origin || lower.includes("flight") || lower.includes("fly")) && intent === "trip_plan") {
    tools.push({
      name: "searchFlights",
      reason: "The user mentioned flights or an origin city.",
      args: {
        origin: toIata(origin),
        destination: toIata(destination),
        departureDate: extractIsoDate(normalizedMessage),
        returnDate: "",
        travelers,
      },
    });
  }

  return {
    intent,
    topic,
    destination,
    destinationIsExplicit: Boolean(extractedDestination),
    origin,
    days,
    travelers,
    dates,
    budgetStyle,
    interests,
    place,
    season,
    question: normalizedMessage,
    tools,
  };
}

function getToolsForIntent({
  intent,
  destination,
  dates,
  interests,
  days,
  travelers,
  budgetStyle,
  topic,
  question,
  place,
  season,
}) {
  if (intent === "place_info" || intent === "seasonal_info") {
    return [
      {
        name: "getPlaceInsight",
        reason: intent === "seasonal_info"
          ? "The user asked for season-aware travel guidance."
          : "The user asked about a specific place.",
        args: { city: destination, place, season, question },
      },
    ];
  }

  if (intent === "food_info") {
    return [
        {
          name: "getFoodGuide",
          reason: "The user asked about local food, not a full itinerary.",
          args: { city: destination, interests },
        },
      ];
  }

  if (intent === "weather_info") {
    return [
      {
        name: "getWeather",
        reason: "The user asked about weather or packing conditions.",
        args: { city: destination, dates },
      },
      {
        name: "getTravelGuide",
        reason: "Packing and timing advice makes weather useful for travelers.",
        args: { city: destination, topic: "packing", question },
      },
    ];
  }

  if (intent === "places_info") {
    return [
      {
        name: "getPlaces",
        reason: "The user asked for places, attractions, or sightseeing ideas.",
        args: { city: destination, interests },
      },
    ];
  }

  if (intent === "budget_info") {
    return [
      {
        name: "estimateCost",
        reason: "The user asked about travel budget or expected cost.",
        args: { city: destination, days, travelers, budgetStyle },
      },
    ];
  }

  if (intent === "travel_advice") {
    return [
      {
        name: "getTravelGuide",
        reason: "The user asked a direct travel question that needs practical guidance.",
        args: { city: destination, topic, question },
      },
    ];
  }

  return [
    {
      name: "getWeather",
      reason: "Weather affects daily routing and packing advice.",
      args: { city: destination, dates },
    },
    {
      name: "getPlaces",
      reason: "Places are required to build a useful itinerary.",
      args: { city: destination, interests },
    },
    {
      name: "estimateCost",
      reason: "A budget estimate helps compare the plan with constraints.",
      args: { city: destination, days, travelers, budgetStyle },
    },
  ];
}

function normalizeUserMessage(message) {
  return normalizeCityAliasesInText(String(message ?? ""))
    .replace(/\bpaln\b/gi, "plan")
    .replace(/\bpln\b/gi, "plan")
    .replace(/^\s*plan\s+(?:a\s+)?([a-zA-Z][a-zA-Z\s-]+?)\s+trip\b/gi, "$1")
    .replace(/^\s*plan\s+for\s+/gi, "")
    .replace(/^\s*plan\s+in\s+/gi, "")
    .replace(/^\s*plan\s+to\s+/gi, "")
    .replace(/^\s*plan\s+(?:a\s+)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePlan(planned, fallback) {
  const rawTools = fallback.intent !== "trip_plan"
    ? fallback.tools
    : Array.isArray(planned?.tools) && planned.tools.length > 0
    ? planned.tools
    : fallback.tools;

  const cleanPlan = {
    intent: fallback.intent,
    topic: fallback.topic ?? "general",
    destination: chooseDestination(
      planned?.destination,
      fallback.destination,
      fallback.destinationIsExplicit,
    ),
    origin: cleanString(planned?.origin) || fallback.origin,
    days: Number(planned?.days) || fallback.days,
    travelers: Number(planned?.travelers) || fallback.travelers,
    dates: cleanString(planned?.dates) || fallback.dates,
    budgetStyle: cleanBudgetStyle(planned?.budgetStyle) || fallback.budgetStyle,
    place: cleanString(planned?.place) || fallback.place || "",
    season: cleanString(planned?.season) || fallback.season || "",
    interests: Array.isArray(planned?.interests) && planned.interests.length > 0
      ? planned.interests.map(String)
      : fallback.interests,
  };

  cleanPlan.tools = rawTools
    .filter((toolCall) =>
      ["getWeather", "getPlaces", "estimateCost", "searchFlights", "getFoodGuide", "getTravelGuide", "getPlaceInsight"].includes(toolCall.name),
    )
    .map((toolCall) => ({
      name: toolCall.name,
      reason: cleanString(toolCall.reason) || "Needed for travel planning.",
      args: {
        ...toolCall.args,
        city: shouldUseDestinationCity(toolCall.name)
          ? cleanPlan.destination
          : toolCall.args?.city || cleanPlan.destination,
        destination: toolCall.name === "searchFlights"
          ? toIata(cleanPlan.destination)
          : toolCall.args?.destination || toIata(cleanPlan.destination),
        days: Number(toolCall.args?.days) || cleanPlan.days,
        travelers: Number(toolCall.args?.travelers) || cleanPlan.travelers,
        dates: toolCall.args?.dates || cleanPlan.dates,
        budgetStyle: toolCall.args?.budgetStyle || cleanPlan.budgetStyle,
        interests: toolCall.args?.interests || cleanPlan.interests,
        topic: toolCall.args?.topic || cleanPlan.topic,
        question: toolCall.args?.question || fallback.question,
        place: toolCall.args?.place || fallback.place,
        season: toolCall.args?.season || fallback.season,
      },
    }));

  return cleanPlan;
}

function chooseDestination(plannedDestination, fallbackDestination, fallbackIsExplicit = false) {
  const planned = cleanString(plannedDestination);
  const fallback = cleanString(fallbackDestination);

  if (fallbackIsExplicit && fallback && !isBadDestination(fallback)) {
    return fallback;
  }

  if (!planned || isBadDestination(planned)) {
    return fallback || "Goa";
  }

  if (fallback && isKnownDestination(fallback) && !sameDestination(planned, fallback)) {
    return fallback;
  }

  return planned;
}

function shouldUseDestinationCity(toolName) {
  return [
    "getWeather",
    "getPlaces",
    "estimateCost",
    "getFoodGuide",
    "getTravelGuide",
    "getPlaceInsight",
  ].includes(toolName);
}

function isBadDestination(value) {
  const normalized = value.toLowerCase().replace(/[^a-z\s]/g, "").trim();

  return (
    /^(plan|plan a|plan the|trip|itinerary|destination|your destination)$/.test(normalized) ||
    /\b(plan|itinerary)\b/.test(normalized)
  );
}

function isKnownDestination(value) {
  const normalized = normalizeName(value);

  return Object.keys(cityToIata).some((city) => normalized.includes(normalizeName(city)));
}

function sameDestination(a, b) {
  const normalizedA = normalizeName(a);
  const normalizedB = normalizeName(b);

  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
}

function extractIntent(lower, rawLower = lower) {
  const asksForTrip = /\b(plan|trip|itinerary|route)\b/.test(rawLower);
  const dayBasedTrip = /^([a-zA-Z][a-zA-Z\s-]+?)\s+(?:for\s+)?\d+\s*-?\s*(?:day|days|night|nights)\b/i.test(lower);
  const hasTripDuration = /\b\d+\s*-?\s*(?:day|days|night|nights)\b/i.test(lower);
  const asksForFood =
    /\b(food|foods|cuisine|eat|eating|dish|dishes|snack|snacks|restaurant|restaurants|taste)\b/.test(lower);
  const asksForWeather = /\b(weather|rain|temperature|hot|cold|climate|umbrella|pack|packing|clothes|wear)\b/.test(lower);
  const asksForPlaces = /\b(place|places|visit|attraction|attractions|spot|spots|sightseeing|see|market|beach|temple|fort|museum)\b/.test(lower);
  const asksSpecificPlace =
    /\b(tell me about|about|what is|where is|is .* worth|worth visiting|good to visit|specific place|place info)\b/.test(lower);
  const asksSeasonal =
    /\b(monsoon|mansoon|rainy|rain|winter|summer|water\s*falls?|waterfalls?|hill station|hillstation|hills)\b/.test(lower);
  const asksForBudget = /\b(budget|cost|price|expensive|cheap|affordable|spend|expense|money)\b/.test(lower);
  const asksForAdvice =
    /\b(travel|travelling|traveling|transport|commute|local train|bus|taxi|cab|auto|safe|safety|hotel|stay|stays|accommodation|where should|how should|best way|good for|worth)\b/.test(lower);

  if (
    asksForTrip ||
    dayBasedTrip ||
    (hasTripDuration && !asksSpecificPlace && !asksForWeather && !asksForFood && !asksForBudget)
  ) {
    return "trip_plan";
  }

  if (asksSeasonal && !asksForTrip) {
    return "seasonal_info";
  }

  if (asksSpecificPlace && !asksForTrip) {
    return "place_info";
  }

  if (asksForFood) {
    return "food_info";
  }

  if (asksForWeather) {
    return "weather_info";
  }

  if (asksForPlaces) {
    return "places_info";
  }

  if (asksForBudget) {
    return "budget_info";
  }

  if (asksForAdvice) {
    return "travel_advice";
  }

  return "travel_advice";
}

function extractTopic(lower) {
  if (/\b(transport|commute|local train|bus|taxi|cab|auto|metro|traveling|travelling|travel)\b/.test(lower)) {
    return "transport";
  }

  if (/\b(safe|safety|scam|solo|night|women|family)\b/.test(lower)) {
    return "safety";
  }

  if (/\b(hotel|stay|stays|accommodation|hostel|resort|area to stay|where to stay)\b/.test(lower)) {
    return "stays";
  }

  if (/\b(pack|packing|clothes|wear|umbrella|shoes)\b/.test(lower)) {
    return "packing";
  }

  return "general";
}

function isBareDestinationPlanRequest({
  message,
  extractedDestination,
  destination,
  tripContext = {},
}) {
  const cleanedMessage = String(message ?? "")
    .replace(/[?.!]+$/g, "")
    .trim();
  const wordCount = cleanedMessage.split(/\s+/).filter(Boolean).length;

  if (!cleanedMessage || wordCount > 4 || /\d/.test(cleanedMessage)) {
    return false;
  }

  const explicitDestination =
    Boolean(extractedDestination) ||
    isKnownDestination(cleanedMessage) ||
    isScopedDestination(cleanedMessage);

  if (!explicitDestination) {
    return false;
  }

  const sameAsDestination =
    sameDestination(cleanedMessage, destination) ||
    sameDestination(cleanDestination(cleanedMessage), destination);

  if (!sameAsDestination) {
    return false;
  }

  return hasTripPlanningContext(tripContext) || explicitDestination;
}

function hasTripPlanningContext(tripContext = {}) {
  return (
    Number(tripContext.days) > 1 ||
    Boolean(tripContext.selectedStartDate && tripContext.selectedEndDate) ||
    /\b\d+\s+itinerary\s+days?\b/i.test(String(tripContext.dates ?? ""))
  );
}

function extractSeason(lower) {
  if (/\b(monsoon|mansoon|rainy|rain|rains|water\s*falls?|waterfalls?)\b/.test(lower)) {
    return "monsoon";
  }

  if (/\b(winter|cold|december|january|february)\b/.test(lower)) {
    return "winter";
  }

  if (/\b(summer|hot|april|may)\b/.test(lower)) {
    return "summer";
  }

  return "";
}

function extractPlaceName(message, destination = "") {
  const patterns = [
    /^\s*([a-zA-Z][a-zA-Z\s-]+?)\s+(?:tell me about|tell me|show me|describe|explain|details?|info|location)\b/i,
    /\b(?:tell me about|about|what is|where is)\s+([a-zA-Z][a-zA-Z\s-]+?)(?:\s+in\s+|\s+near\s+|\s+for\s+|\s+during\s+|$)/i,
    /\bis\s+([a-zA-Z][a-zA-Z\s-]+?)\s+(?:worth|good|safe|open|better)\b/i,
    /\b(?:visit|see)\s+([a-zA-Z][a-zA-Z\s-]+?)\s+(?:in|near|during|for|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();

    if (match && !isGenericPlaceReference(match) && !sameDestination(match, destination)) {
      return titleCase(cleanDestination(match));
    }
  }

  const bareCandidate = String(message).replace(/[?.!]+$/g, "").trim();

  if (looksLikeBarePlaceName(bareCandidate, destination)) {
    return titleCase(bareCandidate);
  }

  const cleaned = cleanDestination(message);

  if (looksLikeBarePlaceName(cleaned, destination)) {
    return titleCase(cleaned);
  }

  return "";
}

function isGenericPlaceReference(value = "") {
  return /^(this|this place|this location|this spot|that|that place|that location|there|location|place|spot)$/i.test(
    String(value).trim(),
  );
}

function looksLikeBarePlaceName(value = "", destination = "") {
  const cleaned = String(value).trim();
  const normalized = normalizeName(cleaned);
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

  if (
    !cleaned ||
    cleaned.length < 4 ||
    wordCount > 5 ||
    /\d/.test(cleaned) ||
    sameDestination(cleaned, destination) ||
    knownCityNames.includes(normalized)
  ) {
    return false;
  }

  return !/^(ok|okay|yes|no|thanks|thank you|hi|hello|new chat|save trip|export|route|budget|weather|food|places|plan|trip|itinerary)$/i.test(cleaned);
}

function extractDestination(message) {
  const patterns = [
    /^\s*\d+\s*-?\s*(?:days|day|nights|night)\s+(?:for|to|in)\s+([a-zA-Z][a-zA-Z\s-]+?)(?:\s+will|\s+would|\s+should|\s+is|\s+are|\s+be|\s+locally|\s+local|\s+next|\s+for|\s+from|\s+with|\s+under|\s+\d|$)/i,
    /\bplan\s+(?:a\s+)?(?:\d+\s*-?\s*(?:day|days|night|nights)\s+)?(?:plan|trip|itinerary)\s+(?:for|to|in)\s+([a-zA-Z][a-zA-Z\s-]+?)(?:\s+will|\s+would|\s+should|\s+is|\s+are|\s+be|\s+locally|\s+local|\s+next|\s+for|\s+from|\s+with|\s+under|\s+\d|$)/i,
    /\b(?:food|foods|cuisine|weather|places?|attractions?|budget|cost|transport|travel|travelling|traveling|stay|stays|safety|safe)\s+(?:of|in|for)\s+([a-zA-Z][a-zA-Z\s-]+?)(?:\s+will|\s+would|\s+should|\s+is|\s+are|\s+be|\s+locally|\s+local|\s+next|\s+for|\s+from|\s+with|\s+under|\s+\d|$)/i,
    /\bin\s+([a-zA-Z][a-zA-Z\s-]+?)(?:\s+will|\s+would|\s+should|\s+is|\s+are|\s+be|\s+locally|\s+local|\s+next|\s+for|\s+from|\s+with|\s+under|\s+\d|$)/i,
    /\bfor\s+([a-zA-Z][a-zA-Z\s-]+?)(?:\s+will|\s+would|\s+should|\s+is|\s+are|\s+be|\s+locally|\s+local|\s+next|\s+for|\s+from|\s+with|\s+under|\s+\d|$)/i,
    /\bto\s+(?!visit\b|see\b|eat\b|travel\b|stay\b)([a-zA-Z][a-zA-Z\s-]+?)(?:\s+will|\s+would|\s+should|\s+is|\s+are|\s+be|\s+locally|\s+local|\s+next|\s+for|\s+from|\s+with|\s+under|\s+in\s+\d|$)/i,
    /\btrip\s+(?:for|to)\s+([a-zA-Z][a-zA-Z\s-]+)/i,
    /^([a-zA-Z][a-zA-Z\s-]+?)\s+(?:for\s+)?\d+\s*-?\s*(?:day|days|night|nights)\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();

    if (match) {
      return titleCase(resolveCityAlias(cleanDestination(match)));
    }
  }

  const bareDestination = extractBareDestination(message);

  if (bareDestination) {
    return titleCase(resolveCityAlias(bareDestination));
  }

  const compactMessage = message.toLowerCase().replace(/\s+/g, "");
  const knownCity = Object.keys(cityToIata).find((city) => {
    const compactCity = city.replace(/\s+/g, "");

    return (
      new RegExp(`\\b${city}\\b`, "i").test(message) ||
      compactMessage.includes(compactCity)
    );
  });

  if (knownCity) {
    return titleCase(knownCity);
  }

  return "";
}

function extractBareDestination(message = "") {
  const cleaned = String(message ?? "")
    .replace(/[?.!]+$/g, "")
    .trim();
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

  if (
    !cleaned ||
    wordCount > 4 ||
    /\d/.test(cleaned) ||
    /[^a-zA-Z\s-]/.test(cleaned) ||
    /\b(food|foods|cuisine|weather|places?|attractions?|budget|cost|transport|travel|travelling|traveling|stay|stays|safety|safe|tell|about|where|what|how|should)\b/i.test(cleaned)
  ) {
    return "";
  }

  return cleanDestination(cleaned);
}

function cleanDestination(value) {
  const cleaned = String(value ?? "")
    .replace(/^\s*(?:plan|trip|itinerary)\s+(?:a\s+)?/i, "")
    .replace(/\b(next week|next month|locally|local|for|from|with|under)\b.*$/i, "")
    .replace(/\b(will|would|should|is|are|be)\b.*$/i, "")
    .replace(/\b\d+\s*-?\s*(day|days|night|nights|traveler|travelers|people|person|adults?)\b.*$/i, "")
    .trim();

  return resolveCityAlias(cleaned);
}

function extractOrigin(message) {
  const match = message.match(/\bfrom\s+([a-zA-Z][a-zA-Z\s-]+?)\s+(?:to|for)\b/i)?.[1];
  return match ? titleCase(match.trim()) : "";
}

function extractDates(message, fallbackDates = "") {
  const lower = message.toLowerCase();

  if (lower.includes("next week")) {
    return "next week";
  }

  if (lower.includes("next month")) {
    return "next month";
  }

  const isoDate = message.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0];
  const namedDate = message.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:\s*-\s*\d{1,2})?/i)?.[0];

  return isoDate ?? namedDate ?? (fallbackDates || "flexible dates");
}

function extractIsoDate(message) {
  return message.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] ?? "";
}

function extractInterests(lower) {
  const interestMap = {
    beach: ["beaches", "sunset"],
    beaches: ["beaches", "sunset"],
    food: ["food", "restaurants"],
    market: ["markets", "shopping"],
    history: ["heritage", "museums"],
    fort: ["forts", "heritage"],
    nature: ["nature", "viewpoints"],
    adventure: ["adventure", "outdoors"],
    temple: ["temples", "culture"],
    monsoon: ["monsoon", "waterfalls", "nature", "greenery"],
    mansoon: ["monsoon", "waterfalls", "nature", "greenery"],
    rainy: ["monsoon", "waterfalls", "nature", "greenery"],
    waterfall: ["waterfalls", "nature"],
    waterfalls: ["waterfalls", "nature"],
    "water fall": ["waterfalls", "nature"],
    "water falls": ["waterfalls", "nature"],
    winter: ["winter", "hill stations", "forts", "viewpoints"],
    hill: ["hill stations", "viewpoints"],
  };

  const interests = Object.entries(interestMap)
    .filter(([keyword]) => lower.includes(keyword))
    .flatMap(([, values]) => values);

  return [...new Set(interests.length ? interests : ["attractions", "food", "local culture"])];
}

function toIata(value = "") {
  const normalized = resolveCityAlias(value).toLowerCase().replace(/[^a-z]/g, "");
  return cityToIata[normalized] ?? value.toUpperCase().slice(0, 3);
}

function normalizeName(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeCityAliasesInText(value) {
  return Object.entries(cityAliases).reduce(
    (current, [alias, city]) =>
      current.replace(new RegExp(`\\b${alias}\\b`, "gi"), city),
    value,
  );
}

function resolveCityAlias(value = "") {
  if (isScopedDestination(value)) {
    return value;
  }

  const normalized = normalizeName(value);
  const alias = cityAliases[normalized];

  if (alias) {
    return alias;
  }

  const exactCity = knownCityNames.find((city) => normalizeName(city) === normalized);

  if (exactCity) {
    return exactCity;
  }

  const containedCity = knownCityNames.find((city) =>
    normalized.includes(normalizeName(city)),
  );

  if (containedCity) {
    return containedCity;
  }

  const closestCity = getClosestKnownCity(normalized);

  return closestCity || value;
}

function isScopedDestination(value = "") {
  return /\b(north|south|old)\s+goa\b/i.test(value) || /\b(panjim|panaji)\b/i.test(value);
}

function getClosestKnownCity(normalizedValue) {
  if (!normalizedValue || normalizedValue.length < 4) {
    return "";
  }

  const nearest = knownCityNames
    .map((city) => ({
      city,
      distance: editDistance(normalizedValue, normalizeName(city)),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  const allowedDistance = 1;

  return nearest?.distance <= allowedDistance ? nearest.city : "";
}

function editDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );

  for (let index = 0; index <= a.length; index += 1) {
    matrix[index][0] = index;
  }

  for (let index = 0; index <= b.length; index += 1) {
    matrix[0][index] = index;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanBudgetStyle(value) {
  return ["budget", "balanced", "premium"].includes(value) ? value : "";
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
