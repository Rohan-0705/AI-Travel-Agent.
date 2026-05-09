import { resolveTravelDestination } from "./destinationResolver.js";

export async function getPlaceInsight({
  city = "",
  place = "",
  season = "",
  question = "",
}) {
  const normalizedSeason = cleanSeason(season || question);
  const target = cleanTarget(place) || extractPlaceFromQuestion(question, city) || cleanTarget(city);
  const resolved = target
    ? await resolveTravelDestination(target).catch(() => null)
    : null;
  const searchTitles = buildSearchTitles({
    target,
    city,
    resolved,
    season: normalizedSeason,
  });
  const summary = await fetchBestWikipediaSummary(searchTitles)
    .catch(() => null) ??
    await searchWikipediaSummary({
      target,
      city,
      season: normalizedSeason,
    }).catch(() => null);

  if (!summary) {
    return buildUnavailableInsight({
      city,
      target,
      season: normalizedSeason,
    });
  }

  return buildLiveInsight({
    summary,
    city,
    target,
    resolved,
    season: normalizedSeason,
  });
}

function buildSearchTitles({ target, city, resolved, season }) {
  return [
    target,
    resolved?.name,
    [target, city].filter(Boolean).join(", "),
    season ? [target, season, city].filter(Boolean).join(" ") : "",
  ].filter(Boolean);
}

async function searchWikipediaSummary({ target, city, season }) {
  const query = [
    target,
    city && !sameNormalized(target, city) ? city : "",
    season,
    "India travel",
  ].filter(Boolean).join(" ");
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("srlimit", "8");
  searchUrl.searchParams.set("srsearch", query);

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia place search failed: ${response.status}`);
  }

  const data = await response.json();
  const title = (data.query?.search ?? [])
    .filter((result) => !/\b(disambiguation|list of|category:)\b/i.test(result.title))
    .map((result) => ({
      title: result.title,
      score: titleScore(result.title, target),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.title;

  return title ? fetchWikipediaSummary(title) : null;
}

async function fetchBestWikipediaSummary(titles = []) {
  for (const title of [...new Set(titles.filter(Boolean))]) {
    const summary = await fetchWikipediaSummary(title).catch(() => null);

    if (isUsableWikipediaSummary(summary)) {
      return summary;
    }
  }

  return null;
}

async function fetchWikipediaSummary(title) {
  const summaryUrl = new URL(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  );
  const response = await fetch(summaryUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia place summary failed: ${response.status}`);
  }

  return response.json();
}

function buildLiveInsight({
  summary,
  city = "",
  target = "",
  resolved = null,
  season = "",
}) {
  const title = summary.title || target || city;
  const readableSummary = trimSummary(summary.extract);
  const displayCity =
    extractIndianCityFromSummary(summary.extract) ||
    cleanDisplay(resolved?.locality) ||
    cleanDisplay(city);

  return {
    source: "Wikipedia live place summary",
    city: displayCity,
    place: title,
    season,
    label: title,
    summary: season
      ? `${readableSummary} For ${season}, verify access, weather, and road conditions before adding it to the route.`
      : readableSummary,
    bestFor: inferBestFor(`${title} ${summary.extract}`),
    tips: [
      "Check current opening hours, access rules, and recent reviews before going.",
      "Keep it in the same route cluster as nearby attractions to avoid wasted travel time.",
      "Use daylight hours for heritage, hill, water, or nature spots.",
    ],
    recommendations: [],
  };
}

function buildUnavailableInsight({ city = "", target = "", season = "" }) {
  const label = target || city || "Travel place";

  return {
    source: "No verified live place insight",
    city,
    place: target,
    season,
    label,
    summary: `I could not verify reliable live place data for ${label}. I will not create a made-up description for it.`,
    bestFor: [],
    tips: [
      "Try a more specific place name or nearby city.",
      "Add/verify live API keys if this destination should resolve automatically.",
      "Use recent map reviews before adding this stop to an itinerary.",
    ],
    recommendations: [],
  };
}

