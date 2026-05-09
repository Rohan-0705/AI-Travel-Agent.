import { resolveTravelDestination } from "./destinationResolver.js";

export async function getPlaces({ city, interests = [] }) {
  const resolvedDestination = await resolveTravelDestination(city).catch(() => null);
  const searchCity = resolvedDestination?.name || city;
  const searchVariants = getDestinationSearchVariants(resolvedDestination, city);
  const coordinates = resolvedDestination?.coordinates ?? null;
  if (process.env.GOOGLE_PLACES_API_KEY) {
    const googlePlaces = await getGooglePlaces({ city: searchCity, interests });
    const rankedGooglePlaces = rankPlaceCards({
      city: searchCity,
      results: [googlePlaces],
      interests,
      origin: coordinates,
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
  const wikipediaSearchPlaces = await getWikipediaSearchPlaces({
    city: searchCity,
    variants: searchVariants,
    coordinates,
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
    results: [wikipediaPlaces, wikipediaSearchPlaces, wikiVoyagePlaces, openTripMapPlaces, openStreetMapPlaces].filter(Boolean),
    interests,
    origin: coordinates,
  });

  if (mergedLivePlaces.places?.length) {
    return mergedLivePlaces;
  }

  return {
    source: "No verified live places found",
    city: searchCity,
    places: [],
    warning: `No verified attraction sources returned usable places for ${searchCity}.`,
  };
}

function getDestinationSearchVariants(resolvedDestination, city) {
  const normalizedCity = normalizeName(city);
  const cityState = normalizeName(resolvedDestination?.state);
  const candidates = [
    city,
    resolvedDestination?.query,
    resolvedDestination?.name,
    resolvedDestination?.locality,
    ...(resolvedDestination?.variants ?? []),
  ].filter(Boolean);

  return [...new Set(candidates)]
    .filter((variant) => {
      const normalizedVariant = normalizeName(variant);

      if (!normalizedVariant) {
        return false;
      }

      if (cityState && normalizedVariant === cityState && normalizedVariant !== normalizedCity) {
        return false;
      }

      return (
        normalizedVariant === normalizedCity ||
        normalizedVariant.includes(normalizedCity) ||
        normalizedCity.includes(normalizedVariant)
      );
    });
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
  "bridge",
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
  "hot spring",
  "gufa",
  "jyotirlinga",
  "kund",
  "pine",
  "lake",
  "marine",
  "market",
  "mall road",
  "camp",
  "mahalaxmi",
  "monument",
  "museum",
  "palace",
  "park",
  "planetarium",
  "promenade",
  "ramkund",
  "rafting",
  "rapids",
  "reserve",
  "river",
  "riverfront",
  "rock",
  "rocks",
  "pass",
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
  "valley",
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
  /\bflexible\s+(food|rest|block)\b/i,
  /university/i,
  /department/i,
  /office/i,
  /bank/i,
  /atm/i,
  /hospital/i,
  /clinic/i,
  /\b(circuit\s*house|hotel|inn|resort)\b/i,
  /\bentry\s*\/\s*reception\b/i,
  /\bticket\s*(counter|office|window)\b/i,
  /lodging/i,
  /transport/i,
  /\b(restroom|toilet|washroom)\b/i,
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
  /\bcar\s*park\b/i,
  /\bpolice\b/i,
  /\bpower\s*(house|station)?\b/i,
  /\bproposed\b/i,
  /\brailway line\b/i,
  /\bsubstation\b/i,
  /\bterminal\b/i,
  /\btraffic\b/i,
  /\bcentral stay area\b/i,
  /\bverified nearby attraction\b/i,
  /^mandir$/i,
  /^temple$/i,
  /^garden$/i,
];

function cleanTouristPlaceName(value = "") {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\bWildife\b/gi, "Wildlife")
    .replace(/\s+\((?:entry|reception|parking|ticket counter|ticket office|gate)\s*[^)]*\)$/i, "")
    .replace(/^near\s+/i, "")
    .replace(/^lower\s+/i, "")
    .replace(/\s+(?:entry\s*\/\s*reception|entry|reception|ticket counter|ticket office|ticket window|parking|car park)$/i, "")
    .replace(/\s+extension$/i, "")
    .replace(/\s+mountain$/i, "")
    .replace(/\s+gate\s*\d*$/i, "")
    .trim();

  return formatPlaceNameCasing(cleaned);
}

function formatPlaceNameCasing(value = "") {
  if (!value || !/[a-zA-Z]/.test(value)) {
    return value;
  }

  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) {
    return value;
  }

  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

const strongTouristPatterns = [
  /\b(unesco|heritage|fort|killa|castle|palace|wada)\b/i,
  /\b(museum|memorial|monument|samadhi|stupa|ashram|bridge)\b/i,
  /\b(cave|caves|leni|buddhist caves?)\b/i,
  /\b(temple|mandir|jyotirlinga|sacred|pilgrimage|gufa|kund|cathedral|basilica|church|mosque|dargah|synagogue)\b/i,
  /\b(lake|dam|river|ghat|waterfall|falls|backwater|sanctuary|wildlife|bird sanctuary|tiger reserve|nature camp|rafting|rapids|hot springs?)\b/i,
  /\b(hill|viewpoint|view point|valley|mountain pass|garden|park|zoo|botanical|rose garden|boat house|tea factory|pine forest|rock|rocks|caves?|shooting point|echo rock|hidden valley)\b/i,
  /\b(beach|promenade|market|bazaar|mall road|vineyard|vineyards|winery|aquarium|planetarium)\b/i,
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
      name: cleanTouristPlaceName(place.displayName?.text ?? "Unnamed place"),
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
      node(around:${radius},${lat},${lon})["boundary"="protected_area"];
      way(around:${radius},${lat},${lon})["boundary"="protected_area"];
      relation(around:${radius},${lat},${lon})["boundary"="protected_area"];
      node(around:${radius},${lat},${lon})["natural"~"beach|peak|waterfall|spring|water|rock|cliff|cave_entrance"];
      way(around:${radius},${lat},${lon})["natural"~"beach|peak|waterfall|spring|water|rock|cliff|cave_entrance"];
      relation(around:${radius},${lat},${lon})["natural"~"beach|peak|waterfall|spring|water|rock|cliff|cave_entrance"];
      node(around:${radius},${lat},${lon})["waterway"="river"];
      way(around:${radius},${lat},${lon})["waterway"="river"];
      relation(around:${radius},${lat},${lon})["waterway"="river"];
      node(around:${radius},${lat},${lon})["water"="lake"];
      way(around:${radius},${lat},${lon})["water"="lake"];
      relation(around:${radius},${lat},${lon})["water"="lake"];
      node(around:${radius},${lat},${lon})["landuse"="vineyard"];
      way(around:${radius},${lat},${lon})["landuse"="vineyard"];
      relation(around:${radius},${lat},${lon})["landuse"="vineyard"];
    );
    out center tags 220;
  `;

  const data = await fetchOverpassJson(query);
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

async function fetchOverpassJson(query) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const overpassResponse = await fetch(endpoint, {
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

      return overpassResponse.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("OpenStreetMap Overpass request failed.");
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
    .filter((place) =>
      place.name &&
      !isBadPlaceName(place.name) &&
      !isDestinationOnlyPlace(place, title),
    )
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

async function getWikipediaSearchPlaces({ city, variants = [], coordinates = null }) {
  const cityVariants = getCityNameVariants(city, variants).slice(0, 3);
  const searchQueries = [...new Set(cityVariants.flatMap((variant) => [
    `${variant} tourist attractions`,
    `${variant} places to visit`,
  ]))];

  for (const query of searchQueries) {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("srlimit", "12");
    searchUrl.searchParams.set("srsearch", query);

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "AI-Travel-Planner/1.0 local development",
        "Accept-Language": "en",
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Wikipedia place search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.query?.search ?? [];
    const candidates = searchResults
      .map((result) => ({
        title: result.title,
        snippet: cleanWikiText(result.snippet),
      }))
      .filter((result) => isWikipediaSearchPlaceCandidate(result, city))
      .slice(0, 8);

    if (!candidates.length) {
      continue;
    }

    const placePages = await fetchWikipediaPlacePages(candidates, city, coordinates);

    if (placePages.length) {
      return {
        source: "Wikipedia place search",
        city,
        places: placePages,
      };
    }
  }

  throw new Error(`Wikipedia place search had no usable places for ${city}.`);
}

async function fetchWikipediaPlacePages(candidates, city, coordinates = null) {
  const pageUrl = new URL("https://en.wikipedia.org/w/api.php");
  pageUrl.searchParams.set("action", "query");
  pageUrl.searchParams.set("prop", "extracts|coordinates|pageprops");
  pageUrl.searchParams.set("exintro", "1");
  pageUrl.searchParams.set("explaintext", "1");
  pageUrl.searchParams.set("redirects", "1");
  pageUrl.searchParams.set("format", "json");
  pageUrl.searchParams.set("titles", candidates.map((candidate) => candidate.title).join("|"));

  const pageResponse = await fetch(pageUrl, {
    headers: {
      "User-Agent": "AI-Travel-Planner/1.0 local development",
      "Accept-Language": "en",
    },
  });

  if (!pageResponse.ok) {
    throw new Error(`Wikipedia place page lookup failed: ${pageResponse.status}`);
  }

  const snippets = new Map(candidates.map((candidate) => [candidate.title, candidate.snippet]));
  const pages = Object.values((await pageResponse.json()).query?.pages ?? {});
  const seen = new Set();

  return pages
    .filter((page) => page.title && !page.missing && !page.pageprops?.disambiguation)
    .map((page) => {
      const name = cleanTouristPlaceName(cleanWikiText(page.title));
      const description = cleanWikiText(page.extract || snippets.get(page.title) || "");
      const latitude = Number(page.coordinates?.[0]?.lat);
      const longitude = Number(page.coordinates?.[0]?.lon);

      return {
        name,
        address: "",
        rating: 7,
        type: inferPlaceType(`${name} ${description}`),
        description,
        sourceQuality: "referenced",
        location: {
          latitude: Number.isFinite(latitude) ? latitude : undefined,
          longitude: Number.isFinite(longitude) ? longitude : undefined,
        },
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}`,
      };
    })
    .filter((place) => {
      const normalized = normalizeName(place.name);

      if (
        !normalized ||
        seen.has(normalized) ||
        isBadPlaceName(place.name) ||
        isDestinationOnlyPlace(place, city) ||
        shouldSkipWikipediaPlaceName(place.name) ||
        isDistantWikipediaPlace(place, coordinates) ||
        !isUsefulWikipediaPlacePage(place)
      ) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function isDistantWikipediaPlace(place, coordinates) {
  const originLat = Number(coordinates?.lat);
  const originLon = Number(coordinates?.lon);
  const latitude = Number(place.location?.latitude);
  const longitude = Number(place.location?.longitude);

  if (![originLat, originLon, latitude, longitude].every(Number.isFinite)) {
    return false;
  }

  return distanceInKm(originLat, originLon, latitude, longitude) > 75;
}

function isUsefulWikipediaPlacePage(place) {
  const text = `${place.name ?? ""} ${place.type ?? ""} ${place.description ?? ""}`;
  const score =
    touristSignalScore(text) +
    genericTouristKeywordScore(text.toLowerCase()) +
    travelImportanceScore(text) +
    hillStationSignalScore(text.toLowerCase());

  if (score >= 18) {
    return true;
  }

  return !/\b(town|village|taluk|district)\b/i.test(place.description ?? "");
}

function isWikipediaSearchPlaceCandidate(result, city) {
  const title = cleanTouristPlaceName(cleanWikiText(result.title));
  const text = `${title} ${result.snippet ?? ""}`;

  if (
    !title ||
    shouldSkipWikipediaPlaceName(title) ||
    isDestinationOnlyPlace({ name: title }, city)
  ) {
    return false;
  }

  return (
    strongTouristPatterns.some((pattern) => pattern.test(text)) ||
    genericTouristKeywordScore(text.toLowerCase()) > 0 ||
    travelImportanceScore(text) > 0
  );
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
    .map((place) => ({
      ...place,
      name: cleanTouristPlaceName(place.name),
    }))
    .filter((place) => place.name && !isBadPlaceName(place.name))
    .map((place) => ({
      raw: place,
      normalizedName: normalizeName(place.name),
      score: scorePlace(place, wantsReligion, interests),
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

function scorePlace(place, wantsReligion, interests = []) {
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
  const peakPenalty = technicalPeakPenalty(text, interests);
  const genericNamePenalty = isGenericWeakName(name) ? -55 : 0;
  const religiousPenalty =
    !wantsReligion && /church|religion|monasteries|synagogues/.test(kinds)
      ? -28
      : 0;

  return rateScore + landmarkKindScore + qualityScore + weakPenalty + peakPenalty + genericNamePenalty + religiousPenalty;
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

  if (/\b(pine forest|shooting point|echo rock|hidden valley|valley|waterfall|falls)\b/i.test(text)) {
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

  if (/\b(ganapati|ganpati|siddhivinayak|datta mandir|dattatreya|audumbar)\b/i.test(text)) {
    return 0;
  }

  if (/\b(jyotirlinga|mecca masjid|basilica|cathedral|unesco|world heritage|famous|major|important|landmark)\b/i.test(text)) {
    return 0;
  }

  return -110;
}

function technicalPeakPenalty(text, interests = []) {
  const wantsTrekking = interests.some((interest) =>
    /\b(trek|trekking|hike|hiking|adventure|mountain|peak|summit)\b/i.test(String(interest)),
  );

  if (wantsTrekking) {
    return 0;
  }

  const looksLikeTechnicalPeak = /\b(peak|summit|tibba|shikar beh|indrasan)\b/i.test(text);
  const looksLikeVisitorFriendlyStop = /\b(viewpoint|view point|pass|valley|lake|temple|market|waterfall|falls|park|garden|hot spring|museum|castle|fort|promenade)\b/i.test(text);

  return looksLikeTechnicalPeak && !looksLikeVisitorFriendlyStop ? -130 : 0;
}

function isGenericWeakName(name) {
  const cleanedName = cleanTouristPlaceName(name);
  const lowerName = cleanedName.toLowerCase();
  const normalized = normalizeName(cleanedName);

  return (
    normalized.length < 4 ||
    /^(garden|park|temple|mandir|church|mosque|museum|fort|lake|market)$/i.test(normalized) ||
    /^(waterfallviewpoint|sunsetpoint|viewpoint)$/i.test(normalized) ||
    /^(line|route|corridor)\s*\d*$/i.test(lowerName)
  );
}

function toPlaceCard(place) {
  return {
    name: cleanTouristPlaceName(place.name),
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

function isDestinationOnlyPlace(place, city) {
  const normalizedName = normalizeName(place.name);
  const normalizedCity = normalizeName(city);

  if (!normalizedName || !normalizedCity) {
    return false;
  }

  if (normalizedName === normalizedCity) {
    return true;
  }

  const nameWithoutIndia = normalizedName.replace(/india$/, "");
  const cityWithoutIndia = normalizedCity.replace(/india$/, "");

  if (nameWithoutIndia === cityWithoutIndia) {
    return true;
  }

  const hasAttractionSignal = /\b(temple|fort|palace|museum|lake|beach|market|park|garden|waterfall|falls|viewpoint|pass|valley|cave|promenade|castle|bridge|ghat|hot spring)\b/i.test(
    String(place.name ?? ""),
  );

  return !hasAttractionSignal && (
    cityWithoutIndia.includes(nameWithoutIndia) ||
    nameWithoutIndia.includes(cityWithoutIndia)
  );
}

function rankPlaceCards({ city, results, interests = [], origin = null }) {
  const seen = new Set();
  const liveSources = results.filter((result) => result?.places?.length);
  const sorted = liveSources
    .flatMap((result) =>
      result.places.map((place, index) => ({
        place: {
          ...place,
          name: normalizeMarkerPlaceName(
            cleanTouristPlaceName(place.name),
            place.description,
          ),
          source: result.source,
        },
        source: result.source,
        index,
      })),
    )
    .filter(({ place, source }) =>
      place?.name &&
      !isBadPlaceName(place.name) &&
      !isOutOfDestinationRange(place, origin, source, city) &&
      !isDestinationOnlyPlace(place, city),
    )
    .map(({ place, source, index }) => ({
      place,
      source,
      normalizedName: normalizeName(place.name),
      score: scorePlaceCard(place, source, index, interests, city, origin),
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
    .slice(0, 30)
    .map(({ place }) => place);

  const places = addCityHighlights(city, ranked, interests).slice(0, 30);

  return {
    source: liveSources.map((result) => result.source).join(" + ") || "Travel place APIs",
    city,
    places,
  };
}

function scorePlaceCard(place, source, index, interests = [], city = "", origin = null) {
  const text = placeSearchText(place);
  const wantsReligion = wantsReligionInterest(interests);
  const distanceKm = placeDistanceFromOrigin(place, origin);
  const sourceBonus = /google/i.test(source)
    ? 10
    : /wikipedia attraction list/i.test(source)
      ? 13
      : /wikivoyage/i.test(source)
      ? 12
      : /wikipedia place search/i.test(source)
      ? 7
      : /openstreetmap/i.test(source)
      ? 6
      : 4;
  const rankBonus = /wikipedia attraction list/i.test(source)
    ? Math.max(0, 140 - index * 6)
    : /wikivoyage/i.test(source)
      ? Math.max(0, 82 - index * 5)
    : /wikipedia place search/i.test(source)
      ? Math.max(0, 28 - index * 3)
    : Math.max(0, 22 - index * 2);
  const rating = Number(place.rating);
  const ratingBonus = Number.isFinite(rating)
    ? Math.min(24, rating > 10 ? rating : rating * 2.5)
    : 0;
  const locationBonus = Number.isFinite(Number(place.location?.latitude ?? place.location?.lat))
    ? 2
    : 0;
  const distanceBonus = Number.isFinite(distanceKm)
    ? Math.max(-30, 28 - distanceKm * 0.8)
    : 0;
  const referenceBonus = place.sourceQuality === "referenced" ? 12 : 0;

  return (
    sourceBonus +
    rankBonus +
    ratingBonus +
    locationBonus +
    distanceBonus +
    referenceBonus +
    destinationNamedLandmarkScore(place.name, city) +
    localSourcePlaceSignalScore(place.name, text, city) +
    localDestinationOuterRingPenalty(place, origin, city) +
    farExcursionPenalty(text, city) +
    minorLocalStopPenalty(place) +
    hillStationSignalScore(`${place.name ?? ""} ${place.type ?? ""}`.toLowerCase()) +
    touristSignalScore(text) +
    genericTouristKeywordScore(text) +
    travelImportanceScore(text) +
    lowPriorityReligiousPenalty(text, wantsReligion) +
    technicalPeakPenalty(text, interests) +
    weakTravelPenalty(text) +
    (isGenericWeakName(place.name) ? -55 : 0)
  );
}

function isOutOfDestinationRange(place, origin, source = "", city = "") {
  const distanceKm = placeDistanceFromOrigin(place, origin);
  const destinationIsLocal = isLocalDestinationName(city);
  const text = placeSearchText(place);

  if (destinationIsLocal && mentionsDifferentDistrict(text, city)) {
    return true;
  }

  if (Number.isFinite(distanceKm)) {
    const normalizedText = normalizeName(text);
    const normalizedCity = normalizeName(city);

    if (
      destinationIsLocal &&
      distanceKm > 35 &&
      normalizedCity &&
      !normalizedText.includes(normalizedCity) &&
      /\b(lake|caves?|garden|statue|putala|temple|mandir|church|mosque|dargah|palace|fort)\b/i.test(String(place.name ?? ""))
    ) {
      return true;
    }

    if (
      destinationIsLocal &&
      distanceKm > 24 &&
      normalizedCity &&
      !normalizedText.includes(normalizedCity) &&
      !/\b(audumbar|sagareshwar|wildlife|sanctuary|nature reserve|protected area|river|rafting|waterfall|falls|caves?)\b/i.test(text) &&
      /\b(garden|statue|putala|temple|mandir|church|mosque|dargah|palace|fort|museum|bridge)\b/i.test(String(place.name ?? ""))
    ) {
      return true;
    }

    if (
      destinationIsLocal &&
      distanceKm > 42 &&
      normalizedCity &&
      !normalizedText.includes(normalizedCity) &&
      /\b(wildlife|sanctuary|national park|protected area|waterfall|falls|beach)\b/i.test(text)
    ) {
      return true;
    }

    return distanceKm > 55;
  }

  if (!/wikipedia place search|wikivoyage/i.test(source)) {
    return false;
  }

  const normalizedCity = normalizeName(city);

  return normalizedCity && !normalizeName(text).includes(normalizedCity);
}

function isLocalDestinationName(city = "") {
  return !/\b(north|south|old)\s+goa\b/i.test(city) &&
    !/\b(region|district|state|maharashtra|karnataka|goa|kerala|rajasthan|himachal|uttarakhand)\b/i.test(city);
}

function mentionsDifferentDistrict(text = "", city = "") {
  const normalizedCity = normalizeName(city);
  const matches = [...String(text).matchAll(/\b([a-z][a-z\s.'-]{2,40}?)\s+district\b/gi)];

  return matches.some((match) => {
    const normalizedDistrict = normalizeName(match[1]);

    return normalizedDistrict && normalizedCity && normalizedDistrict !== normalizedCity;
  });
}

function placeDistanceFromOrigin(place, origin) {
  const originLat = Number(origin?.lat);
  const originLon = Number(origin?.lon);
  const latitude = Number(place.location?.latitude ?? place.location?.lat);
  const longitude = Number(place.location?.longitude ?? place.location?.lon);

  if (![originLat, originLon, latitude, longitude].every(Number.isFinite)) {
    return null;
  }

  return distanceInKm(originLat, originLon, latitude, longitude);
}

function minorLocalStopPenalty(place) {
  const text = `${place.name ?? ""} ${place.type ?? ""}`.toLowerCase();

  if (/\b(statue|putala)\b/.test(text)) {
    return -70;
  }

  if (/\bgarden\b/.test(text) && !/\b(botanical|rose|brindavan|lalbagh|cubbon)\b/.test(text)) {
    return -38;
  }

  if (/\blake\b/.test(text) && !/\b(boating|bird|sanctuary|palace)\b/.test(text)) {
    return -18;
  }

  return 0;
}

function localSourcePlaceSignalScore(name = "", text = "", city = "") {
  const combined = `${name} ${text}`.toLowerCase();
  const normalizedCity = normalizeName(city);
  let score = 0;

  if (/\b(wildlife|sanctuary|nature reserve|protected area|forest)\b/.test(combined)) {
    score += /\bmapped as a protected or nature area\b/.test(combined) &&
      normalizedCity &&
      !normalizeName(combined).includes(normalizedCity)
      ? 12
      : 58;
  }

  if (/\b(irwin|bridge|riverfront|ghat)\b/.test(combined)) {
    score += 42;
  }

  if (/\b(ganapati|ganpati|siddhivinayak|datta mandir|dattatreya|audumbar)\b/.test(combined)) {
    score += 46;
  }

  if (/\b(mahalaxmi|mahalakshmi|ambabai)\b/.test(combined) && /\bkolhapur\b/.test(`${city} ${combined}`)) {
    score += 130;
  }

  if (/\bjyotiba\b/.test(combined) && /\bkolhapur\b/.test(`${city} ${combined}`)) {
    score += 72;
  }

  if (/\b(panhala|rankala|new palace|shahu museum|chhatrapati shahu museum)\b/.test(combined) && /\bkolhapur\b/.test(`${city} ${combined}`)) {
    score += 50;
  }

  if (/\b(museum|darbar hall|palace|fort)\b/.test(combined)) {
    score += 28;
  }

  if (
    normalizedCity &&
    normalizeName(combined).includes(normalizedCity) &&
    /\b(museum|fort|temple|mandir|bridge|market|sanctuary|wildlife|garden|park)\b/.test(combined)
  ) {
    score += 18;
  }

  if (/\b(statue|putala)\b/.test(combined) && !/\b(statue of unity|memorial|landmark|iconic|famous)\b/.test(combined)) {
    score -= 60;
  }

  return score;
}

function localDestinationOuterRingPenalty(place, origin, city = "") {
  if (!isLocalDestinationName(city)) {
    return 0;
  }

  const distanceKm = placeDistanceFromOrigin(place, origin);

  if (!Number.isFinite(distanceKm) || distanceKm <= 24) {
    return 0;
  }

  const text = placeSearchText(place);
  const normalizedCity = normalizeName(city);
  const normalizedText = normalizeName(text);

  if (normalizedCity && normalizedText.includes(normalizedCity)) {
    return 0;
  }

  if (/\b(audumbar|sagareshwar|wildlife|sanctuary|nature reserve|protected area)\b/i.test(text)) {
    return 0;
  }

  return distanceKm > 35 ? -75 : -45;
}

function farExcursionPenalty(text = "", city = "") {
  if (!isLocalDestinationName(city)) {
    return 0;
  }

  let penalty = 0;

  if (/\b(on the way from [^.]{0,80}\bto\b|2\s*[-–]\s*3\s*hours?|two\s+to\s+three\s+hours?|80\s*km|90\s*km|100\s*km|120\s*km)\b/i.test(text)) {
    penalty -= 48;
  }

  if (/\b(nearby|close to|within the city|city centre|central|old city)\b/i.test(text)) {
    penalty += 15;
  }

  return penalty;
}

function destinationNamedLandmarkScore(name, city) {
  const normalizedName = normalizeName(name);
  const normalizedCity = normalizeName(city);

  if (!normalizedCity || !normalizedName.includes(normalizedCity)) {
    return 0;
  }

  const directSignaturePattern = new RegExp(
    `^${normalizedCity}(palace|fort|zoo|lake|beach|hill|hills|caves?|falls?)$`,
    "i",
  );

  if (directSignaturePattern.test(normalizedName)) {
    return 180;
  }

  if (/\b(palace|fort|zoo|lake|beach|hill|caves?|falls?)\b/i.test(String(name ?? ""))) {
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

  if (/\b(ganapati|ganpati|siddhivinayak|dattatreya|datta mandir|audumbar|mahalaxmi|mahalakshmi|ambabai|jyotiba|temblai|temlabai)\b/i.test(text)) {
    return false;
  }

  return !/\b(jyotirlinga|mecca masjid|basilica|cathedral|unesco|world heritage|famous|major|important|landmark|sacred|pilgrimage|spiritual center|shakti)\b/i.test(
    text,
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
  return [
    ...parseWikivoyageMarkers(content),
    ...extractWikivoyageListingBlocks(content)
      .map((block) => parseWikivoyageListing(block))
      .filter(Boolean),
    ...parseWikivoyageBulletListings(content),
  ];
}

function parseWikivoyageMarkers(content) {
  const markerPattern = /\{\{marker\b([\s\S]*?)\}\}\s*(?:&mdash;|-)?\s*([^\n]*)/gi;
  const places = [];

  for (const match of String(content ?? "").matchAll(markerPattern)) {
    const fields = parseWikivoyageFields(match[1]);
    const rawName = cleanTouristPlaceName(cleanWikiText(fields.name));
    const description = cleanWikiText(match[2] || fields.content || "");
    const name = normalizeMarkerPlaceName(rawName, description);
    const latitude = Number(fields.lat);
    const longitude = Number(fields.long || fields.lon);

    if (!name || shouldSkipWikipediaPlaceName(name) || isGenericWeakName(name)) {
      continue;
    }

    places.push({
      name,
      address: "",
      rating: description ? 7 : 6,
      type: inferPlaceType(`${name} ${description}`),
      description,
      sourceQuality: description ? "referenced" : "",
      location: {
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
      },
      url: "",
    });
  }

  return places;
}

function normalizeMarkerPlaceName(name, description = "") {
  if (
    name &&
    !/\bbeach\b/i.test(name) &&
    /\bbeaches?\b/i.test(description)
  ) {
    return `${name} Beach`;
  }

  return name;
}

function parseWikivoyageBulletListings(content) {
  const seen = new Set();
  const places = [];
  const lines = String(content ?? "")
    .split(/\r?\n/)
    .filter((line) => /^\*\s*/.test(line));

  for (const line of lines) {
    const boldPlace = parseBoldWikivoyageBullet(line);

    if (boldPlace) {
      const normalized = normalizeName(boldPlace.name);

      if (!seen.has(normalized)) {
        seen.add(normalized);
        places.push(boldPlace);
      }
    }

    for (const nearbyPlace of parseNearbyWikivoyagePlaces(line)) {
      const normalized = normalizeName(nearbyPlace.name);

      if (!seen.has(normalized)) {
        seen.add(normalized);
        places.push(nearbyPlace);
      }
    }
  }

  return places;
}

function parseBoldWikivoyageBullet(line) {
  const match = line.match(/^\*\s*'''(?:\[\[([^|\]]+)(?:\|([^\]]+))?\]\]|([^':]+?))\s*:?\s*'''[:\s-]*(.*)$/);
  const name = cleanTouristPlaceName(cleanWikiText(match?.[2] || match?.[1] || match?.[3] || ""));
  const description = cleanWikiText(match?.[4] || line);

  if (!name || shouldSkipWikipediaPlaceName(name)) {
    return null;
  }

  return {
    name,
    address: "",
    rating: 7,
    type: inferPlaceType(`${name} ${description}`),
    description,
    sourceQuality: "referenced",
    location: null,
    url: "",
  };
}

function parseNearbyWikivoyagePlaces(line) {
  if (!/\bnearby places to visit include\b/i.test(line)) {
    return [];
  }

  const listText = cleanWikiText(line)
    .replace(/^.*?nearby places to visit include:?\s*/i, "")
    .replace(/\.$/, "");

  return listText
    .split(/\s*,\s*|\s+and\s+/i)
    .map((name) => cleanTouristPlaceName(cleanWikiText(name)))
    .filter((name) => name && !shouldSkipWikipediaPlaceName(name))
    .map((name) => ({
      name,
      address: "",
      rating: 7,
      type: inferPlaceType(name),
      description: `${name} is listed by Wikivoyage as a nearby place to visit from this destination.`,
      sourceQuality: "referenced",
      location: null,
      url: "",
    }));
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

  return cleanTouristPlaceName(cleanWikiText(rawName));
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
  const fields = parseWikivoyageFields(block);

  const name = cleanTouristPlaceName(cleanWikiText(fields.name));

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

function parseWikivoyageFields(block) {
  const fields = {};
  const fieldPattern = /\|\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*([\s\S]*?)(?=(?:\s*\|\s*[a-zA-Z][a-zA-Z0-9_-]*\s*=)|(?:\n\|\s*[a-zA-Z][a-zA-Z0-9_-]*\s*=)|(?:\n?\}\})|$)/g;

  for (const match of String(block ?? "").matchAll(fieldPattern)) {
    const key = match[1].toLowerCase();
    fields[key] = match[2].trim();
  }

  return fields;
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

  if (/waterfall|falls|dam|lake|river|ghat|sanctuary|wildlife|bird|botanical|garden|park|beach|coast|cliff/.test(text)) {
    return "nature";
  }

  if (/fort|castle|palace|wada|heritage|monument|memorial|samadhi|zero mile|bridge/.test(text)) {
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
    .map((place) => ({
      ...place,
      tags: {
        ...(place.tags ?? {}),
        name: cleanTouristPlaceName(place.tags?.name),
      },
    }))
    .filter((place) =>
      place.tags?.name &&
      !isBadPlaceName(place.tags.name) &&
      !isGenericWeakName(place.tags.name) &&
      !isDestinationOnlyPlace({ name: place.tags.name }, city),
    )
    .map((place) => ({
      raw: place,
      normalizedName: normalizeName(place.tags.name),
      score: scoreOsmPlace(place, origin, interests, city),
    }))
    .filter(({ normalizedName, score }) => {
      if (seen.has(normalizedName) || score < 22) {
        return false;
      }

      seen.add(normalizedName);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 35)
    .map(({ raw }) => toOsmPlaceCard(raw));

  return addCityHighlights(city, ranked, interests).slice(0, 30);
}

function scoreOsmPlace(place, origin, interests = [], city = "") {
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
  score += localSourcePlaceSignalScore(tags.name, text, city);
  score += weakTravelPenalty(text);
  score += technicalPeakPenalty(text, interests);

  if (tags.tourism === "attraction" || tags.tourism === "museum" || tags.historic) {
    score += 20;
  }

  if (tags.amenity === "place_of_worship" || tags.leisure === "park" || tags.leisure === "garden" || tags.leisure === "nature_reserve") {
    score += 10;
  }

  if (tags.boundary === "protected_area" || tags.waterway === "river" || /rock|cliff|cave_entrance/.test(String(tags.natural ?? ""))) {
    score += 16;
  }

  if (Number.isFinite(distanceKm)) {
    score += Math.max(0, 12 - distanceKm / 3);

    if (distanceKm > 85) {
      score -= 45;
    } else if (distanceKm > 55) {
      score -= 20;
    }
  }

  if (isGenericWeakName(tags.name)) {
    score -= 55;
  }

  return score;
}

function toOsmPlaceCard(place) {
  const tags = place.tags ?? {};
  const name = cleanTouristPlaceName(tags.name);

  return {
    name,
    address: "",
    rating: null,
    type: tags.tourism ?? tags.historic ?? tags.amenity ?? tags.leisure ?? tags.boundary ?? tags.natural ?? tags.waterway ?? "point_of_interest",
    description: buildOsmPlaceDescription(name, tags),
    location: {
      latitude: Number(place.lat ?? place.center?.lat),
      longitude: Number(place.lon ?? place.center?.lon),
    },
    url: `https://www.openstreetmap.org/${place.type}/${place.id}`,
  };
}

function buildOsmPlaceDescription(name, tags = {}) {
  const text = `${name} ${Object.values(tags).join(" ")}`.toLowerCase();

  if (/\b(bridge|irwin)\b/.test(text)) {
    return `${name} is mapped as a bridge or river-side landmark, useful for a short view stop and local route context.`;
  }

  if (/\bbeach\b/.test(text)) {
    return `${name} is mapped as a beach stop, useful for coastal time, cafes, sunset light, and keeping the day route relaxed.`;
  }

  if (/\b(wildlife|sanctuary|nature_reserve|protected_area|forest)\b/.test(text)) {
    return `${name} is mapped as a protected or nature area, best used for greenery, wildlife context, and daylight outdoor time.`;
  }

  if (tags.tourism === "museum" || /\bmuseum\b/.test(text)) {
    return `${name} is mapped as a museum, useful for local history, exhibits, and a calmer indoor culture stop.`;
  }

  if (/\b(fort|castle|palace|historic)\b/.test(text)) {
    return `${name} is mapped as a heritage stop, useful for older local history, architecture, and context.`;
  }

  if (tags.amenity === "place_of_worship" || /\b(temple|mandir|dargah|mosque|church)\b/.test(text)) {
    return `${name} is mapped as a place of worship, best treated as a short devotional and cultural stop with local timing in mind.`;
  }

  if (tags.leisure === "park" || tags.leisure === "garden" || /\b(park|garden)\b/.test(text)) {
    return `${name} is mapped as a local green space, useful only as a light break when it fits the same area.`;
  }

  return "";
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
  void city;
  return orderSeasonalPlaces(places, interests);
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
    .replace(/\bwildife\b/g, "wildlife")
    .replace(/laxmi/g, "lakshmi")
    .replace(/[^a-z0-9]/g, "");
}
