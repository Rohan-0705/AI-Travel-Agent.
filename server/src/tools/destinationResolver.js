const resolverCache = new Map();

const destinationAliases = {
  banglore: "Bangalore",
  benglore: "Bangalore",
  bengalore: "Bangalore",
  hydrabad: "Hyderabad",
  hyderbad: "Hyderabad",
  hyderabd: "Hyderabad",
  mahisur: "Mysore",
  mahisuru: "Mysore",
  maisur: "Mysore",
  maisuru: "Mysore",
  mysur: "Mysore",
  mysor: "Mysore",
  sagli: "Sangli",
  sanglii: "Sangli",
  sangliii: "Sangli",
  solapoor: "Solapur",
  sholapur: "Solapur",
  nasik: "Nashik",
  nashik: "Nashik",
  ooty: "Ooty",
  udhagamandalam: "Ooty",
  go: "Goa",
  goa: "Goa",
};

const preferredDisplayNames = {
  bangalore: "Bangalore",
  bengaluru: "Bangalore",
  bombay: "Mumbai",
  mumbai: "Mumbai",
  mysore: "Mysore",
  mysuru: "Mysore",
  ooty: "Ooty",
  udhagamandalam: "Ooty",
  goa: "Goa",
  nashik: "Nashik",
  nasik: "Nashik",
};

export async function resolveTravelDestination(input, options = {}) {
  const raw = cleanInput(input);

  if (!raw) {
    return null;
  }

  const cacheKey = `${normalizeName(raw)}:${options.allowNonIndia ? "world" : "india"}`;

  if (resolverCache.has(cacheKey)) {
    return resolverCache.get(cacheKey);
  }

  const aliasQuery = applyDestinationAlias(raw);
  const primaryCandidates = [
    ...(await geocodeOpenWeatherCandidates(aliasQuery).catch(() => [])),
    ...(aliasQuery === raw ? [] : await geocodeOpenWeatherCandidates(raw).catch(() => [])),
    ...(await geocodeWikipediaCandidates(aliasQuery).catch(() => [])),
  ];
  const primaryBest = pickBestCandidate({
    raw,
    query: aliasQuery,
    candidates: primaryCandidates,
    allowNonIndia: Boolean(options.allowNonIndia),
  });
  const candidates = primaryBest?.score >= 65
    ? primaryCandidates
    : [
        ...primaryCandidates,
        ...(await geocodeNominatimCandidates(`${aliasQuery}, India`).catch(() => [])),
        ...(aliasQuery === raw ? [] : await geocodeNominatimCandidates(`${raw}, India`).catch(() => [])),
      ];
  const best = pickBestCandidate({
    raw,
    query: aliasQuery,
    candidates,
    allowNonIndia: Boolean(options.allowNonIndia),
  });
  const resolved = best
    ? buildResolvedDestination({ raw, aliasQuery, candidate: best })
    : buildUnresolvedDestination(raw, aliasQuery);

  resolverCache.set(cacheKey, resolved);
  return resolved;
}

function buildResolvedDestination({ raw, aliasQuery, candidate }) {
  const candidateName = cleanDisplayName(candidate.name || candidate.locality || aliasQuery);
  const preferredName =
    preferredDisplayNames[normalizeName(aliasQuery)] ||
    preferredDisplayNames[normalizeName(candidateName)] ||
    candidateName;
  const locality = cleanDisplayName(candidate.locality || candidateName);
  const state = cleanDisplayName(candidate.state);
  const variants = buildVariants({
    raw,
    aliasQuery,
    name: preferredName,
    locality,
    state,
  });

  return {
    input: raw,
    query: aliasQuery,
    name: preferredName,
    locality,
    state,
    country: candidate.country || "IN",
    countryName: candidate.countryName || "India",
    coordinates: {
      lat: Number(candidate.lat),
      lon: Number(candidate.lon),
    },
    source: candidate.source,
    confidence: Math.round(candidate.score),
    variants,
  };
}

