import { resolveTravelDestination } from "./destinationResolver.js";

export async function getPlaces({ city, interests = [] }) {
  const resolvedDestination = await resolveTravelDestination(city).catch(() => null);
  const searchCity = resolvedDestination?.name || city;
  const searchVariants = resolvedDestination?.variants ?? [city];
  const coordinates = resolvedDestination?.coordinates ?? null;
  const resolvedAnchor = buildResolvedDestinationPlace(resolvedDestination);

  if (process.env.GOOGLE_PLACES_API_KEY) {
    const googlePlaces = await getGooglePlaces({ city: searchCity, interests });
    const rankedGooglePlaces = rankPlaceCards({
      city: searchCity,
      results: [googlePlaces],
      interests,
    });

    if (rankedGooglePlaces.places?.length) {
      return rankedGooglePlaces;
    }
  }

  let openTripMapPlaces = null;

  if (process.env.OPENTRIPMAP_API_KEY) {
    openTripMapPlaces = await getOpenTripMapPlaces({
      city: searchCity,
      interests,
      coordinates,
    }).catch(() => null);
  }

  const wikipediaPlaces = await getWikipediaAttractionList({
    city: searchCity,
    variants: searchVariants,
  }).catch(() => null);
  const wikiVoyagePlaces = await getWikivoyagePlaces({
    city: searchCity,
    variants: searchVariants,
  }).catch(() => null);
  const openStreetMapPlaces = await getOpenStreetMapPlaces({
    city: searchCity,
    interests,
    coordinates: openTripMapPlaces?.coordinates ?? coordinates,
  }).catch(() => null);

  const mergedLivePlaces = rankPlaceCards({
    city: searchCity,
    results: [resolvedAnchor, wikipediaPlaces, wikiVoyagePlaces, openTripMapPlaces, openStreetMapPlaces].filter(Boolean),
    interests,
  });

  if (mergedLivePlaces.places?.length) {
    return mergedLivePlaces;
  }

  return mockPlaces(searchCity, interests);
}

function buildResolvedDestinationPlace(resolvedDestination) {
  if (
    !resolvedDestination?.name ||
    !resolvedDestination?.coordinates ||
    !/wikipedia/i.test(resolvedDestination.source ?? "")
  ) {
    return null;
  }

  return {
    source: "Resolved destination landmark",
    city: resolvedDestination.name,
    places: [
      {
        name: resolvedDestination.name,
        address: [resolvedDestination.locality, resolvedDestination.state, "India"]
          .filter(Boolean)
          .join(", "),
        rating: 8,
        type: "landmark",
        location: {
          latitude: resolvedDestination.coordinates.lat,
          longitude: resolvedDestination.coordinates.lon,
        },
        sourceQuality: "referenced",
        url: "",
      },
    ],
  };
}

const mainAttractionKinds = [
  "historic",
  "cultural",
  "architecture",
  "museums",
  "natural",
  "urban_environment",
  "tourist_facilities",
  "amusements",
].join(",");

const landmarkKeywords = [
  "beach",
  "bird",
  "botanical",
  "cave",
  "castle",
  "caves",
  "cathedral",
  "dam",
  "dargah",
  "deekshabhoomi",
  "fort",
  "falls",
  "garden",
  "gateway",
  "ghat",
  "heritage",
  "hill",
  "gufa",
  "jyotirlinga",
  "kund",
  "peak",
  "pine",
  "lake",
  "marine",
  "market",
  "mahalaxmi",
  "monument",
  "museum",
  "palace",
  "park",
  "planetarium",
  "promenade",
  "ramkund",
  "river",
  "rose",
  "samadhi",
  "sanctuary",
  "station",
  "stupa",
  "tea",
  "temple",
  "tower",
  "vineyard",
  "vineyards",
  "view",
  "viewpoint",
  "waterfall",
  "winery",
  "wildlife",
  "zoo",
  "rankala",
  "jyotiba",
  "ambabai",
  "pritisingam",
  "agashiv",
  "sadashivgad",
  "vasantgad",
  "koyna",
  "chaphal",
  "kaas",
  "kas",
  "thoseghar",
  "ajinkyatara",
  "sajjangad",
  "chalkewadi",
  "satara",
  "natraj",
  "baramotichi",
  "shaniwar",
  "dagdusheth",
  "lal mahal",
  "aga khan",
  "kelkar",
  "pataleshwar",
  "sinhagad",
  "parvati",
  "saras baug",
  "okayama",
  "tulshibaug",
  "koregaon",
  "fc road",
  "vetal",
  "panshet",
  "mulshi",
];

const badPlaceNamePatterns = [
  /\baqua line\b/i,
  /canteen/i,
  /\bcity council\b/i,
  /\bcantonment\b/i,
  /\b(cinema|cinemas|cinepolis|cinemax|inox|multiplex|movie|film society)\b/i,
  /\bjunction\b/i,
  /\bhorse\s*back\s*riding\b/i,
  /hostel/i,
  /college/i,
  /\bcollector\b/i,
  /\bcorridor\b/i,
  /\bcourt\b/i,
  /\bdepot\b/i,
  /university/i,
  /department/i,
  /office/i,
  /bank/i,
  /atm/i,
  /hospital/i,
  /clinic/i,
  /lodging/i,
  /transport/i,
  /jail/i,
  /institute/i,
  /amphitheatre/i,
  /research/i,
  /club/i,
  /residence/i,
  /\bmetro\b/i,
  /\bmunicipal\b/i,
  /\bnorth south\b/i,
  /\borange line\b/i,
  /\bparking\b/i,
  /\bpolice\b/i,
  /\bpower\s*(house|station)?\b/i,
  /\bproposed\b/i,
  /\brailway line\b/i,
  /\bsubstation\b/i,
  /\bterminal\b/i,
  /\btraffic\b/i,
  /^mandir$/i,
  /^temple$/i,
  /^garden$/i,
];

