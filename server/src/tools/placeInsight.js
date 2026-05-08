import { resolveTravelDestination } from "./destinationResolver.js";

const placeProfiles = {
  shriganapatimandir: {
    name: "Shri Ganapati Mandir",
    city: "Sangli",
    type: "historic temple",
    bestFor: ["devotion", "heritage", "architecture", "calm city stop"],
    summary:
      "Shri Ganapati Mandir is one of Sangli's most important landmarks: a historic Lord Ganesha temple near the Krishna River, closely connected with the Patwardhan rulers of Sangli. It works best as a peaceful morning or evening stop, especially if you want a local place that feels central to the city's identity.",
    tips: [
      "Visit in the morning or early evening for a calmer darshan and better light around the temple complex.",
      "Dress modestly and keep footwear, photography rules, and festival crowds in mind.",
      "Pair it with Sangli Fort, Irwin Bridge, or the local market because they fit naturally into the same city route.",
    ],
    recommendations: [
      "Sangli Fort",
      "Irwin Bridge",
      "Sangli Turmeric Market",
      "Krishna riverfront areas",
    ],
  },
  sanglifort: {
    name: "Sangli Fort",
    city: "Sangli",
    type: "city heritage",
    bestFor: ["history", "old-city walk", "short stop", "local context"],
    summary:
      "Sangli Fort is a compact heritage stop that helps explain the old city around Ganapati Peth and the former princely-state core of Sangli. Keep it as a short historical walk rather than a full-day fort trek.",
    tips: [
      "Combine it with Shri Ganapati Mandir because the two work well in one old-city cluster.",
      "Go earlier in the day if you want quieter streets and easier parking.",
      "Use it as a context stop before moving to markets, food, or the riverfront.",
    ],
    recommendations: [
      "Shri Ganapati Mandir",
      "Sangli Turmeric Market",
      "Irwin Bridge",
    ],
  },
  sagareshwarwildlifesanctuary: {
    name: "Sagareshwar Wildlife Sanctuary",
    city: "Sangli",
    type: "wildlife sanctuary",
    bestFor: ["nature", "wildlife", "winter", "monsoon greenery"],
    summary:
      "Sagareshwar Wildlife Sanctuary is Sangli's stronger nature escape, useful when the trip needs greenery, wildlife, and a break from city temples and markets. It is better as a half-day outing than a quick late-evening add-on.",
    tips: [
      "Start early because wildlife and nature areas feel better before the day gets hot.",
      "Carry water, sun protection, and simple snacks because food options may be limited inside or near the sanctuary.",
      "In monsoon, check road and trail conditions before committing to the visit.",
    ],
    recommendations: [
      "Dandoba Hill Forest Preserve",
      "Bahubali Hill Temple",
      "Shri Datta Mandir, Audumbar",
    ],
  },
  dandobahillforestpreserve: {
    name: "Dandoba Hill Forest Preserve",
    city: "Sangli",
    type: "hill and forest area",
    bestFor: ["winter", "short hike", "views", "nature"],
    summary:
      "Dandoba Hill Forest Preserve is a good Sangli-side nature and hill-view option, especially in winter or after the rains when walking is more comfortable and the landscape is greener.",
    tips: [
      "Use morning hours for walking or viewpoints.",
      "Wear comfortable shoes and avoid slippery sections during heavy rain.",
      "Pair it with Sagareshwar Wildlife Sanctuary only if you have a private vehicle and an active day planned.",
    ],
    recommendations: [
      "Sagareshwar Wildlife Sanctuary",
      "Bahubali Hill Temple",
      "Sangli local food stop",
    ],
  },
  shridattamandiraudumbar: {
    name: "Shri Datta Mandir, Audumbar",
    city: "Sangli",
    type: "pilgrimage temple",
    bestFor: ["pilgrimage", "quiet stop", "river-side detour", "local devotion"],
    summary:
      "Shri Datta Mandir at Audumbar is a devotional stop near Sangli, usually added for travelers interested in temples and calmer spiritual places outside the busy city core.",
    tips: [
      "Keep it as a relaxed half-day or route-side stop, not a rushed last-minute detour.",
      "Check local timing and crowd patterns around festival days.",
      "Pair it with simple local food or a nearby river-side break.",
    ],
    recommendations: [
      "Sangameshwar Temple",
      "Sagareshwar Wildlife Sanctuary",
      "Sangli local market",
    ],
  },
  sangameshwartemple: {
    name: "Sangameshwar Temple",
    city: "Sangli",
    type: "temple",
    bestFor: ["temple visit", "culture", "slow travel", "local route"],
    summary:
      "Sangameshwar Temple is a useful cultural and devotional stop in a Sangli itinerary, best included when the day is already focused on temples, local food, and lighter sightseeing.",
    tips: [
      "Visit during quieter hours if you want a calmer experience.",
      "Avoid adding it after a far nature stop unless transport timing is clear.",
      "Keep a nearby food or rest stop as backup.",
    ],
    recommendations: [
      "Shri Datta Mandir, Audumbar",
      "Shri Ganapati Mandir",
      "Sangli Turmeric Market",
    ],
  },
  bahubalihilltemple: {
    name: "Bahubali Hill Temple",
    city: "Sangli",
    type: "hill temple",
    bestFor: ["winter", "views", "temple visit", "regional detour"],
    summary:
      "Bahubali Hill Temple is a good regional add-on when you want a temple visit with a hill-side setting. It fits better in winter or cooler weather than in the middle of a hot day.",
    tips: [
      "Start early if combining it with other nature or temple stops.",
      "Carry water and avoid rushing the climb or hill-side sections.",
      "Use it as a quieter alternative when city sightseeing feels too crowded.",
    ],
    recommendations: [
      "Dandoba Hill Forest Preserve",
      "Sagareshwar Wildlife Sanctuary",
      "Sangli local food stop",
    ],
  },
  irwinbridge: {
    name: "Irwin Bridge",
    city: "Sangli",
    type: "landmark bridge",
    bestFor: ["short photo stop", "river view", "old-city route", "evening break"],
    summary:
      "Irwin Bridge is a short Sangli landmark stop that works best for a river-view pause or a quick photo break while moving around the old city and Krishna riverfront area.",
    tips: [
      "Keep it brief and pair it with Shri Ganapati Mandir or the local market.",
      "Use evening light if traffic and safety conditions are comfortable.",
      "Do not make it the main attraction of the day; it is better as a connector stop.",
    ],
    recommendations: [
      "Shri Ganapati Mandir",
      "Sangli Fort",
      "Sangli Turmeric Market",
    ],
  },
  sangliturmericmarket: {
    name: "Sangli Turmeric Market",
    city: "Sangli",
    type: "market",
    bestFor: ["local commerce", "shopping", "food route", "city culture"],
    summary:
      "Sangli Turmeric Market gives the trip a local-commerce angle, because Sangli is strongly associated with turmeric trading. It is best used as a short market stop, not as a polished tourist attraction.",
    tips: [
      "Go with realistic expectations: this is more local market experience than sightseeing monument.",
      "Keep cash handy and ask before photographing shops or people.",
      "Pair it with local snacks, Shri Ganapati Mandir, or Sangli Fort.",
    ],
    recommendations: [
      "Shri Ganapati Mandir",
      "Sangli Fort",
      "Sangli local food stop",
    ],
  },
  kaasplateau: {
    name: "Kaas Plateau",
    city: "Satara",
    type: "flower plateau",
    bestFor: ["monsoon", "post-monsoon", "nature", "photography"],
    summary:
      "Kaas Plateau is Satara's signature nature attraction, best known for its seasonal wildflowers, open plateau views, and cool post-monsoon landscape. It should be planned as a timed nature visit rather than a casual city stop.",
    tips: [
      "Visit in monsoon or post-monsoon for the strongest scenery, but check current access and booking rules before going.",
      "Start early because light, crowds, and road timing matter here.",
      "Pair it with Thoseghar Waterfalls or Chalkewadi only if you have a full nature-focused day.",
    ],
    recommendations: [
      "Thoseghar Waterfalls",
      "Chalkewadi Windmill Farms",
      "Sajjangad Fort",
    ],
  },
  thosegharwaterfalls: {
    name: "Thoseghar Waterfalls",
    city: "Satara",
    type: "waterfall",
    bestFor: ["monsoon", "nature", "viewpoints", "scenic drive"],
    summary:
      "Thoseghar Waterfalls is one of the strongest monsoon and post-monsoon stops near Satara, with dramatic waterfall views and green surroundings. It is best kept as part of a nature day, not a late-night add-on.",
    tips: [
      "Use morning or early afternoon and avoid risky edges or closed paths during heavy rain.",
      "Carry rain protection and shoes with grip in monsoon.",
      "Pair it with Kaas Plateau or Chalkewadi Windmill Farms if road conditions are comfortable.",
    ],
    recommendations: [
      "Kaas Plateau",
      "Chalkewadi Windmill Farms",
      "Sajjangad Fort",
    ],
  },
  ajinkyatarafort: {
    name: "Ajinkyatara Fort",
    city: "Satara",
    type: "fort",
    bestFor: ["history", "city views", "winter", "short drive"],
    summary:
      "Ajinkyatara Fort is Satara's important city-side fort and viewpoint, useful for understanding the city's Maratha-era setting while also getting broad views over Satara.",
    tips: [
      "Go early morning or late afternoon for better weather and light.",
      "Wear walking shoes because fort surfaces can be uneven.",
      "Pair it with Natraj Mandir or a local market stop for a relaxed city day.",
    ],
    recommendations: [
      "Natraj Mandir",
      "Baramotichi Vihir",
      "Satara local market",
    ],
  },
  sajjangadfort: {
    name: "Sajjangad Fort",
    city: "Satara",
    type: "fort and pilgrimage site",
    bestFor: ["history", "pilgrimage", "views", "winter"],
    summary:
      "Sajjangad Fort is a major Satara-area fort and spiritual stop, commonly visited for its calm hill setting, views, and association with Samarth Ramdas.",
    tips: [
      "Start earlier if combining it with Kaas, Thoseghar, or Koyna-side routes.",
      "Dress comfortably and keep temple/fort etiquette in mind.",
      "Avoid rushing it at the end of a long nature day.",
    ],
    recommendations: [
      "Thoseghar Waterfalls",
      "Kaas Plateau",
      "Shivsagar Lake and Koyna backwaters",
    ],
  },
  chalkewadiwindmillfarms: {
    name: "Chalkewadi Windmill Farms",
    city: "Satara",
    type: "windmill viewpoint",
    bestFor: ["monsoon", "viewpoints", "photography", "scenic drive"],
    summary:
      "Chalkewadi Windmill Farms is a scenic Satara-side viewpoint area known for windmills, open landscapes, and greener views in monsoon or post-monsoon weather.",
    tips: [
      "Visit in daylight and avoid pushing this route too late in the evening.",
      "Check fog, rain, and road conditions before heading out.",
      "Pair it with Thoseghar Waterfalls or Kaas Plateau on a nature-focused day.",
    ],
    recommendations: [
      "Thoseghar Waterfalls",
      "Kaas Plateau",
      "Sajjangad Fort",
    ],
  },
  baramotichivihir: {
    name: "Baramotichi Vihir",
    city: "Satara",
    type: "heritage stepwell",
    bestFor: ["heritage", "architecture", "short stop", "photography"],
    summary:
      "Baramotichi Vihir is a historic stepwell near Satara that works well as a short heritage and architecture stop when you want something quieter than the main fort and waterfall circuit.",
    tips: [
      "Keep it as a short stop and pair it with Ajinkyatara Fort or Satara city sightseeing.",
      "Visit in daylight for better visibility and safer movement around steps.",
      "Check local access before making it the only reason for a detour.",
    ],
    recommendations: [
      "Ajinkyatara Fort",
      "Natraj Mandir",
      "Satara local market",
    ],
  },
  shaniwarwada: {
    name: "Shaniwar Wada",
    city: "Pune",
    type: "heritage fortification",
    bestFor: ["history", "old Pune", "architecture", "first-time Pune"],
    summary:
      "Shaniwar Wada is Pune's classic old-city landmark and one of the best starting points for understanding the city's Peshwa-era history. It works well as a morning or late-afternoon heritage stop.",
    tips: [
      "Pair it with Dagdusheth Halwai Ganpati Temple and Lal Mahal because they sit naturally in the old-city cluster.",
      "Visit earlier in the day to avoid heat and heavier traffic.",
      "Keep time for nearby snacks or Tulshibaug Market after the visit.",
    ],
    recommendations: [
      "Dagdusheth Halwai Ganpati Temple",
      "Lal Mahal",
      "Tulshibaug Market",
    ],
  },
  dagdushethhalwaiganpatitemple: {
    name: "Dagdusheth Halwai Ganpati Temple",
    city: "Pune",
    type: "temple",
    bestFor: ["devotion", "old Pune", "culture", "short stop"],
    summary:
      "Dagdusheth Halwai Ganpati Temple is one of Pune's most visited temples and a strong old-city cultural stop, especially when paired with nearby heritage places.",
    tips: [
      "Expect crowds around weekends and festivals.",
      "Dress modestly and keep valuables secure in crowded lanes.",
      "Pair it with Shaniwar Wada, Lal Mahal, and Tulshibaug Market.",
    ],
    recommendations: [
      "Shaniwar Wada",
      "Lal Mahal",
      "Tulshibaug Market",
    ],
  },
  agakhanpalace: {
    name: "Aga Khan Palace",
    city: "Pune",
    type: "palace and museum",
    bestFor: ["history", "Gandhi history", "museum", "calm sightseeing"],
    summary:
      "Aga Khan Palace is one of Pune's strongest history stops, known for its Gandhi-related history, spacious grounds, and museum-style experience.",
    tips: [
      "Keep it as a relaxed half-day anchor rather than a rushed photo stop.",
      "Pair it with Koregaon Park cafes or Pune Okayama Friendship Garden if you want a calmer day.",
      "Check opening hours before going.",
    ],
    recommendations: [
      "Koregaon Park cafe walk",
      "Pune Okayama Friendship Garden",
      "Raja Dinkar Kelkar Museum",
    ],
  },
  sinhagadfort: {
    name: "Sinhagad Fort",
    city: "Pune",
    type: "fort and hill viewpoint",
    bestFor: ["fort", "views", "winter", "monsoon greenery"],
    summary:
      "Sinhagad Fort is Pune's strongest nearby fort outing, good for history, views, and a more active half-day outside the city core.",
    tips: [
      "Start early because the route and fort area get busier later.",
      "In monsoon, use shoes with grip and check road/weather conditions.",
      "Do not combine it with too many old-city stops on the same day.",
    ],
    recommendations: [
      "Parvati Hill",
      "FC Road food street",
      "Panshet Dam",
    ],
  },
  pritisangam: {
    name: "Pritisangam",
    city: "Karad",
    type: "river confluence",
    bestFor: ["sunset", "peaceful walks", "local landmark", "photography"],
    summary:
      "Pritisangam is Karad's signature river-confluence point where the Krishna and Koyna rivers meet. It is best kept as a calm morning or evening stop rather than a rushed checklist attraction.",
    tips: [
      "Visit early morning or around sunset for better light and cooler weather.",
      "Pair it with Yashwantrao Chavan Samadhi and Krishnamai Temple because they sit naturally in the same local cluster.",
      "Avoid the river edge during heavy monsoon flow and follow local safety signs.",
    ],
  },
  agashivcaves: {
    name: "Agashiv Caves",
    city: "Karad",
    type: "buddhist caves",
    bestFor: ["history", "short hike", "views", "heritage"],
    summary:
      "Agashiv Caves are a historic cave cluster near Karad, useful for travelers who like old rock-cut sites, short climbs, and quieter heritage stops.",
    tips: [
      "Go in the morning because the climb and exposed areas can feel hot later.",
      "Wear shoes with grip, especially after rain.",
      "Combine it with Sadashivgad or Vasantgad only if you are comfortable with an active day.",
    ],
  },
  koynadam: {
    name: "Koyna Dam",
    city: "Karad",
    type: "nature",
    bestFor: ["monsoon", "scenic drive", "water views", "nature"],
    summary:
      "Koyna Dam is a strong nature-side extension from Karad, especially useful in monsoon or post-monsoon when greenery and water levels make the route more scenic.",
    tips: [
      "Start early because it works better as a half-day outing than a late evening add-on.",
      "Check road and access conditions during heavy rain.",
      "Keep snacks, water, and a transport buffer because public transport can be limited.",
    ],
  },
  gatewayofindia: {
    name: "Gateway of India",
    city: "Mumbai",
    type: "monument",
    bestFor: ["first-time Mumbai", "heritage", "photos", "Colaba"],
    summary:
      "Gateway of India is Mumbai's classic waterfront monument and a good first stop for a South Mumbai heritage day.",
    tips: [
      "Visit early morning for fewer crowds and better photos.",
      "Pair it with Colaba, Kala Ghoda, and Chhatrapati Shivaji Maharaj Vastu Sangrahalaya.",
      "Avoid keeping valuables loose in crowded areas.",
    ],
  },
  dudhsagarfalls: {
    name: "Dudhsagar Falls",
    city: "Goa",
    type: "waterfall",
    bestFor: ["monsoon", "nature", "adventure", "day trip"],
    summary:
      "Dudhsagar Falls is one of Goa's strongest nature attractions, especially around monsoon and post-monsoon, but it needs more planning than a beach stop.",
    tips: [
      "Check current access rules before going because routes can change seasonally.",
      "Start early and avoid adding far-away beach plans on the same day.",
      "Carry shoes that can handle mud and wet ground.",
    ],
  },
};