function buildUnresolvedDestination(raw, aliasQuery) {
  const name = cleanDisplayName(aliasQuery || raw);

  return {
    input: raw,
    query: aliasQuery,
    name,
    locality: name,
    state: "",
    country: "",
    countryName: "",
    coordinates: null,
    source: "Unresolved destination",
    confidence: 0,
    variants: buildVariants({ raw, aliasQuery, name }),
  };
}

async function geocodeOpenWeatherCandidates(query) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return [];
  }

  const url = new URL("https://api.openweathermap.org/geo/1.0/direct");
  url.searchParams.set("q", `${query},IN`);
  url.searchParams.set("limit", "5");
  url.searchParams.set("appid", apiKey);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenWeather destination lookup failed: ${response.status}`);
  }

  const results = await response.json();

  return (Array.isArray(results) ? results : []).map((result) => ({
    source: "OpenWeather Geocoding",
    name: result.name,
    locality: result.name,
    state: result.state,
    country: result.country,
    countryName: result.country === "IN" ? "India" : result.country,
    lat: Number(result.lat),
    lon: Number(result.lon),
    className: "place",
    type: "city",
    displayName: [result.name, result.state, result.country].filter(Boolean).join(", "),
    importance: 0.55,
  }));
}

async function geocodeNominatimCandidates(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("namedetails", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim destination lookup failed: ${response.status}`);
  }

  const results = await response.json();

  return (Array.isArray(results) ? results : []).map((result) => {
    const address = result.address ?? {};
    const localName = cleanDisplayName(
      result.namedetails?.name ||
        result.name ||
        String(result.display_name ?? "").split(",")[0],
    );
    const locality = cleanDisplayName(
      address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.municipality ||
        address.county ||
        address.state_district ||
        address.state ||
        localName,
    );

    return {
      source: "OpenStreetMap Nominatim",
      name: localName || locality,
      locality,
      state: address.state,
      country: String(address.country_code ?? "").toUpperCase(),
      countryName: address.country,
      lat: Number(result.lat),
      lon: Number(result.lon),
      className: result.class,
      type: result.type,
      displayName: result.display_name,
      importance: Number(result.importance) || 0,
    };
  });
}