const strongTouristPatterns = [
  /\b(unesco|heritage|fort|killa|castle|palace|wada)\b/i,
  /\b(museum|memorial|monument|samadhi|stupa|ashram)\b/i,
  /\b(cave|caves|leni|buddhist caves?)\b/i,
  /\b(temple|mandir|jyotirlinga|sacred|pilgrimage|gufa|kund|cathedral|basilica|church|mosque|dargah|synagogue)\b/i,
  /\b(lake|dam|river|ghat|waterfall|falls|backwater|sanctuary|wildlife|bird sanctuary)\b/i,
  /\b(hill|peak|viewpoint|view point|garden|park|zoo|botanical|rose garden|boat house|tea factory|pine forest|shooting point|echo rock|hidden valley)\b/i,
  /\b(beach|promenade|market|bazaar|vineyard|vineyards|winery|aquarium|planetarium)\b/i,
];

const weakTravelPatterns = [
  /\b(school|college|university|hostel|hospital|clinic|bank|atm|office|department|institute|research)\b/i,
  /\b(jail|prison|police|court|collector|municipal|council|corporation)\b/i,
  /\b(metro|corridor|proposed|orange line|aqua line|railway line|line\s+\d+|depot|terminal|parking|substation)\b/i,
  /\b(cinema|cinemas|cinepolis|cinemax|inox|multiplex|movie|junction|crossing|transport|traffic|residence|residential|apartment|society|lodging|canteen|club)\b/i,
];

async function getGooglePlaces({ city, interests }) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.types,places.location,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: `${interests.join(", ")} attractions and food in ${city}`,
      maxResultCount: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places request failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    source: "Google Places API Text Search New",
    city,
    places: (data.places ?? []).slice(0, 10).map((place) => ({
      name: place.displayName?.text ?? "Unnamed place",
      address: place.formattedAddress ?? "",
      rating: place.rating ?? null,
      type: place.types?.[0] ?? "point_of_interest",
      location: place.location ?? null,
      url: place.googleMapsUri ?? "",
    })),
  };
}

async function getOpenTripMapPlaces({ city, interests, coordinates = null }) {
  const key = process.env.OPENTRIPMAP_API_KEY;
  const geo = coordinates ?? await getOpenTripMapGeoname(city, key);

  if (!geo.lat || !geo.lon) {
    throw new Error(`OpenTripMap could not locate ${city}.`);
  }

  const radiusUrl = new URL("https://api.opentripmap.com/0.1/en/places/radius");
  radiusUrl.searchParams.set("radius", "30000");
  radiusUrl.searchParams.set("lat", geo.lat);
  radiusUrl.searchParams.set("lon", geo.lon);
  radiusUrl.searchParams.set("limit", "60");
  radiusUrl.searchParams.set("rate", "2");
  radiusUrl.searchParams.set("format", "json");
  radiusUrl.searchParams.set("kinds", mainAttractionKinds);
  radiusUrl.searchParams.set("apikey", key);

  const radiusResponse = await fetch(radiusUrl);

  if (!radiusResponse.ok) {
    throw new Error(`OpenTripMap radius request failed: ${radiusResponse.status}`);
  }

  const data = await radiusResponse.json();

  const places = rankAndCleanPlaces({
    city,
    rawPlaces: data,
    interests,
  });

  return {
    source: "OpenTripMap Places API",
    city,
    coordinates: {
      lat: geo.lat,
      lon: geo.lon,
    },
    places,
  };
}

async function getOpenTripMapGeoname(city, key) {
  const geoUrl = new URL("https://api.opentripmap.com/0.1/en/places/geoname");
  geoUrl.searchParams.set("name", city);
  geoUrl.searchParams.set("apikey", key);

  const geoResponse = await fetch(geoUrl);

  if (!geoResponse.ok) {
    throw new Error(`OpenTripMap geoname request failed: ${geoResponse.status}`);
  }

  return geoResponse.json();
}