const seasonalProfiles = {
  karad: {
    monsoon: {
      summary:
        "For Karad in monsoon, prioritize water, greenery, river views, and nearby nature instead of packing only caves and markets.",
      places: [
        "Pritisangam",
        "Koyna Dam",
        "Krishna Ghat",
        "Agashiv Caves only if paths are safe",
        "Thoseghar Falls as a wider Satara-side extension",
      ],
      tips: [
        "Keep waterfall and dam routes for morning or early afternoon.",
        "Avoid slippery cave or fort climbs during heavy rain.",
        "Carry rainwear and keep transport flexible.",
      ],
    },
    winter: {
      summary:
        "For Karad in winter, forts, caves, and hill viewpoints become more comfortable because the heat is lower.",
      places: [
        "Sadashivgad Fort",
        "Vasantgad Fort",
        "Agashiv Caves",
        "Pritisangam",
        "Chaphal Ram Mandir",
      ],
      tips: [
        "Use mornings for fort or cave walks.",
        "Keep sunset for Pritisangam or Krishna Ghat.",
        "Carry a light layer for early starts.",
      ],
    },
  },
  sangli: {
    monsoon: {
      summary:
        "For Sangli in monsoon, nearby green zones and wildlife/nature areas are better than a city-only plan.",
      places: [
        "Sagareshwar Wildlife Sanctuary",
        "Dandoba Hill Forest Preserve",
        "Bahubali Hill Temple",
        "Krishna riverfront areas",
      ],
      tips: [
        "Use a cab or private vehicle for nature stops.",
        "Check trail conditions after heavy rain.",
        "Keep temple and food stops as backup if rain gets strong.",
      ],
    },
    winter: {
      summary:
        "For Sangli in winter, nature walks, temples, and regional day trips become easier because daytime heat is lower.",
      places: [
        "Sagareshwar Wildlife Sanctuary",
        "Dandoba Hill Forest Preserve",
        "Shri Ganapati Mandir",
        "Sangli Fort",
      ],
      tips: [
        "Start nature spots early and keep food/market time for evening.",
        "Pair Sangli with Miraj or Kolhapur for a stronger regional trip.",
      ],
    },
  },
  kolhapur: {
    monsoon: {
      summary:
        "For Kolhapur in monsoon, hill roads, dams, and green viewpoints become the strongest seasonal angle.",
      places: [
        "Panhala Fort",
        "Radhanagari Wildlife Sanctuary",
        "Gaganbawda",
        "Rankala Lake",
        "Amboli Ghat as a longer extension",
      ],
      tips: [
        "Keep one flexible rain buffer each day.",
        "Check ghat road conditions before long drives.",
      ],
    },
    winter: {
      summary:
        "For Kolhapur in winter, temples, forts, museums, and food walks are comfortable across the day.",
      places: [
        "Panhala Fort",
        "Shree Mahalaxmi Ambabai Temple",
        "New Palace and Shahu Museum",
        "Jyotiba Temple",
        "Rankala Lake",
      ],
      tips: [
        "Use mornings for temple queues or fort walks.",
        "Keep evenings for Rankala Lake and food.",
      ],
    },
  },
  satara: {
    monsoon: {
      summary:
        "For Satara in monsoon, the strongest plan is waterfalls, green plateau views, windmill viewpoints, and safe fort/temple backups.",
      places: [
        "Thoseghar Waterfalls",
        "Kaas Plateau",
        "Chalkewadi Windmill Farms",
        "Shivsagar Lake and Koyna backwaters",
        "Sajjangad Fort if roads are safe",
      ],
      tips: [
        "Check road, waterfall, and plateau access before leaving.",
        "Keep nature routes for morning or early afternoon.",
        "Avoid risky waterfall edges and slippery fort sections during heavy rain.",
      ],
    },
    winter: {
      summary:
        "For Satara in winter, forts, viewpoints, Kaas-side drives, and temple/heritage stops become more comfortable across the day.",
      places: [
        "Ajinkyatara Fort",
        "Sajjangad Fort",
        "Kaas Plateau",
        "Chalkewadi Windmill Farms",
        "Baramotichi Vihir",
      ],
      tips: [
        "Use mornings for forts and viewpoints.",
        "Keep afternoons for heritage, temples, or local food.",
        "Carry a light layer for early starts and hill-side stops.",
      ],
    },
  },
  pune: {
    monsoon: {
      summary:
        "For Pune in monsoon, keep one green fort or dam-side day, but balance it with rain-safe museums and old-city food stops.",
      places: [
        "Sinhagad Fort",
        "Mulshi Dam",
        "Panshet Dam",
        "Lonavala / Khandala hill-station extension",
        "Aga Khan Palace",
      ],
      tips: [
        "Check road and rain conditions before fort or dam drives.",
        "Use museums and cafes as backup if rain becomes heavy.",
        "Avoid slippery hill sections after strong rain.",
      ],
    },
    winter: {
      summary:
        "For Pune in winter, forts, tekdis, old-city walks, gardens, and food streets become comfortable through more of the day.",
      places: [
        "Sinhagad Fort",
        "Parvati Hill",
        "Vetal Tekdi",
        "Shaniwar Wada",
        "Pune Okayama Friendship Garden",
      ],
      tips: [
        "Use mornings for forts and viewpoints.",
        "Keep old-city heritage and food for late afternoon.",
        "Carry a light layer for early hill-side starts.",
      ],
    },
  },
  goa: {
    monsoon: {
      summary:
        "For Goa in monsoon, waterfalls, spice farms, heritage lanes, and green drives usually beat beach swimming plans.",
      places: [
        "Dudhsagar Falls",
        "Harvalem Falls",
        "Fontainhas",
        "Old Goa churches",
        "Spice plantation visits",
      ],
      tips: [
        "Avoid rough-sea swimming during monsoon warnings.",
        "Check waterfall access and road conditions before leaving.",
      ],
    },
    winter: {
      summary:
        "For Goa in winter, beaches, forts, markets, and old-town walks are at their most comfortable.",
      places: [
        "Fort Aguada",
        "Calangute Beach",
        "Baga Beach",
        "Palolem Beach",
        "Anjuna Flea Market",
      ],
      tips: [
        "Book stays earlier because winter is high season.",
        "Keep beach and market days separate from far-away waterfall days.",
      ],
    },
  },
  mumbai: {
    monsoon: {
      summary:
        "For Mumbai in monsoon, keep city plans flexible and use nearby waterfall or hill-station day trips only when travel conditions are safe.",
      places: [
        "Marine Drive for rain views",
        "Sanjay Gandhi National Park",
        "Lonavala and Khandala as hill-station extensions",
        "Bhivpuri or Karjat waterfall belt as a wider extension",
      ],
      tips: [
        "Avoid flood-prone routes during heavy rain alerts.",
        "Keep train and road delays in the plan.",
      ],
    },
    winter: {
      summary:
        "For Mumbai in winter, walking-heavy heritage, markets, beaches, and nearby hill stations are easier.",
      places: [
        "Gateway of India",
        "Marine Drive",
        "Elephanta Caves",
        "Matheran as a hill-station extension",
        "Lonavala and Khandala",
      ],
      tips: [
        "Use winter mornings for heritage walks.",
        "Keep hill-station trips as full-day extensions.",
      ],
    },
  },
};