function extractPlaceFromQuestion(question = "", city = "") {
  const text = String(question ?? "")
    .replace(/[?.!]+$/g, "")
    .trim();
  const patterns = [
    /^\s*([a-zA-Z][a-zA-Z\s.'-]+?)\s+(?:tell me about|tell me|describe|explain|details?|info|location)\b/i,
    /\b(?:tell me about|about|what is|where is)\s+([a-zA-Z][a-zA-Z\s.'-]+?)(?:\s+in\s+|\s+near\s+|\s+for\s+|\s+during\s+|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern)?.[1]?.trim();

    if (match && !sameNormalized(match, city)) {
      return cleanTarget(match);
    }
  }

  return "";
}

function cleanSeason(value = "") {
  const text = String(value ?? "").toLowerCase();

  if (/\b(monsoon|rainy|rain|rains|water\s*falls?|waterfalls?)\b/.test(text)) {
    return "monsoon";
  }

  if (/\b(winter|cold|december|january|february)\b/.test(text)) {
    return "winter";
  }

  if (/\b(summer|hot|april|may)\b/.test(text)) {
    return "summer";
  }

  return "";
}

function cleanTarget(value = "") {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDisplay(value = "") {
  return cleanTarget(value).replace(/\s*,\s*India$/i, "");
}

function isUsableWikipediaSummary(summary) {
  return Boolean(summary?.extract) && summary.type !== "disambiguation";
}

function trimSummary(value = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= 520) {
    return text;
  }

  return `${text.slice(0, 520).replace(/\s+\S*$/, "")}.`;
}

function inferBestFor(value = "") {
  const text = String(value ?? "").toLowerCase();
  const tags = [];

  if (/\b(sunset|viewpoint|promenade|sea|coast|beach)\b/.test(text)) {
    tags.push("views");
  }

  if (/\b(fort|palace|museum|heritage|historic|monument|temple|church|mosque|cave)\b/.test(text)) {
    tags.push("heritage");
  }

  if (/\b(wildlife|sanctuary|forest|national park|river|waterfall|lake|nature|hill|ghat)\b/.test(text)) {
    tags.push("nature");
  }

  if (/\b(rafting|trek|hike|adventure|kayak|canoe)\b/.test(text)) {
    tags.push("adventure");
  }

  if (/\b(market|food|restaurant|cafe|shopping)\b/.test(text)) {
    tags.push("local food");
  }

  return tags.length ? [...new Set(tags)] : ["local context"];
}

function titleScore(title = "", target = "") {
  const normalizedTitle = normalizeKey(title);
  const normalizedTarget = normalizeKey(target);
  const targetTokens = splitWords(target);
  const titleTokens = splitWords(title);

  if (!normalizedTitle || !normalizedTarget) {
    return 0;
  }

  if (normalizedTitle === normalizedTarget) {
    return 100;
  }

  if (normalizedTitle.includes(normalizedTarget) || normalizedTarget.includes(normalizedTitle)) {
    return 70;
  }

  return targetTokens.filter((token) => titleTokens.includes(token)).length * 16;
}

function extractIndianCityFromSummary(extract = "") {
  const match = String(extract).match(
    /\bin\s+([A-Z][A-Za-z .'-]{2,42}?),\s*(?:[A-Z][A-Za-z .'-]{2,42},\s*)?India\b/,
  );
  const city = match?.[1]?.replace(/\b(the|district|state|city)\b/gi, "").trim();

  return city && city.length <= 42 ? city : "";
}

function sameNormalized(a = "", b = "") {
  const normalizedA = normalizeKey(a);
  const normalizedB = normalizeKey(b);

  return Boolean(normalizedA && normalizedB && normalizedA === normalizedB);
}

function splitWords(value = "") {
  return String(value ?? "")
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g) ?? [];
}

function normalizeKey(value = "") {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