async function getOpenStreetMapPlaces({ city, interests, coordinates = null }) {
  const resolvedCoordinates =
    coordinates ??
    await geocodeOpenWeather(city).catch(() => null) ??
    await geocodeOpenStreetMap(city);
  const lat = Number(resolvedCoordinates?.lat);
  const lon = Number(resolvedCoordinates?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`OpenStreetMap could not locate ${city}.`);
  }

  const radius = 45000;
  const query = `
    [out:json][timeout:14];
    (
      node(around:${radius},${lat},${lon})["tourism"~"attraction|museum|viewpoint|zoo|theme_park|artwork|gallery"];
      way(around:${radius},${lat},${lon})["tourism"~"attraction|museum|viewpoint|zoo|theme_park|artwork|gallery"];
      relation(around:${radius},${lat},${lon})["tourism"~"attraction|museum|viewpoint|zoo|theme_park|artwork|gallery"];
      node(around:${radius},${lat},${lon})["historic"];
      way(around:${radius},${lat},${lon})["historic"];
      relation(around:${radius},${lat},${lon})["historic"];
      node(around:${radius},${lat},${lon})["amenity"="place_of_worship"];
      way(around:${radius},${lat},${lon})["amenity"="place_of_worship"];
      relation(around:${radius},${lat},${lon})["amenity"="place_of_worship"];
      node(around:${radius},${lat},${lon})["leisure"~"park|garden|nature_reserve"];
      way(around:${radius},${lat},${lon})["leisure"~"park|garden|nature_reserve"];
      relation(around:${radius},${lat},${lon})["leisure"~"park|garden|nature_reserve"];
      node(around:${radius},${lat},${lon})["natural"~"peak|waterfall|spring|water"];
      way(around:${radius},${lat},${lon})["natural"~"peak|waterfall|spring|water"];
      relation(around:${radius},${lat},${lon})["natural"~"peak|waterfall|spring|water"];
      node(around:${radius},${lat},${lon})["water"="lake"];
      way(around:${radius},${lat},${lon})["water"="lake"];
      relation(around:${radius},${lat},${lon})["water"="lake"];
      node(around:${radius},${lat},${lon})["landuse"="vineyard"];
      way(around:${radius},${lat},${lon})["landuse"="vineyard"];
      relation(around:${radius},${lat},${lon})["landuse"="vineyard"];
    );
    out center tags 80;
  `;

  const overpassResponse = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "AI-Travel-Planner/1.0 local development",
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!overpassResponse.ok) {
    throw new Error(`OpenStreetMap Overpass request failed: ${overpassResponse.status}`);
  }

  const data = await overpassResponse.json();
  const places = rankAndCleanOsmPlaces({
    city,
    rawPlaces: data.elements ?? [],
    interests,
    origin: { lat, lon },
  });

  return {
    source: "OpenStreetMap Overpass API",
    city,
    places,
  };
}

async function getWikivoyagePlaces({ city, variants = [] }) {
  const titlesToTry = [...new Set([city, ...variants].filter(Boolean))];

  for (const title of titlesToTry) {
    const result = await fetchWikivoyagePlaces(title).catch(() => null);

    if (result?.places?.length) {
      return {
        ...result,
        city,
      };
    }
  }

  throw new Error(`Wikivoyage could not locate ${city}.`);
}

async function fetchWikivoyagePlaces(title) {
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
    throw new Error(`Wikivoyage request failed: ${response.status}`);
  }

  const data = await response.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  const content = page?.revisions?.[0]?.slots?.main?.["*"] ?? "";

  if (!content || page?.missing) {
    throw new Error(`Wikivoyage could not locate ${title}.`);
  }

  const places = parseWikivoyageListings(content)
    .filter((place) => place.name && !isBadPlaceName(place.name))
    .slice(0, 35);

  return {
    source: "Wikivoyage Travel Guide",
    city: page.title ?? title,
    places,
  };
}

async function getWikipediaAttractionList({ city, variants = [] }) {
  const title = await findWikipediaAttractionListTitle(city, variants);

  if (!title) {
    throw new Error(`Wikipedia could not find an attraction list for ${city}.`);
  }

  const wikiUrl = new URL("https://en.wikipedia.org/w/api.php");
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
    throw new Error(`Wikipedia attraction list request failed: ${response.status}`);
  }

  const data = await response.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  const content = page?.revisions?.[0]?.slots?.main?.["*"] ?? "";
  const places = parseWikipediaAttractionList(content)
    .filter((place) => place.name && !isBadPlaceName(place.name))
    .slice(0, 35);

  if (!places.length) {
    throw new Error(`Wikipedia attraction list had no usable places for ${city}.`);
  }

  return {
    source: "Wikipedia Attraction List",
    city,
    places,
  };
}

