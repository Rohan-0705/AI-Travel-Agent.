const cityGuides = {
  sangli: {
    transport: [
      "Use autos and app cabs for short city hops; agree on fare if the auto is not metered.",
      "Miraj is close, so keep Sangli-Miraj travel grouped instead of crossing back and forth.",
      "For nearby nature spots like Sagareshwar or Dandoba, a cab or hired vehicle is easier than relying only on public transport.",
    ],
    stays: [
      "Stay near central Sangli, Miraj Road, or the Ganapati Mandir side if you want easy food and transport.",
      "For family trips, prioritize parking, AC, and recent reviews over a very low room price.",
    ],
    safety: [
      "Sangli is generally manageable for travelers, but keep normal precautions around crowded markets and late-night transport.",
      "Carry cash for small vendors and keep valuables zipped in market areas.",
    ],
    packing: [
      "Pack light cotton clothes, sunscreen, a water bottle, and comfortable sandals or shoes.",
      "In warmer months, plan outdoor sightseeing early morning or late afternoon.",
    ],
    general: [
      "Sangli works best as a relaxed culture, temple, food, and nearby nature trip rather than a packed big-city sightseeing trip.",
      "Pair Sangli with Miraj or Kolhapur if you want a stronger 2-3 day regional itinerary.",
    ],
  },
  satara: {
    transport: [
      "Use a cab or self-drive car for Kaas Plateau, Thoseghar Waterfalls, Chalkewadi, and Sajjangad because these are spread outside the city core.",
      "Keep Satara city stops like Ajinkyatara Fort, Natraj Mandir, and local markets grouped together.",
      "During monsoon, check road conditions before waterfall and plateau drives.",
    ],
    stays: [
      "Stay in central Satara if you want easier food, transport, and access to both city and nature routes.",
      "For Kaas or Thoseghar-heavy trips, prioritize parking, early breakfast, and flexible check-in over fancy amenities.",
    ],
    safety: [
      "Avoid slippery waterfall edges, closed viewpoints, and exposed fort sections during heavy rain.",
      "Start nature drives early and avoid returning very late from remote routes.",
    ],
    packing: [
      "Pack walking shoes, rainwear in monsoon, a light layer in winter, water, and basic snacks for nature routes.",
      "Carry sun protection because plateau and fort areas can be exposed even in cooler months.",
    ],
    general: [
      "Satara works best as a nature-plus-fort trip: Kaas, Thoseghar, Chalkewadi, Ajinkyatara, and Sajjangad are the core route.",
      "Do not pack all far-away nature stops into one day; keep one flexible weather buffer.",
    ],
  },
  pune: {
    transport: [
      "Use app cabs, autos, and metro where convenient inside Pune; keep old-city and central attractions grouped to avoid traffic.",
      "Sinhagad, Mulshi, Panshet, and Lonavala/Khandala work better with a cab or self-drive vehicle than with last-minute local transport.",
      "Avoid peak office traffic when crossing Hinjewadi, Kharadi, Shivajinagar, and old-city routes.",
    ],
    stays: [
      "Stay near Deccan/Shivajinagar for old Pune and food access, Koregaon Park/Kalyani Nagar for cafes, or Hinjewadi/Kharadi only for business convenience.",
      "For a sightseeing trip, central location usually saves more time than a cheaper stay far outside the city.",
    ],
    safety: [
      "Pune is manageable for travelers, but keep normal care around crowded markets, late-night transport, and isolated hill viewpoints.",
      "Use daylight for forts, tekdis, and dam-side drives, especially in monsoon.",
    ],
    packing: [
      "Pack walking shoes, sunscreen, a water bottle, and a light layer for winter mornings or hill-side stops.",
      "Carry rainwear and shoes with grip in monsoon if visiting Sinhagad, Mulshi, or Lonavala/Khandala.",
    ],
    general: [
      "Pune works best as old-city heritage, Maratha history, museums, food streets, and one nearby fort or hill-view day.",
      "Do not mix far nature stops with a packed old-city day; keep them as separate clusters.",
    ],
  },
  mumbai: {
    transport: [
      "Use local trains or metro for longer north-south movement, then taxis or autos for the last mile.",
      "Avoid peak train hours if you are new to Mumbai: roughly 8-10 AM toward business areas and 6-8 PM outbound.",
      "Group South Mumbai places together because traffic can make cross-city plans slow.",
    ],
    stays: [
      "Stay in Colaba/Fort for heritage sightseeing, Bandra/Juhu for cafes and nightlife, or near the airport for short business trips.",
      "Mumbai hotel prices vary sharply by area, so location usually matters more than room size.",
    ],
    safety: [
      "Mumbai is traveler-friendly, but watch bags in crowded trains, markets, and beach areas.",
      "Use licensed taxis, app cabs, or well-lit transit routes late at night.",
    ],
    packing: [
      "Pack breathable clothes, walking shoes, sunglasses, and a small umbrella during monsoon season.",
      "Humidity is high, so keep plans lighter in the afternoon.",
    ],
    general: [
      "Mumbai is best planned by neighborhood clusters: Colaba/Fort, Marine Drive/Girgaon, Bandra/Juhu, and central markets.",
      "Keep buffer time between attractions because traffic can change the day quickly.",
    ],
  },
  goa: {
    transport: [
      "Scooters are popular, but use them only if you are comfortable with local roads and have a valid license.",
      "For families or groups, taxis or self-drive cars are more practical than hopping between distant beaches by public transport.",
      "Keep North Goa and South Goa as separate day clusters to avoid wasting time on long transfers.",
    ],
    stays: [
      "Stay in Panjim or Fontainhas for culture, Candolim/Calangute for easy beach access, and Palolem/Agonda for slower South Goa days.",
      "Check distance from the beach carefully because many listings use beach names loosely.",
    ],
    safety: [
      "Swim only where lifeguards are present and avoid rough-water beaches during monsoon.",
      "Keep taxi costs clear before starting a ride if you are not using an app.",
    ],
    packing: [
      "Pack sunscreen, swimwear, light clothes, sandals, and one nicer outfit for restaurants.",
      "Carry mosquito repellent for evenings near greenery or backwaters.",
    ],
    general: [
      "Goa works best when the plan leaves unscheduled beach time instead of filling every hour.",
      "Mix one heritage or market stop with one beach zone per day for a balanced trip.",
    ],
  },
};