async function geocodeWikipediaCandidates(query) {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("srlimit", "6");
  searchUrl.searchParams.set("srsearch", `${query} India`);

  const searchResponse = await fetch(searchUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!searchResponse.ok) {
    throw new Error(`Wikipedia destination search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const titles = (searchData.query?.search ?? [])
    .map((result) => result.title)
    .filter((title) => title && !/\b(disambiguation|list of|category:)\b/i.test(title))
    .slice(0, 4);

  if (!titles.length) {
    return [];
  }

  const pageUrl = new URL("https://en.wikipedia.org/w/api.php");
  pageUrl.searchParams.set("action", "query");
  pageUrl.searchParams.set("prop", "coordinates|pageprops");
  pageUrl.searchParams.set("format", "json");
  pageUrl.searchParams.set("redirects", "1");
  pageUrl.searchParams.set("colimit", "4");
  pageUrl.searchParams.set("titles", titles.join("|"));

  const pageResponse = await fetch(pageUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`Wikipedia destination coordinate lookup failed: ${pageResponse.status}`);
  }

  const pageData = await pageResponse.json();

  return Object.values(pageData.query?.pages ?? {})
    .filter((page) => page.coordinates?.[0] && !page.pageprops?.disambiguation)
    .map((page) => ({
      source: "Wikipedia Coordinates",
      name: page.title,
      locality: page.title,
      state: "",
      country: "IN",
      countryName: "India",
      lat: Number(page.coordinates[0].lat),
      lon: Number(page.coordinates[0].lon),
      className: "tourism",
      type: "landmark",
      displayName: `${page.title}, India`,
      importance: 0.6,
    }));
}

function pickBestCandidate({ raw, query, candidates, allowNonIndia }) {
  const scored = candidates
    .filter((candidate) => hasUsableCoordinates(candidate))
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate({ raw, query, candidate, allowNonIndia }),
    }))
    .filter((candidate) => candidate.score >= 25)
    .sort((a, b) => b.score - a.score);

  return scored[0] ?? null;
}

function scoreCandidate({ raw, query, candidate, allowNonIndia }) {
  const country = String(candidate.country ?? "").toUpperCase();
  const isIndia = country === "IN" || /india/i.test(candidate.countryName ?? candidate.displayName ?? "");
  const candidateName = candidate.name || candidate.locality || "";
  const normalizedRaw = normalizeName(raw);
  const normalizedQuery = normalizeName(query);
  const normalizedName = normalizeName(candidateName);
  const normalizedLocality = normalizeName(candidate.locality);
  const normalizedDisplay = normalizeName(candidate.displayName);
  let score = 0;

  if (!allowNonIndia && !isIndia) {
    return -100;
  }

  score += isIndia ? 35 : 0;
  score += nameSimilarityScore(normalizedQuery, normalizedName);
  score += nameSimilarityScore(normalizedRaw, normalizedName) * 0.7;
  score += nameSimilarityScore(normalizedQuery, normalizedLocality) * 0.75;

  if (normalizedDisplay.includes(normalizedQuery) || normalizedDisplay.includes(normalizedRaw)) {
    score += 18;
  }

  if (["city", "town", "village", "hamlet", "municipality", "suburb"].includes(candidate.type)) {
    score += 18;
  }

  if (["tourism", "historic", "natural", "leisure", "amenity"].includes(candidate.className)) {
    score += 14;
  }

  if (Number.isFinite(candidate.importance)) {
    score += Math.min(18, candidate.importance * 30);
  }

  return score;
}

function nameSimilarityScore(query, name) {
  if (!query || !name) {
    return 0;
  }

  if (query === name) {
    return 58;
  }

  if (name.includes(query) || query.includes(name)) {
    return 38;
  }

  const distance = editDistance(query, name);
  const allowedDistance = Math.max(1, Math.floor(Math.min(query.length, name.length) * 0.28));

  if (distance <= allowedDistance) {
    return 42 - distance * 6;
  }

  const queryTokens = splitTokens(query);
  const nameTokens = splitTokens(name);
  const commonTokens = queryTokens.filter((token) => nameTokens.includes(token)).length;

  return commonTokens ? commonTokens * 9 : 0;
}

function buildVariants({ raw, aliasQuery, name, locality, state }) {
  const variants = new Set([raw, aliasQuery, name, locality, state].filter(Boolean));
  const aliasMap = {
    Bangalore: ["Bengaluru"],
    Bengaluru: ["Bangalore"],
    Mumbai: ["Bombay"],
    Bombay: ["Mumbai"],
    Mysore: ["Mysuru"],
    Mysuru: ["Mysore"],
    Ooty: ["Udhagamandalam"],
    Udhagamandalam: ["Ooty"],
    Nashik: ["Nasik"],
    Nasik: ["Nashik"],
  };

  for (const variant of [...variants]) {
    const aliases = aliasMap[cleanDisplayName(variant)] ?? [];
    aliases.forEach((alias) => variants.add(alias));
  }

  return [...variants].filter(Boolean);
}

function applyDestinationAlias(value) {
  const normalized = normalizeName(value);
  const alias = destinationAliases[normalized];

  return alias || cleanDisplayName(value);
}

function hasUsableCoordinates(candidate) {
  return Number.isFinite(Number(candidate.lat)) && Number.isFinite(Number(candidate.lon));
}

function splitTokens(value) {
  return String(value ?? "").match(/[a-z0-9]{3,}/g) ?? [];
}

function cleanInput(value) {
  return String(value ?? "")
    .replace(/\b(?:plan|trip|itinerary)\b/gi, " ")
    .replace(/\b(?:for|to|in)\s+\d+\s*-?\s*(?:days?|nights?)\b/gi, " ")
    .replace(/\b\d+\s*-?\s*(?:days?|nights?|travelers?|people|persons?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDisplayName(value) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*India$/i, "")
    .trim();

  if (!text) {
    return "";
  }

  return text
    .split(/\s+/)
    .map((word) =>
      /^(of|and|the|de|da|di|du)$/i.test(word)
        ? word.toLowerCase()
        : word[0].toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function normalizeName(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