async function findWikipediaAttractionListTitle(city, variants = []) {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("srlimit", "6");
  searchUrl.searchParams.set("srsearch", `List of tourist attractions in ${city}`);

  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia attraction search failed: ${response.status}`);
  }

  const data = await response.json();
  const results = data.query?.search ?? [];
  const title = results.find((result) =>
    /^list of tourist attractions in\b/i.test(result.title) &&
    attractionListTitleMatchesCity(result.title, city, variants),
  )?.title;

  return title ?? "";
}

function attractionListTitleMatchesCity(title, city, variants = []) {
  const normalizedTitle = normalizeName(title);

  return getCityNameVariants(city, variants).some((variant) =>
    normalizedTitle.includes(normalizeName(variant)),
  );
}

function getCityNameVariants(city, extraVariants = []) {
  const normalizedCity = normalizeName(city);
  const variants = new Set([city, ...extraVariants].filter(Boolean));
  const aliasMap = {
    bangalore: ["Bengaluru"],
    bengaluru: ["Bangalore"],
    bombay: ["Mumbai"],
    mumbai: ["Bombay"],
    ooty: ["Udhagamandalam"],
    udhagamandalam: ["Ooty"],
    mysore: ["Mysuru"],
    mysuru: ["Mysore"],
  };

  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (normalizedCity.includes(key)) {
      aliases.forEach((alias) => variants.add(alias));
    }
  }

  return [...variants];
}

async function geocodeOpenWeather(city) {
  if (!process.env.OPENWEATHER_API_KEY) {
    return null;
  }

  const geoUrl = new URL("https://api.openweathermap.org/geo/1.0/direct");
  geoUrl.searchParams.set("q", `${city},IN`);
  geoUrl.searchParams.set("limit", "1");
  geoUrl.searchParams.set("appid", process.env.OPENWEATHER_API_KEY);

  const response = await fetch(geoUrl);

  if (!response.ok) {
    throw new Error(`OpenWeather geocode request failed: ${response.status}`);
  }

  const [geo] = await response.json();

  return {
    lat: Number(geo?.lat),
    lon: Number(geo?.lon),
  };
}

async function geocodeOpenStreetMap(city) {
  const geoUrl = new URL("https://nominatim.openstreetmap.org/search");
  geoUrl.searchParams.set("format", "jsonv2");
  geoUrl.searchParams.set("limit", "1");
  geoUrl.searchParams.set("countrycodes", "in");
  geoUrl.searchParams.set("q", `${city}, India`);

  const geoResponse = await fetch(geoUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!geoResponse.ok) {
    throw new Error(`OpenStreetMap geocode request failed: ${geoResponse.status}`);
  }

  const [geo] = await geoResponse.json();

  return {
    lat: Number(geo?.lat),
    lon: Number(geo?.lon),
  };
}

function rankAndCleanPlaces({ city, rawPlaces, interests }) {
  const wantsReligion = interests.some((interest) =>
    ["religion", "temple", "temples", "spiritual", "church", "mosque"].includes(
      String(interest).toLowerCase(),
    ),
  );
  const seen = new Set();
  const ranked = rawPlaces
    .filter((place) => place.name && !isBadPlaceName(place.name))
    .map((place) => ({
      raw: place,
      normalizedName: normalizeName(place.name),
      score: scorePlace(place, wantsReligion),
    }))
    .filter(({ raw, normalizedName, score }) => {
      if (seen.has(normalizedName) || score < 20) {
        return false;
      }

      seen.add(normalizedName);
      return !isLowPriorityReligiousPlace(raw, wantsReligion);
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ raw }) => toPlaceCard(raw));

  return addCityHighlights(city, ranked, interests).slice(0, 10);
}

function scorePlace(place, wantsReligion) {
  const kinds = String(place.kinds ?? "").toLowerCase();
  const name = String(place.name ?? "").toLowerCase();
  const text = `${name} ${kinds}`;
  const rateScore = Number(place.rate ?? 0) * 12;
  const landmarkKindScore = [
    "monuments",
    "fortifications",
    "museums",
    "interesting_places",
    "historic",
    "architecture",
    "gardens_and_parks",
    "beaches",
    "urban_environment",
  ].some((kind) => kinds.includes(kind))
    ? 14
    : 0;
  const qualityScore =
    touristSignalScore(text) +
    genericTouristKeywordScore(text) +
    travelImportanceScore(text);
  const weakPenalty = weakTravelPenalty(text);
  const genericNamePenalty = isGenericWeakName(name) ? -18 : 0;
  const religiousPenalty =
    !wantsReligion && /church|religion|monasteries|synagogues/.test(kinds)
      ? -28
      : 0;

  return rateScore + landmarkKindScore + qualityScore + weakPenalty + genericNamePenalty + religiousPenalty;
}

function isLowPriorityReligiousPlace(place, wantsReligion) {
  if (wantsReligion) {
    return false;
  }

  const kinds = String(place.kinds ?? "").toLowerCase();
  const name = String(place.name ?? "").toLowerCase();

  return (
    /church|religion|monasteries|synagogues/.test(kinds) &&
    !/temple|mosque|cathedral|basilica|dargah|synagogue/.test(name) &&
    Number(place.rate ?? 0) < 5
  );
}

function isBadPlaceName(name) {
  return badPlaceNamePatterns.some((pattern) => pattern.test(String(name ?? "")));
}

function touristSignalScore(text) {
  return strongTouristPatterns.reduce(
    (score, pattern) => score + (pattern.test(text) ? 18 : 0),
    0,
  );
}

function genericTouristKeywordScore(text) {
  const matchedKeywords = landmarkKeywords.filter((keyword) =>
    text.includes(keyword),
  ).length;

  return Math.min(30, matchedKeywords * 8);
}

function weakTravelPenalty(text) {
  return weakTravelPatterns.reduce(
    (score, pattern) => score + (pattern.test(text) ? -35 : 0),
    0,
  );
}

function travelImportanceScore(text) {
  let score = 0;

  if (/\b(number one attraction|top attraction|most visited|must visit|must-see|must see|most sacred|important temple|landmark|popular place to visit|tourists|devotees|pilgrimage)\b/i.test(text)) {
    score += 28;
  }

  if (/\b(one of the\s+\d+|unesco|world heritage|well known|famous|major)\b/i.test(text)) {
    score += 18;
  }

  if (/\bsacred\b/i.test(text)) {
    score += 18;
  }

  return score;
}

function hillStationSignalScore(text) {
  let score = 0;

  if (/\b(botanical garden|rose gardens?|boat house|lake|tea factory)\b/i.test(text)) {
    score += 72;
  }

  if (/\b(peak|pine forest|shooting point|echo rock|hidden valley|valley|waterfall|falls)\b/i.test(text)) {
    score += 46;
  }

  if (/\b(hills?|hill station|mountain|view|viewpoint|national park|garden|forest)\b/i.test(text)) {
    score += 42;
  }

  return score;
}

function lowPriorityReligiousPenalty(text, wantsReligion) {
  if (wantsReligion || !/\b(temple|mandir|church|cathedral|mosque|dargah|place_of_worship|spiritual)\b/i.test(text)) {
    return 0;
  }

  if (/\b(jyotirlinga|mecca masjid|basilica|cathedral|unesco|world heritage|famous|major|important|landmark)\b/i.test(text)) {
    return 0;
  }

  return -110;
}

function isGenericWeakName(name) {
  const normalized = String(name ?? "").trim().toLowerCase();

  return (
    normalized.length < 4 ||
    /^(garden|park|temple|mandir|church|mosque|museum|fort|lake|market)$/i.test(normalized) ||
    /^(line|route|corridor)\s*\d*$/i.test(normalized)
  );
}

function toPlaceCard(place) {
  return {
    name: place.name,
    address: "",
    rating: place.rate ?? null,
    type: place.kinds?.split(",")?.[0] ?? "point_of_interest",
    location: {
      latitude: place.point?.lat,
      longitude: place.point?.lon,
    },
    url: `https://opentripmap.com/en/card/${place.xid}`,
  };
}