export async function getPlaceInsight({
  city = "",
  place = "",
  season = "",
  question = "",
}) {
  const normalizedSeason = cleanSeason(season || question);
  const normalizedCity = normalizeKey(city);
  const placeProfile = findPlaceProfile(place || question);
  const cityKey = findCityKey(normalizedCity || normalizeKey(placeProfile?.city));
  const seasonal = normalizedSeason && cityKey
    ? seasonalProfiles[cityKey]?.[normalizedSeason]
    : null;
  const hasSpecificPlace = Boolean(String(place || question).trim());
  const livePlaceInsight = hasSpecificPlace
    ? await getLivePlaceInsight({
        city,
        place,
        season: normalizedSeason,
      }).catch(() => null)
    : null;

  if (livePlaceInsight) {
    return livePlaceInsight;
  }

  if (placeProfile) {
    return {
      source: "Curated place insight",
      city: placeProfile.city,
      place: placeProfile.name,
      season: normalizedSeason,
      label: placeProfile.name,
      summary: addSeasonContext(placeProfile.summary, seasonal, normalizedSeason),
      bestFor: placeProfile.bestFor,
      tips: mergeLists(placeProfile.tips, seasonal?.tips),
      recommendations: mergeLists(placeProfile.recommendations, seasonal?.places),
    };
  }

  if (seasonal) {
    return {
      source: "Curated seasonal travel guide",
      city: titleCase(cityKey),
      place: "",
      season: normalizedSeason,
      label: `${titleCase(cityKey)} ${normalizedSeason} guide`,
      summary: seasonal.summary,
      bestFor: normalizedSeason === "monsoon"
        ? ["waterfalls", "green views", "riverfronts", "nature drives"]
        : ["hill stations", "forts", "viewpoints", "outdoor walks"],
      tips: seasonal.tips,
      recommendations: seasonal.places,
    };
  }

  return {
    source: "General place insight",
    city,
    place,
    season: normalizedSeason,
    label: place || city || "Travel place",
    summary: buildGeneralPlaceSummary({ city, place }),
    bestFor: inferBestFor(place),
    tips: [
      "Check recent reviews and local access before going.",
      "Avoid adding far-away places late in the day.",
      "Keep a backup food or market stop nearby.",
    ],
    recommendations: [],
  };
}

