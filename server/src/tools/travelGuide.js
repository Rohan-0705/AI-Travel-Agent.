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
    "Plan around neighborhoods, leave buffers, and keep one open slot each day.",
    "Check opening hours, local holidays, and weather before finalizing the day.",
  ],
};

export async function getTravelGuide({ city, topic = "general", question = "" }) {
  const normalizedTopic = cleanTopic(topic);
  const guide = defaultGuide;

  return {
    source: "General travel guide",
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