function rankPlaceCards({ city, results, interests = [] }) {
  const seen = new Set();
  const liveSources = results.filter((result) => result?.places?.length);
  const sorted = liveSources
    .flatMap((result) =>
      result.places.map((place, index) => ({
        place,
        source: result.source,
        index,
      })),
    )
    .filter(({ place }) => place?.name && !isBadPlaceName(place.name))
    .map(({ place, source, index }) => ({
      place,
      source,
      normalizedName: normalizeName(place.name),
      score: scorePlaceCard(place, source, index, interests, city),
    }))
    .filter(({ normalizedName, score }) => {
      if (isDuplicateNormalizedName(normalizedName, seen) || score < 18) {
        return false;
      }

      seen.add(normalizedName);
      return true;
    })
    .sort((a, b) => b.score - a.score);
  const hasNatureDepth = sorted.filter(({ place }) =>
    hillStationSignalScore(placeSearchText(place)) > 0,
  ).length >= 5;
  const ranked = sorted
    .filter(({ place }) =>
      !shouldDropLowPriorityReligiousCard(place, interests, hasNatureDepth),
    )
    .slice(0, 12)
    .map(({ place }) => place);

  const places = addCityHighlights(city, ranked, interests).slice(0, 10);

  return {
    source: liveSources.map((result) => result.source).join(" + ") || "Travel place APIs",
    city,
    places,
  };
}

function scorePlaceCard(place, source, index, interests = [], city = "") {
  const text = placeSearchText(place);
  const wantsReligion = wantsReligionInterest(interests);
  const sourceBonus = /google/i.test(source)
    ? 10
    : /wikipedia/i.test(source)
      ? 13
      : /wikivoyage/i.test(source)
      ? 9
      : /openstreetmap/i.test(source)
      ? 6
      : 4;
  const rankBonus = /wikipedia/i.test(source)
    ? Math.max(0, 140 - index * 6)
    : Math.max(0, 22 - index * 2);
  const rating = Number(place.rating);
  const ratingBonus = Number.isFinite(rating)
    ? Math.min(24, rating > 10 ? rating : rating * 2.5)
    : 0;
  const locationBonus = Number.isFinite(Number(place.location?.latitude ?? place.location?.lat))
    ? 2
    : 0;
  const referenceBonus = place.sourceQuality === "referenced" ? 12 : 0;

  return (
    sourceBonus +
    rankBonus +
    ratingBonus +
    locationBonus +
    referenceBonus +
    destinationNamedLandmarkScore(place.name, city) +
    hillStationSignalScore(`${place.name ?? ""} ${place.type ?? ""}`.toLowerCase()) +
    touristSignalScore(text) +
    genericTouristKeywordScore(text) +
    travelImportanceScore(text) +
    lowPriorityReligiousPenalty(text, wantsReligion) +
    weakTravelPenalty(text) +
    (isGenericWeakName(place.name) ? -18 : 0)
  );
}

function destinationNamedLandmarkScore(name, city) {
  const normalizedName = normalizeName(name);
  const normalizedCity = normalizeName(city);

  if (!normalizedCity || !normalizedName.includes(normalizedCity)) {
    return 0;
  }

  const directSignaturePattern = new RegExp(
    `^${normalizedCity}(palace|fort|zoo|lake|beach|hill|hills|peak|caves?|falls?)$`,
    "i",
  );

  if (directSignaturePattern.test(normalizedName)) {
    return 180;
  }

  if (/\b(palace|fort|zoo|lake|beach|hill|peak|caves?|falls?)\b/i.test(String(name ?? ""))) {
    return 90;
  }

  if (/\b(museum|garden|temple|market)\b/i.test(String(name ?? ""))) {
    return 10;
  }

  return 20;
}

function placeSearchText(place) {
  return `${place.name ?? ""} ${place.type ?? ""} ${place.address ?? ""} ${place.description ?? ""}`.toLowerCase();
}

function wantsReligionInterest(interests = []) {
  return interests.some((interest) =>
    ["religion", "temple", "temples", "spiritual", "church", "mosque"].includes(
      String(interest).toLowerCase(),
    ),
  );
}

function shouldDropLowPriorityReligiousCard(place, interests, hasNatureDepth) {
  if (!hasNatureDepth || wantsReligionInterest(interests)) {
    return false;
  }

  const text = placeSearchText(place);

  if (!/\b(temple|mandir|church|mosque|dargah|place_of_worship|spiritual)\b/i.test(text)) {
    return false;
  }

  return !/\b(jyotirlinga|mecca masjid|basilica|cathedral|unesco|world heritage)\b/i.test(
    String(place.name ?? ""),
  );
}

function isDuplicateNormalizedName(normalizedName, seen) {
  if (seen.has(normalizedName)) {
    return true;
  }

  return [...seen].some((existingName) =>
    normalizedName.length > 6 &&
    existingName.length > 6 &&
    (normalizedName.includes(existingName) || existingName.includes(normalizedName)),
  );
}