async function getLivePlaceInsight({ city = "", place = "", season = "" }) {
  const target = place || city;

  if (!target) {
    return null;
  }

  const resolved = await resolveTravelDestination(target).catch(() => null);
  const resolvedPlaceCity = inferResolvedPlaceCity(resolved, target);
  const resolvedCity = resolvedPlaceCity ||
    (resolved?.locality && !sameNormalized(resolved.locality, target)
      ? resolved.locality
      : city);
  const searchTarget = resolved?.name && sameNormalized(resolved.name, target)
    ? resolved.name
    : target;
  const directSummary = await fetchBestWikipediaSummary([
    target,
    resolved?.name,
    searchTarget,
  ]);

  if (directSummary) {
    return buildLiveInsightFromSummary({
      summary: directSummary,
      city,
      resolvedCity,
      resolved,
      target,
      season,
    });
  }

  const searchQuery = [searchTarget, cleanCityForSearch(resolvedCity || city), "India"]
    .filter(Boolean)
    .join(" ");
  const title = await findWikipediaPlaceTitle(searchQuery, searchTarget);

  if (!title) {
    return null;
  }

  const summary = await fetchWikipediaSummary(title);

  if (!summary?.extract || summary.type === "disambiguation") {
    return null;
  }

  return buildLiveInsightFromSummary({
    summary,
    city,
    resolvedCity,
    resolved,
    target,
    season,
  });
}

