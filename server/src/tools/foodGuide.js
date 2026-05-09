import { getProvider } from "../agent/providers.js";
import { resolveTravelDestination } from "./destinationResolver.js";

export async function getFoodGuide({ city, interests = [] }) {
  const destination = String(city ?? "this destination").trim() || "this destination";
  const resolved = await resolveTravelDestination(destination).catch(() => null);
  const liveFoodContext = await getWikivoyageFoodContext({
    destination,
    resolved,
  }).catch(() => null);
  const generatedGuide = await generateFoodGuideWithProvider({
    destination,
    resolved,
    interests,
    liveFoodContext,
  }).catch((error) => ({
    error: error?.message ?? "Food guide provider failed.",
  }));

  return normalizeFoodGuide({
    generatedGuide,
    destination,
    resolved,
    liveFoodContext,
  });
}

async function generateFoodGuideWithProvider({
  destination,
  resolved,
  interests,
  liveFoodContext,
}) {
  const provider = getProvider();

  if (provider.name === "mock") {
    return null;
  }

  return provider.generateJson({
    system: [
      "You are a food-focused travel guide inside a travel-planning app.",
      "Return only valid JSON.",
      "Use the destination, resolved geography, and any live Wikivoyage food context.",
      "Do not use app-side stored city food profiles, fixed city tables, or placeholder advice.",
      "Do not invent exact restaurant names if you are not confident.",
      "Must-try items must be dishes, meal types, sweets, drinks, or food experiences, not instructions like 'ask locals'.",
      "Eating areas should be real neighborhoods/markets/route clusters when you know them; otherwise use practical area types tied to the city, such as old city, central market, beach belt, station area, or stay cluster.",
      "If the live context is thin, use general culinary knowledge for the region and say so in sourceNote.",
    ].join("\n"),
    user: JSON.stringify({
      destination,
      resolvedDestination: {
        name: resolved?.name ?? "",
        locality: resolved?.locality ?? "",
        state: resolved?.state ?? "",
        countryName: resolved?.countryName ?? "",
        confidence: resolved?.confidence ?? 0,
      },
      interests,
      liveFoodContext: liveFoodContext?.text ?? "",
      requiredSchema: {
        source: "short source label",
        sourceNote: "one honest sentence about whether live food context was available",
        style: "2-3 sentence overview of the destination's local food identity",
        mustTry: ["5-8 destination-relevant dishes or food experiences"],
        areas: ["3-5 useful eating areas or clusters"],
        tips: ["3-5 practical tips"],
        budget: "one sentence budget estimate in INR for casual local food",
      },
    }),
  });
}

async function getWikivoyageFoodContext({ destination, resolved }) {
  const titles = [
    destination,
    resolved?.name,
    resolved?.locality,
    ...(resolved?.variants ?? []),
  ]
    .filter(Boolean)
    .map((title) => String(title).trim())
    .filter(Boolean);
  const uniqueTitles = [...new Set(titles)].slice(0, 5);

  for (const title of uniqueTitles) {
    const content = await fetchWikivoyagePage(title).catch(() => "");
    const foodSection = extractWikivoyageSections(content, ["Buy", "Eat", "Drink"]);

    if (foodSection) {
      return {
        source: "Wikivoyage food sections",
        title,
        text: cleanWikiText(foodSection).slice(0, 3500),
      };
    }
  }

  return null;
}