const defaultGuide = {
  transport: [
    "Group nearby places together and avoid crossing the city repeatedly.",
    "Use app cabs or verified local transport when arriving late or carrying luggage.",
    "Keep extra buffer before trains, flights, and intercity transfers.",
  ],
  stays: [
    "Pick stays based on location, recent reviews, safety, and transport access before chasing the lowest price.",
    "For short trips, central location usually saves more time than a cheaper far-away hotel.",
  ],
  safety: [
    "Keep copies of key documents, use trusted transport at night, and avoid displaying valuables in crowded areas.",
    "Share your stay and route with someone if traveling solo.",
  ],
  packing: [
    "Pack light, comfortable walking shoes, daily medicines, a small power bank, and weather-appropriate layers.",
    "Keep one flexible bag space for snacks, water, and local shopping.",
  ],
  general: [
    "Plan around neighborhoods, leave buffers, and keep one flexible food or rest slot each day.",
    "Check opening hours, local holidays, and weather before finalizing the day.",
  ],
};

export async function getTravelGuide({ city, topic = "general", question = "" }) {
  const normalizedCity = String(city ?? "").toLowerCase();
  const matchedCity = Object.keys(cityGuides).find((key) =>
    normalizedCity.includes(key),
  );
  const normalizedTopic = cleanTopic(topic);
  const guide = matchedCity ? cityGuides[matchedCity] : defaultGuide;

  return {
    source: matchedCity ? "Curated city travel guide" : "General travel guide",
    city,
    topic: normalizedTopic,
    question,
    advice: guide[normalizedTopic] ?? guide.general,
    related: {
      transport: guide.transport?.[0] ?? defaultGuide.transport[0],
      stays: guide.stays?.[0] ?? defaultGuide.stays[0],
      safety: guide.safety?.[0] ?? defaultGuide.safety[0],
      packing: guide.packing?.[0] ?? defaultGuide.packing[0],
    },
  };
}

function cleanTopic(topic) {
  return ["transport", "safety", "stays", "packing", "general"].includes(topic)
    ? topic
    : "general";
}