function extractIndianCityFromSummary(extract = "") {
  const match = String(extract).match(
    /\bin\s+([A-Z][A-Za-z .'-]{2,42}?),\s*(?:[A-Z][A-Za-z .'-]{2,42},\s*)?India\b/,
  );
  const city = match?.[1]?.replace(/\b(the|district|state|city)\b/gi, "").trim();

  return city && city.length <= 42 ? city : "";
}

async function findWikipediaPlaceTitle(query, target) {
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
  const results = data.query?.search ?? [];

  return results
    .filter((result) => !/\b(disambiguation|list of|category:)\b/i.test(result.title))
    .map((result) => ({
      title: result.title,
      score: wikipediaTitleScore(result.title, target),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.title ?? "";
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

async function fetchBestWikipediaSummary(titles = []) {
  for (const title of [...new Set(titles.filter(Boolean))]) {
    const summary = await fetchWikipediaSummary(title).catch(() => null);

    if (isUsableWikipediaSummary(summary)) {
      return summary;
    }
  }

  return null;
}

function buildLiveInsightFromSummary({
  summary,
  city = "",
  resolvedCity = "",
  resolved = null,
  target = "",
  season = "",
}) {
  const readableSummary = summary.extract.length > 520
    ? `${summary.extract.slice(0, 520).replace(/\s+\S*$/, "")}.`
    : summary.extract;
  const summaryCity = extractIndianCityFromSummary(summary.extract);

  return {
    source: "Wikipedia live place summary",
    city: summaryCity || cleanCityForDisplay(resolvedCity) || cleanCityForDisplay(city) || resolved?.locality || "",
    place: summary.title || target,
    season,
    label: summary.title || target,
    summary: season
      ? `${readableSummary} For ${season}, check local access, road conditions, and whether the timing fits your route before adding it.`
      : readableSummary,
    bestFor: inferBestFor(summary.title || target),
    tips: [
      "Check current opening hours, access rules, and recent reviews before going.",
      "Keep it in the same route cluster as nearby attractions to avoid wasted travel time.",
      "Use daylight hours for heritage, hill, water, or nature spots.",
    ],
    recommendations: [],
  };
}

function isUsableWikipediaSummary(summary) {
  return Boolean(summary?.extract) && summary.type !== "disambiguation";
}

function wikipediaTitleScore(title, target) {
  const normalizedTarget = normalizeKey(target);
  const normalizedTitle = normalizeKey(title);
  const targetTokens = splitWords(target);
  const titleTokens = splitWords(title);
  const commonTokens = targetTokens.filter((token) => titleTokens.includes(token)).length;
  let score = 0;

  if (normalizedTitle === normalizedTarget) {
    score += 80;
  }

  if (normalizedTitle.includes(normalizedTarget) || normalizedTarget.includes(normalizedTitle)) {
    score += 46;
  }

  score += commonTokens * 18;

  if (targetTokens.length && commonTokens === 0) {
    score -= 60;
  }

  if (/\b(india|maharashtra|karnataka|telangana|tamil nadu|kerala|goa|rajasthan|uttarakhand)\b/i.test(title)) {
    score += 12;
  }

  return score;
}

function inferResolvedPlaceCity(resolved, target = "") {
  const candidates = [
    resolved?.locality,
    resolved?.name,
    resolved?.displayName,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const parts = String(candidate)
      .split(",")
      .map((part) => cleanCityForDisplay(part))
      .filter(Boolean);
    const placeIndex = parts.findIndex((part) => sameNormalized(part, target));
    const nextPart = placeIndex >= 0 ? parts[placeIndex + 1] : "";
    const city = nextPart || (parts.length > 1 ? parts[parts.length - 1] : "");

    if (city && !sameNormalized(city, target) && !/^india$/i.test(city)) {
      return city;
    }
  }

  return "";
}

function cleanCityForSearch(value = "") {
  return cleanCityForDisplay(value).replace(/\bIndia\b/i, "").trim();
}

function cleanCityForDisplay(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*India$/i, "")
    .trim();
}

function buildGeneralPlaceSummary({ city = "", place = "" }) {
  const placeName = place || "This place";
  const cityText = city ? ` in ${city}` : "";
  const typeText = inferPlaceType(place);

  return `${placeName}${cityText} looks like a ${typeText} stop. I do not have a detailed verified profile for it yet, so treat it as a candidate place: check what it is known for, current access, distance from your stay, and whether it fits the rest of the day's route.`;
}

function inferPlaceType(place = "") {
  const lower = String(place).toLowerCase();

  if (/mandir|temple|devasthan|math|dargah|church|mosque/.test(lower)) {
    return "religious/cultural";
  }

  if (/fort|gad|castle/.test(lower)) {
    return "heritage";
  }

  if (/marine|promenade|seafront|sea\s*front|coast|coastal|beach|chowpatty/.test(lower)) {
    return "waterfront";
  }

  if (/falls|waterfall|dam|lake|river|ghat|sangam/.test(lower)) {
    return "nature or water-side";
  }

  if (/market|bazaar|peth/.test(lower)) {
    return "market/local-culture";
  }

  if (/hill|point|view|plateau|cave|caves/.test(lower)) {
    return "outdoor/scenic";
  }

  return "local-interest";
}

function inferBestFor(place = "") {
  const type = inferPlaceType(place);

  if (type === "religious/cultural") {
    return ["devotion", "culture", "quiet stop", "local context"];
  }

  if (type === "heritage") {
    return ["history", "architecture", "old-city route", "short stop"];
  }

  if (type === "nature or water-side") {
    return ["nature", "views", "morning plan", "seasonal route"];
  }

  if (type === "waterfront") {
    return ["sea views", "sunset", "evening walk", "route fit"];
  }

  if (type === "market/local-culture") {
    return ["shopping", "local food", "city culture", "short walk"];
  }

  if (type === "outdoor/scenic") {
    return ["views", "winter", "walking", "outdoors"];
  }

  return ["route fit", "local context", "practical planning"];
}

function findPlaceProfile(value = "") {
  const normalized = normalizeKey(value);

  return Object.entries(placeProfiles).find(([key, profile]) =>
    normalized.includes(key) || key.includes(normalized) || normalized.includes(normalizeKey(profile.name)),
  )?.[1];
}

function findCityKey(normalizedCity = "") {
  return Object.keys(seasonalProfiles).find((key) =>
    normalizedCity.includes(key) || key.includes(normalizedCity),
  );
}

function cleanSeason(value = "") {
  const lower = String(value).toLowerCase();

  if (/\b(monsoon|mansoon|rain|rains|rainy|water\s*falls?|waterfalls?)\b/.test(lower)) {
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

function addSeasonContext(summary, seasonal, season) {
  if (!seasonal || !season) {
    return summary;
  }

  return `${summary} For ${season}, also consider: ${seasonal.places.slice(0, 3).join(", ")}.`;
}

function mergeLists(a = [], b = []) {
  return [...new Set([...a, ...b].filter(Boolean))].slice(0, 6);
}

function normalizeKey(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function splitWords(value = "") {
  return String(value).toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
}

function sameNormalized(a = "", b = "") {
  const normalizedA = normalizeKey(a);
  const normalizedB = normalizeKey(b);

  return Boolean(normalizedA && normalizedB) && (
    normalizedA.includes(normalizedB) ||
    normalizedB.includes(normalizedA)
  );
}

function titleCase(value = "") {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
