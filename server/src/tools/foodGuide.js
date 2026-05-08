const cityFoodGuides = {
  sangli: {
    style:
      "Sangli food is homely Maharashtrian food with strong Kolhapuri influence, fresh market snacks, jaggery-forward sweets, and simple thali meals.",
    mustTry: [
      "Misal pav",
      "Vada pav",
      "Poha and upma breakfasts",
      "Maharashtrian veg thali",
      "Kolhapuri-style tambda/pandhra rassa nearby",
      "Bhadang",
      "Jaggery sweets and chikki",
      "Sugarcane juice",
    ],
    areas: [
      "Ganapati Mandir area for snacks and quick meals",
      "Sangli market lanes for local breakfast and sweets",
      "Miraj Road for casual restaurants",
      "Bus stand and college areas for budget-friendly street food",
    ],
    tips: [
      "Ask for medium spice if you are not used to Kolhapuri heat.",
      "Breakfast and evening snacks are usually the best value.",
      "Carry cash for small snack stalls.",
      "Try local jaggery or turmeric products as take-home food gifts.",
    ],
    budget: "INR 250-500 per person per day for snacks plus simple meals; INR 700-1,200 for a more comfortable food day.",
  },
  satara: {
    style:
      "Satara food is simple Maharashtrian comfort food with strong local snack culture, kandi pedha sweets, misal, thalis, and easy highway-style meals around nature routes.",
    mustTry: [
      "Kandi pedha",
      "Misal pav",
      "Vada pav",
      "Maharashtrian veg thali",
      "Pithla bhakri",
      "Poha breakfast",
      "Sugarcane juice",
    ],
    areas: [
      "Central Satara market lanes for snacks and sweets",
      "Bus stand and Rajwada side for simple meals",
      "Kaas road or highway stops for tea, snacks, and quick lunches",
      "Local sweet shops for kandi pedha",
    ],
    tips: [
      "Buy kandi pedha from busy, well-known sweet shops with fresh stock.",
      "Keep food stops simple on Kaas or Thoseghar days because route timing matters.",
      "Ask for moderate spice if you are not used to Kolhapuri-style heat.",
    ],
    budget: "INR 300-600 per person per day for snacks and simple meals; INR 700-1,200 for a more comfortable food day.",
  },
  pune: {
    style:
      "Pune food mixes classic Maharashtrian snacks, student-friendly food streets, old-city sweets, misal, thalis, bakeries, and cafe culture.",
    mustTry: [
      "Misal pav",
      "Vada pav",
      "Mastani",
      "Bakarwadi",
      "Sabudana khichdi",
      "Maharashtrian thali",
      "Bun maska and Irani chai",
      "Bhakarwadi and local sweets",
    ],
    areas: [
      "FC Road and JM Road for snacks, cafes, and casual meals",
      "Tulshibaug and old-city lanes for local food and shopping",
      "Koregaon Park for cafes and relaxed dinners",
      "Deccan and Shivajinagar for practical central food stops",
    ],
    tips: [
      "Keep old-city food stops with Shaniwar Wada and Dagdusheth to avoid extra travel.",
      "Ask for medium spice if you are not used to misal heat.",
      "Use cafes or thalis as rest stops between heritage walks.",
    ],
    budget: "INR 500-1,000 per person per day for snacks and casual meals; INR 1,200-2,000 for cafe-heavy days.",
  },
  mumbai: {
    style:
      "Mumbai food is fast, coastal, street-heavy, and extremely varied, from local snacks to Irani cafes, seafood, Gujarati plates, and late-night eats.",
    mustTry: [
      "Vada pav",
      "Pav bhaji",
      "Bhel and sev puri",
      "Bombay sandwich",
      "Kheema pav",
      "Seafood thali",
      "Falooda",
      "Cutting chai",
    ],
    areas: [
      "Girgaum Chowpatty for chaat",
      "Mohammed Ali Road for rich street food",
      "Colaba and Fort for cafes",
      "Dadar and Matunga for classic local food",
    ],
    tips: [
      "Eat street food at busy stalls with fast turnover.",
      "Keep one relaxed meal between heavy snack stops.",
      "Use local trains or taxis to group nearby food areas.",
    ],
    budget: "INR 600-1,200 per person per day for street food and casual meals; higher for seafood or premium cafes.",
  },
  goa: {
    style:
      "Goa food mixes coastal seafood, Portuguese influence, coconut, rice, vinegar, kokum, bakeries, and relaxed beach-shack meals.",
    mustTry: [
      "Fish thali",
      "Prawn curry rice",
      "Chicken cafreal",
      "Pork vindaloo",
      "Poi bread",
      "Bebinca",
      "Feni or kokum drinks",
    ],
    areas: [
      "Panjim and Fontainhas for cafes",
      "Mapusa market for local snacks",
      "Candolim and Baga for beach shacks",
      "Margao for Goan meals",
    ],
    tips: [
      "Seafood prices vary a lot by season and beach belt.",
      "Ask for local thali places away from the main beach strip.",
      "Book popular restaurants on weekends.",
    ],
    budget: "INR 800-1,600 per person per day for casual food; seafood-heavy days can cost more.",
  },
};

const defaultGuide = {
  style:
    "The local food scene is best explored through breakfast spots, busy markets, simple thalis, sweets, and one relaxed dinner near the main city area.",
  mustTry: [
    "Local breakfast snacks",
    "Regional thali",
    "Street snacks",
    "Local sweets",
    "Tea or fresh juice stalls",
  ],
  areas: [
    "Main market lanes",
    "Temple or old-town area",
    "College and bus stand areas for budget snacks",
  ],
  tips: [
    "Choose busy stalls with high turnover.",
    "Ask locals for the best current snack shops.",
    "Keep spice level moderate on the first day.",
  ],
  budget: "INR 400-900 per person per day for casual local food.",
};

export async function getFoodGuide({ city }) {
  const normalizedCity = String(city ?? "").toLowerCase();
  const matchedCity = Object.keys(cityFoodGuides).find((key) =>
    normalizedCity.includes(key),
  );
  const guide = matchedCity ? cityFoodGuides[matchedCity] : defaultGuide;

  return {
    source: matchedCity ? "Curated city food profile" : "General local food profile",
    city,
    ...guide,
  };
}