async function fetchWikivoyagePage(title) {
  const wikiUrl = new URL("https://en.wikivoyage.org/w/api.php");
  wikiUrl.searchParams.set("action", "query");
  wikiUrl.searchParams.set("prop", "revisions");
  wikiUrl.searchParams.set("rvprop", "content");
  wikiUrl.searchParams.set("rvslots", "main");
  wikiUrl.searchParams.set("redirects", "1");
  wikiUrl.searchParams.set("titles", title);
  wikiUrl.searchParams.set("format", "json");

  const response = await fetch(wikiUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikivoyage food context failed: ${response.status}`);
  }

  const data = await response.json();
  const page = Object.values(data.query?.pages ?? {})[0];

  if (!page || page.missing) {
    return "";
  }

  return page.revisions?.[0]?.slots?.main?.["*"] ?? "";
}

function extractWikivoyageSections(content, sectionNames) {
  const normalizedTargets = new Set(sectionNames.map(normalizeName));
  const lines = String(content ?? "").split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^(=+)\s*([^=]+?)\s*\1\s*$/);

    if (heading) {
      const level = heading[1].length;
      const title = normalizeName(heading[2]);

      if (current && level <= current.level) {
        sections.push(current.lines.join("\n"));
        current = null;
      }

      if (normalizedTargets.has(title)) {
        current = {
          level,
          lines: [],
        };
      }

      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    sections.push(current.lines.join("\n"));
  }

  return sections
    .map((section) => section.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeFoodGuide({
  generatedGuide,
  destination,
  resolved,
  liveFoodContext,
}) {
  const city = resolved?.locality || resolved?.name || destination;

  if (isUsableGuide(generatedGuide)) {
    return {
      source: cleanString(generatedGuide.source) || "AI generated food guide",
      sourceNote:
        cleanString(generatedGuide.sourceNote) ||
        (liveFoodContext
          ? `Uses live ${liveFoodContext.source} for ${liveFoodContext.title}.`
          : "Generated from the configured AI provider and destination context."),
      city,
      state: resolved?.state || "",
      style: cleanString(generatedGuide.style),
      mustTry: cleanStringArray(generatedGuide.mustTry).slice(0, 8),
      areas: cleanStringArray(generatedGuide.areas).slice(0, 5),
      tips: cleanStringArray(generatedGuide.tips).slice(0, 5),
      budget: cleanString(generatedGuide.budget),
    };
  }

  return {
    source: liveFoodContext ? "Wikivoyage food context fallback" : "Food guide unavailable",
    sourceNote: generatedGuide?.error
      ? summarizeProviderError(generatedGuide.error)
      : "The configured AI provider was unavailable for this food guide.",
    city,
    state: resolved?.state || "",
    style: buildLiveContextStyle(city, liveFoodContext),
    mustTry: liveFoodContext ? extractFoodLikePhrases(liveFoodContext.text).slice(0, 8) : [],
    areas: liveFoodContext ? extractAreaLikePhrases(liveFoodContext.text).slice(0, 5) : [],
    tips: [
      "Check recent reviews and opening hours before choosing a restaurant.",
      "Prefer busy places with visible turnover for snacks and casual meals.",
      "Keep dinner close to your stay if the day includes long transit.",
    ],
    budget: "Use recent restaurant menus to estimate the budget; casual Indian city meals often vary widely by neighborhood and dining style.",
  };
}

function isUsableGuide(value) {
  return (
    value &&
    typeof value === "object" &&
    cleanString(value.style).length >= 80 &&
    cleanStringArray(value.mustTry).length >= 4 &&
    cleanStringArray(value.areas).length >= 2 &&
    cleanString(value.budget).length >= 20 &&
    !isPlaceholderGuide(value)
  );
}

function isPlaceholderGuide(value) {
  const combined = [
    value.style,
    ...(Array.isArray(value.mustTry) ? value.mustTry : []),
    ...(Array.isArray(value.areas) ? value.areas : []),
    value.budget,
  ]
    .map((item) => String(item ?? "").toLowerCase())
    .join(" ");

  return /\b(placeholder|ask locals|ask for the current|regional thali from a busy|do not have a verified)\b/.test(
    combined,
  );
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(cleanString)
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function extractFoodLikePhrases(text) {
  return [
    ...extractNamedFoodItems(text),
    ...extractReadablePhrases(text)
      .filter((phrase) =>
        /\b(food|cuisine|restaurant|cafe|meal|dish|snack|sweet|tea|coffee|bar|drink|thali|fish|rice|bread|curry|seafood|vegetarian)\b/i.test(
          phrase,
        ),
      )
      .map((phrase) => phrase.replace(/^[-*]\s*/, ""))
      .filter((phrase) => phrase.length <= 95)
      .filter((phrase) => !/\b(hotel|restaurant|cafe|jail|prison|escaped|lunch|dinner)\b/i.test(phrase))
      .filter((phrase) => !/\bfrom\b.+\b(road|yard|market)\b/i.test(phrase)),
  ]
    .map(shortenFoodPhrase)
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function extractNamedFoodItems(text) {
  const cleanText = cleanWikiText(text);
  const candidates = [];

  for (const match of cleanText.matchAll(/\b([A-Z][A-Za-z][A-Za-z\s-]{1,42}?)\s+is\s+(?:the\s+)?(?:favorite|favourite|popular|famous|known)\b/g)) {
    candidates.push(match[1].trim());
  }

  for (const match of cleanText.matchAll(/\b(?:delicacies|specialities|specialties|dishes|items)\s*[-:]\s*([^.;]+)/gi)) {
    const listText = match[1].split(/\s+-\s+/)[0];

    candidates.push(
      ...listText
        .split(/\s*,\s*|\s+and\s+|\s+etc\b/i)
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  for (const sentence of cleanText.split(/[.;]\s+/)) {
    if (!/\b(from|at|near)\b/i.test(sentence) || !/\b(food|grain|jaggery|turmeric|sweet|market|yard|restaurant|cafe)\b/i.test(sentence)) {
      continue;
    }

    const lead = sentence.split(/\bfrom\b|\bat\b|\bnear\b/i)[0];
    const items = lead
      .split(/\s*,\s*|\s+and\s+/)
      .map((item) => item.replace(/\b(buy|eat|drink|try|the|a|an)\b/gi, "").trim())
      .filter((item) => item.length >= 4 && item.length <= 45);

    candidates.push(...items);
  }

  return candidates
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => !/\b(hotel|restaurant|cafe|food grains?|near|from|beverages?|alcoholic|non-alcoholic|etc)\b/i.test(item));
}

function shortenFoodPhrase(value) {
  const phrase = String(value ?? "")
    .replace(/^\*+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!phrase || /\b(jail|prison|escaped|murder|police|arrest|he was|she was)\b/i.test(phrase)) {
    return "";
  }

  if (/^(based on|wide variety|wide-range|range of)\b/i.test(phrase)) {
    return "";
  }

  if (phrase.includes(",")) {
    const lead = phrase.split(",")[0].trim();

    if (lead.length >= 4 && lead.length <= 45) {
      return lead;
    }
  }

  return phrase;
}

function buildLiveContextStyle(city, liveFoodContext) {
  if (!liveFoodContext) {
    return `I could not generate a destination-specific food guide for ${city} because the AI provider/live food context was unavailable.`;
  }

  const foodItems = extractFoodLikePhrases(liveFoodContext.text).slice(0, 3);

  if (foodItems.length) {
    return `Food notes for ${city} are based on live Wikivoyage Buy/Eat/Drink context, which mentions ${foodItems.join(", ")}. Use this as a starting point, then confirm current restaurants with recent map reviews.`;
  }

  return `Food notes for ${city} are based on live Wikivoyage Buy/Eat/Drink context. Use the listed food areas as starting points, then confirm current restaurants with recent map reviews.`;
}

function summarizeProviderError(error) {
  const text = String(error ?? "");

  if (/quota|RESOURCE_EXHAUSTED|rate/i.test(text)) {
    return "The AI food guide provider hit a quota or rate limit, so live page context was used instead.";
  }

  if (/location is not supported|FAILED_PRECONDITION/i.test(text)) {
    return "The AI food guide provider is unavailable from this deployment region, so live page context was used instead.";
  }

  return "The AI food guide provider failed, so live page context was used instead.";
}

function extractReadablePhrases(text) {
  return cleanWikiText(text)
    .split(/[.;]\s+|\n+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= 8);
}

function extractAreaLikePhrases(text) {
  const namedAreas = extractNamedAreas(text);
  const genericAreas = namedAreas.length >= 2
    ? []
    : extractReadablePhrases(text)
        .filter((phrase) =>
          /\b(area|market|road|street|lane|beach|old|central|station|near|around|district|quarter|mall)\b/i.test(
            phrase,
          ),
        )
        .map((phrase) => phrase.replace(/^[-*]\s*/, ""))
        .filter((phrase) => phrase.length <= 90)
        .filter((phrase) => !/\b(favorite street food|jail|prison|escaped|police|arrest)\b/i.test(phrase));

  return [
    ...namedAreas,
    ...genericAreas,
  ].filter((item, index, items) => items.indexOf(item) === index);
}

function extractNamedAreas(text) {
  const cleanText = cleanWikiText(text);
  const areas = [];

  for (const match of cleanText.matchAll(/\b(?:near|at|from|around)\s+([A-Z][A-Za-z0-9\s,'-]{2,65})/g)) {
    areas.push(match[1].replace(/,\s*$/, "").trim());
  }

  return areas
    .filter((area) => area.length >= 5 && area.length <= 80)
    .filter((area) => !/\b(jail|prison|escaped|police|arrest)\b/i.test(area));
}

function cleanWikiText(value) {
  return String(value ?? "")
    .replace(/\[\[File:[^\]]+\]\]/gi, (match) => {
      const parts = match
        .slice(2, -2)
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      const caption = [...parts].reverse().find((part) =>
        !/^(thumb|thumbnail|left|right|center|upright|frameless|border|\d+px|file:)/i.test(part),
      );

      return caption ?? "";
    })
    .replace(/\{\{(?:eat|drink|listing|marker)\b/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\|\s*[a-zA-Z][a-zA-Z0-9_-]*\s*=/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanString(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