function parseWikivoyageListings(content) {
  return extractWikivoyageListingBlocks(content)
    .map((block) => parseWikivoyageListing(block))
    .filter(Boolean);
}

function parseWikipediaAttractionList(content) {
  const seen = new Set();
  const places = [];
  const bulletLines = String(content ?? "")
    .split(/\r?\n/)
    .filter((line) => /^\*\s*/.test(line));

  for (const line of bulletLines) {
    const name = extractLeadWikiLinkName(line);

    if (!name || shouldSkipWikipediaPlaceName(name)) {
      continue;
    }

    const normalizedName = normalizeName(name);

    if (seen.has(normalizedName)) {
      continue;
    }

    seen.add(normalizedName);
    places.push({
      name,
      address: "",
      rating: 8,
      type: inferPlaceType(`${name} ${line}`),
      description: cleanWikiText(line),
      sourceQuality: "referenced",
      location: null,
      url: "",
    });
  }

  return places;
}

function extractLeadWikiLinkName(line) {
  const match = line.match(/^\*\s*(?:''')?\s*\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
  const rawName = match?.[2] || match?.[1] || "";

  return cleanWikiText(rawName);
}

function shouldSkipWikipediaPlaceName(name) {
  const normalized = normalizeName(name);

  return (
    normalized.length < 4 ||
    /^(india|karnataka|maharashtra|tourism|bengaluru|bangalore)$/.test(normalized) ||
    /^(listof|tourismin)/.test(normalized) ||
    isBadPlaceName(name)
  );
}

function extractWikivoyageListingBlocks(content) {
  const blocks = [];
  const lines = String(content ?? "").split(/\r?\n/);
  let currentBlock = null;
  let braceDepth = 0;

  for (const line of lines) {
    if (!currentBlock && /^\*\s*\{\{(?:see|do)\b/i.test(line)) {
      currentBlock = [line];
      braceDepth = braceDelta(line);

      if (braceDepth <= 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = null;
      }

      continue;
    }

    if (currentBlock) {
      currentBlock.push(line);
      braceDepth += braceDelta(line);

      if (braceDepth <= 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = null;
      }
    }
  }

  return blocks;
}

function braceDelta(line) {
  return (line.match(/\{\{/g) ?? []).length - (line.match(/\}\}/g) ?? []).length;
}

function parseWikivoyageListing(block) {
  const fields = {};
  const fieldPattern = /\|\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*([\s\S]*?)(?=(?:\s*\|\s*[a-zA-Z][a-zA-Z0-9_-]*\s*=)|(?:\n\|\s*[a-zA-Z][a-zA-Z0-9_-]*\s*=)|(?:\n?\}\}))/g;

  for (const match of block.matchAll(fieldPattern)) {
    const key = match[1].toLowerCase();
    fields[key] = match[2].trim();
  }

  const name = cleanWikiText(fields.name);

  if (!name) {
    return null;
  }

  const description = cleanWikiText(fields.content);
  const latitude = Number(fields.lat);
  const longitude = Number(fields.long || fields.lon);

  return {
    name,
    address: cleanWikiText(fields.address),
    rating: 7,
    type: inferPlaceType(`${name} ${description}`),
    description,
    sourceQuality: fields.wikipedia || fields.wikidata || fields.image
      ? "referenced"
      : "",
    location: {
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
    },
    url: "",
  };
}

function cleanWikiText(value) {
  return String(value ?? "")
    .replace(/\{\{(?:km|mi|ft|station)\|([^}|]+).*?\}\}/gi, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferPlaceType(value) {
  const text = String(value ?? "").toLowerCase();

  if (/waterfall|falls|dam|lake|river|ghat|sanctuary|wildlife|bird|botanical|garden|park/.test(text)) {
    return "nature";
  }

  if (/fort|castle|palace|wada|heritage|monument|memorial|samadhi|zero mile/.test(text)) {
    return "heritage";
  }

  if (/museum|science centre|planetarium|gallery/.test(text)) {
    return "museum";
  }

  if (/temple|mandir|stupa|mosque|dargah|church|cathedral|basilica|ashram/.test(text)) {
    return "spiritual";
  }

  if (/market|bazaar|food|cafe|vineyard|winery/.test(text)) {
    return "local experience";
  }

  return "attraction";
}

function rankAndCleanOsmPlaces({ city, rawPlaces, interests, origin }) {
  const seen = new Set();
  const ranked = rawPlaces
    .filter((place) => place.tags?.name && !isBadPlaceName(place.tags.name))
    .map((place) => ({
      raw: place,
      normalizedName: normalizeName(place.tags.name),
      score: scoreOsmPlace(place, origin),
    }))
    .filter(({ normalizedName, score }) => {
      if (seen.has(normalizedName) || score < 22) {
        return false;
      }

      seen.add(normalizedName);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ raw }) => toOsmPlaceCard(raw));

  return addCityHighlights(city, ranked, interests).slice(0, 10);
}

function scoreOsmPlace(place, origin) {
  const tags = place.tags ?? {};
  const text = Object.values(tags).join(" ").toLowerCase();
  const distanceKm = distanceInKm(
    origin.lat,
    origin.lon,
    Number(place.lat ?? place.center?.lat),
    Number(place.lon ?? place.center?.lon),
  );
  let score = 12;

  score += touristSignalScore(text) + genericTouristKeywordScore(text) + travelImportanceScore(text);
  score += weakTravelPenalty(text);

  if (tags.tourism === "attraction" || tags.tourism === "museum" || tags.historic) {
    score += 20;
  }

  if (tags.amenity === "place_of_worship" || tags.leisure === "park" || tags.leisure === "garden" || tags.leisure === "nature_reserve") {
    score += 10;
  }

  if (Number.isFinite(distanceKm)) {
    score += Math.max(0, 12 - distanceKm / 3);
  }

  if (isGenericWeakName(tags.name)) {
    score -= 18;
  }

  return score;
}

function toOsmPlaceCard(place) {
  const tags = place.tags ?? {};

  return {
    name: tags.name,
    address: "",
    rating: null,
    type: tags.tourism ?? tags.historic ?? tags.amenity ?? tags.leisure ?? tags.natural ?? "point_of_interest",
    location: {
      latitude: Number(place.lat ?? place.center?.lat),
      longitude: Number(place.lon ?? place.center?.lon),
    },
    url: `https://www.openstreetmap.org/${place.type}/${place.id}`,
  };
}

function distanceInKm(latA, lonA, latB, lonB) {
  if (![latA, lonA, latB, lonB].every(Number.isFinite)) {
    return null;
  }

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

function addCityHighlights(city, places, interests = []) {
  const normalizedCity = normalizeName(city);
  const highlightsKey = Object.keys(cityHighlights).find((key) =>
    normalizedCity.includes(key),
  );
  const highlights = highlightsKey ? cityHighlights[highlightsKey] : [];
  const placesByName = new Map(
    places.map((place) => [normalizeName(place.name), place]),
  );
  const seen = new Set();
  const orderedHighlights = highlights.map((highlight) => {
    const normalized = normalizeName(highlight.name);
    const livePlace = placesByName.get(normalized);

    seen.add(normalized);

    return livePlace
      ? {
          ...livePlace,
          name: highlight.name,
          type: highlight.type,
          rating: highlight.rating ?? livePlace.rating,
        }
      : highlight;
  });
  const remainingPlaces = places.filter((place) => {
    const normalized = normalizeName(place.name);

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });

  return orderSeasonalPlaces([...orderedHighlights, ...remainingPlaces], interests);
}

function orderSeasonalPlaces(places, interests = []) {
  const interestText = interests.map(String).join(" ").toLowerCase();

  if (!/\b(monsoon|mansoon|rainy|water\s*falls?|waterfalls?|winter|hill|hills)\b/.test(interestText)) {
    return places;
  }

  return [...places].sort((a, b) => {
    const scoreA = seasonalScore(a, interestText);
    const scoreB = seasonalScore(b, interestText);

    return scoreB - scoreA;
  });
}

function seasonalScore(place, interestText) {
  const text = `${place.name} ${place.type ?? ""}`.toLowerCase();
  let score = 0;

  if (/\b(monsoon|mansoon|rainy|water\s*falls?|waterfalls?)\b/.test(interestText)) {
    if (/waterfall|falls|dam|lake|river|riverfront|ghat|wildlife|nature|sanctuary|green/.test(text)) {
      score += 40;
    }

    if (/market|museum|canteen|stadium/.test(text)) {
      score -= 10;
    }
  }

  if (/\b(winter|hill|hills|hill station|hill stations)\b/.test(interestText)) {
    if (/hill|fort|view|viewpoint|caves|plateau|ghat|station/.test(text)) {
      score += 40;
    }
  }

  return score;
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const cityHighlights = {
  mumbai: [
    { name: "Gateway of India", type: "monument", rating: 7 },
    { name: "Marine Drive", type: "promenade", rating: 7 },
    { name: "Chhatrapati Shivaji Maharaj Terminus", type: "heritage", rating: 7 },
    { name: "Elephanta Caves", type: "historic", rating: 7 },
    { name: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", type: "museum", rating: 6 },
    { name: "Colaba Causeway", type: "market", rating: 6 },
    { name: "Juhu Beach", type: "beach", rating: 6 },
    { name: "Bandra-Worli Sea Link", type: "landmark", rating: 6 },
  ],
  goa: [
    { name: "Basilica of Bom Jesus", type: "heritage", rating: 8, zone: "Old Goa" },
    { name: "Se Cathedral", type: "heritage", rating: 8, zone: "Old Goa" },
    { name: "Fontainhas Latin Quarter", type: "heritage", rating: 7, zone: "Panjim" },
    { name: "Dona Paula View Point", type: "viewpoint", rating: 6, zone: "Panjim" },
    { name: "Fort Aguada", type: "fort", rating: 8, zone: "North Goa" },
    { name: "Calangute Beach", type: "beach", rating: 7, zone: "North Goa" },
    { name: "Baga Beach", type: "beach", rating: 7, zone: "North Goa" },
    { name: "Anjuna Beach", type: "beach", rating: 7, zone: "North Goa" },
    { name: "Chapora Fort", type: "fort", rating: 7, zone: "North Goa" },
    { name: "Dudhsagar Falls", type: "waterfall", rating: 8, zone: "Nature" },
    { name: "Colva Beach", type: "beach", rating: 7, zone: "South Goa" },
    { name: "Palolem Beach", type: "beach", rating: 7, zone: "South Goa" },
    { name: "Cabo de Rama Fort", type: "fort", rating: 6, zone: "South Goa" },
    { name: "Anjuna Flea Market", type: "market", rating: 6, zone: "North Goa" },
  ],
  kolhapur: [
    { name: "Shree Mahalaxmi Ambabai Temple", type: "temple", rating: 8 },
    { name: "New Palace and Shahu Museum", type: "museum", rating: 7 },
    { name: "Panhala Fort", type: "fort", rating: 7 },
    { name: "Jyotiba Temple", type: "temple", rating: 6 },
    { name: "Rankala Lake", type: "lake", rating: 7 },
    { name: "Siddhagiri Gramjivan Museum", type: "museum", rating: 6 },
    { name: "Bhavani Mandap", type: "heritage", rating: 6 },
    { name: "Town Hall Museum", type: "museum", rating: 6 },
    { name: "Khasbag Wrestling Stadium", type: "culture", rating: 5 },
    { name: "Kolhapur Misal and Tambada-Pandhara Rassa food trail", type: "food", rating: 7 },
  ],
  satara: [
    { name: "Kaas Plateau", type: "nature", rating: 8 },
    { name: "Thoseghar Waterfalls", type: "waterfall", rating: 8 },
    { name: "Ajinkyatara Fort", type: "fort", rating: 7 },
    { name: "Sajjangad Fort", type: "fort", rating: 7 },
    { name: "Chalkewadi Windmill Farms", type: "viewpoint", rating: 7 },
    { name: "Natraj Mandir", type: "temple", rating: 6 },
    { name: "Baramotichi Vihir", type: "heritage", rating: 6 },
    { name: "Shivsagar Lake and Koyna backwaters", type: "nature", rating: 7 },
    { name: "Satara local market", type: "market", rating: 5 },
    { name: "Yamai Devi Temple, Aundh", type: "temple", rating: 6 },
  ],
  pune: [
    { name: "Shaniwar Wada", type: "heritage", rating: 8 },
    { name: "Dagdusheth Halwai Ganpati Temple", type: "temple", rating: 8 },
    { name: "Lal Mahal", type: "heritage", rating: 6 },
    { name: "Aga Khan Palace", type: "museum", rating: 8 },
    { name: "Raja Dinkar Kelkar Museum", type: "museum", rating: 7 },
    { name: "Pataleshwar Cave Temple", type: "cave temple", rating: 7 },
    { name: "Sinhagad Fort", type: "fort", rating: 8 },
    { name: "Parvati Hill", type: "viewpoint", rating: 7 },
    { name: "Vetal Tekdi", type: "viewpoint", rating: 6 },
    { name: "Mulshi Dam", type: "nature", rating: 7 },
    { name: "Panshet Dam", type: "nature", rating: 6 },
    { name: "Lonavala / Khandala hill-station extension", type: "hill station", rating: 7 },
    { name: "Saras Baug", type: "garden", rating: 6 },
    { name: "Pune Okayama Friendship Garden", type: "garden", rating: 6 },
    { name: "Tulshibaug Market", type: "market", rating: 6 },
    { name: "Koregaon Park cafe walk", type: "food", rating: 6 },
    { name: "FC Road food street", type: "food", rating: 6 },
  ],
  sangli: [
    { name: "Shri Ganapati Mandir", type: "temple", rating: 7 },
    { name: "Sangli Fort", type: "fort", rating: 6 },
    { name: "Sagareshwar Wildlife Sanctuary", type: "wildlife", rating: 7 },
    { name: "Dandoba Hill Forest Preserve", type: "nature", rating: 6 },
    { name: "Shri Datta Mandir, Audumbar", type: "temple", rating: 6 },
    { name: "Sangameshwar Temple", type: "temple", rating: 6 },
    { name: "Bahubali Hill Temple", type: "viewpoint", rating: 6 },
    { name: "Meerasaheb Dargah, Miraj", type: "heritage", rating: 5 },
    { name: "Irwin Bridge", type: "landmark", rating: 5 },
    { name: "Sangli Turmeric Market", type: "market", rating: 5 },
  ],
  karad: [
    { name: "Pritisangam", type: "river confluence", rating: 8 },
    { name: "Yashwantrao Chavan Samadhi", type: "memorial", rating: 7 },
    { name: "Krishnamai Temple", type: "temple", rating: 7 },
    { name: "Agashiv Caves", type: "buddhist caves", rating: 7 },
    { name: "Sadashivgad Fort", type: "fort", rating: 7 },
    { name: "Vasantgad Fort", type: "fort", rating: 6 },
    { name: "Chaphal Ram Mandir", type: "temple", rating: 6 },
    { name: "Koyna Dam", type: "nature", rating: 7 },
    { name: "Thoseghar Falls", type: "waterfall", rating: 7 },
    { name: "Mahabaleshwar / Panchgani hill station extension", type: "hill station", rating: 7 },
    { name: "Karad local market", type: "market", rating: 5 },
    { name: "Krishna Ghat", type: "riverfront", rating: 6 },
  ],
};

function mockPlaces(city = "destination", interests = []) {
  const normalizedCity = normalizeName(city);
  const highlightsKey = Object.keys(cityHighlights).find((key) =>
    normalizedCity.includes(key),
  );

  if (highlightsKey) {
    return {
      source: "Curated city highlights fallback",
      city,
      places: orderSeasonalPlaces(cityHighlights[highlightsKey], interests).slice(0, 10),
    };
  }

  const food = interests.includes("food") || interests.includes("restaurants");

  return {
    source: "Low-confidence local planning fallback",
    city,
    places: [
      { name: `${city} central stay area`, type: "local base", rating: null },
      { name: food ? `${city} local food area` : `${city} verified nearby attraction`, type: food ? "food" : "confirm before visiting", rating: null },
      { name: `${city} main market or old-city area`, type: "local culture", rating: null },
      { name: `${city} flexible rest or food block`, type: "flexible block", rating: null },
    ],
  };
}
