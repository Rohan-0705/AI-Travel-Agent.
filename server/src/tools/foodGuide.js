import { resolveTravelDestination } from "./destinationResolver.js";

const cityProfiles = [
  {
    keys: ["sangli"],
    source: "Sangli regional food guide",
    style:
      "Sangli food is practical, homely Maharashtrian eating with Kolhapuri influence nearby: misal, vada pav, poha breakfasts, simple thalis, farsan, jaggery-forward sweets, and market snacks work better here than fancy cafe-hopping.",
    mustTry: [
      "Misal pav",
      "Vada pav",
      "Poha or upma breakfast",
      "Maharashtrian veg thali",
      "Kolhapuri-style tambda or pandhra rassa nearby",
      "Bhadang or farsan",
      "Jaggery sweets or chikki from a busy shop",
    ],
    areas: [
      "Ganapati Mandir and old-city lanes for quick snacks after sightseeing",
      "Sangli market lanes for breakfast items, farsan, sweets, and local shop food",
      "Sangli-Miraj Road for casual family restaurants and safer dinner choices",
      "Bus stand and college-side pockets for budget snacks with high turnover",
    ],
    tips: [
      "Use busy local places for snacks and sweets; freshness matters more than decor here.",
      "Kolhapuri-style gravies can be spicy, so ask for medium spice first.",
      "Keep heavier thalis for lunch and use evening for lighter snacks or a simple dinner.",
    ],
    budget: "INR 300-700 per person per day for snacks plus simple meals; INR 800-1,400 for a more comfortable food day.",
  },
  {
    keys: ["kolhapur"],
    source: "Kolhapur regional food guide",
    style:
      "Kolhapur is one of Maharashtra's strongest food cities, famous for bold spice, mutton thalis, tambda rassa, pandhra rassa, misal, jaggery, and street snacks around old-city temple and lake areas.",
    mustTry: [
      "Kolhapuri mutton thali",
      "Tambda rassa",
      "Pandhra rassa",
      "Kolhapuri misal",
      "Veg thali near the old city",
      "Kolhapuri bhel",
      "Local jaggery or sweets",
    ],
    areas: [
      "Mahalaxmi Temple and old-city lanes for traditional meals and snacks",
      "Rankala Lake side for evening snacks and relaxed food stops",
      "Station and market areas for budget thalis and quick breakfast",
      "Well-reviewed family restaurants for non-veg Kolhapuri meals",
    ],
    tips: [
      "Ask spice level clearly, especially for tambda rassa and misal.",
      "Temple-area lanes get busy, so keep valuables secure and choose clean, crowded places.",
      "Try heavier meat thalis at lunch if you still have sightseeing later.",
    ],
    budget: "INR 400-900 per person per day for casual meals; INR 1,000-1,800 if you include a known mutton thali restaurant.",
  },
  {
    keys: ["north goa", "calangute", "baga", "anjuna", "vagator", "candolim"],
    source: "North Goa food guide",
    style:
      "North Goa food is beach-shack seafood, Goan curries, cafe breakfasts, bakery snacks, and late-evening market food. It is best planned by beach cluster: Candolim-Calangute-Baga, Anjuna-Vagator, and Panjim/Mapusa for a more local angle.",
    mustTry: [
      "Goan fish curry rice",
      "Prawn curry or recheado fish",
      "Chicken cafreal",
      "Pork vindaloo or sorpotel if you eat pork",
      "Poi bread",
      "Bebinca",
      "Cafe breakfast in Anjuna or Vagator",
    ],
    areas: [
      "Candolim and Calangute for easy beach-shack seafood and family restaurants",
      "Baga and Tito's Lane for late-evening food, bars, and busy casual dining",
      "Anjuna and Vagator for cafes, sunset food stops, and market-side snacks",
      "Mapusa Market or Panjim if you want more local Goan food away from beach pricing",
    ],
    tips: [
      "Beach shacks vary a lot by season, so check recent reviews before choosing seafood.",
      "Separate alcohol-heavy party lanes from family dinner plans if the group wants a calmer night.",
      "Keep one Panjim or Mapusa meal if you want more local food than tourist-beach menus.",
    ],
    budget: "INR 600-1,200 per person per day for casual food; INR 1,500-2,500 with seafood, cafes, and beach-shack dinners.",
  },
  {
    keys: ["south goa", "colva", "benaulim", "varca", "cavelossim", "palolem", "patnem", "canacona"],
    source: "South Goa food guide",
    style:
      "South Goa food is calmer coastal eating: seafood thalis, fish curry rice, shack meals on quieter beaches, bakery snacks, and relaxed dinners near Colva, Benaulim, Cavelossim, Palolem, and Patnem.",
    mustTry: [
      "Fish curry rice",
      "Seafood thali",
      "Rava-fried fish",
      "Chicken cafreal",
      "Goan xacuti",
      "Poi bread",
      "Bebinca or dodol",
    ],
    areas: [
      "Benaulim and Colva for easy seafood thalis and casual family restaurants",
      "Cavelossim and Mobor for quieter beach-side dinners",
      "Palolem and Patnem for shack meals, cafes, and relaxed evening food",
      "Margao if you want market-side Goan meals and bakery stops",
    ],
    tips: [
      "Choose seafood places with visible turnover and recent reviews.",
      "South Goa is spread out, so eat near your beach cluster instead of crossing the region late.",
      "Keep sunset beach time and dinner in the same area for a smoother evening.",
    ],
    budget: "INR 600-1,200 per person per day for casual meals; INR 1,400-2,400 with seafood dinners and cafes.",
  },
  {
    keys: ["goa"],
    source: "Goa food guide",
    style:
      "Goa's food is coastal, Catholic-Goan, Konkani, and cafe-driven: fish curry rice, seafood thalis, cafreal, xacuti, vindaloo, poi bread, bebinca, and beach-shack meals. North Goa is busier and cafe-heavy; South Goa is calmer and better for relaxed seafood days.",
    mustTry: [
      "Fish curry rice",
      "Seafood thali",
      "Chicken cafreal",
      "Goan xacuti",
      "Pork vindaloo or sorpotel if you eat pork",
      "Poi bread",
      "Bebinca",
    ],
    areas: [
      "Panjim and Fontainhas for Goan restaurants, bakeries, and heritage-lane meals",
      "Candolim-Calangute-Baga for beach shacks and easy tourist dining",
      "Anjuna-Vagator for cafes, markets, and sunset food stops",
      "Benaulim-Palolem for calmer South Goa seafood and shack meals",
    ],
    tips: [
      "Check seasonal shack openings before planning a specific beach meal.",
      "Use Panjim or Mapusa for a local-food break from beach pricing.",
      "Seafood freshness and reviews matter more than sea-facing tables.",
    ],
    budget: "INR 700-1,400 per person per day for casual food; INR 1,600-2,800 with seafood, cafes, and beach-shack dinners.",
  },
  {
    keys: ["dandeli"],
    source: "Dandeli regional food guide",
    style:
      "Dandeli food is more about simple North Karnataka meals, homestay cooking, resort buffets, market snacks, and practical post-activity food than destination restaurants. Plan food around your rafting, jungle, or stay location.",
    mustTry: [
      "Jolada rotti with vegetable curries",
      "North Karnataka thali",
      "Idli, dosa, or poha breakfast",
      "Local homestay meal",
      "Fresh lime soda or buttermilk after outdoor activity",
      "Simple chicken or fish curry where well reviewed",
    ],
    areas: [
      "Central Dandeli market for quick meals, snacks, and breakfast",
      "Homestay or resort kitchens for safer dinners after outdoor activities",
      "Bus stand area for budget food with high turnover",
      "Activity pickup zones only for quick snacks, not a full food plan",
    ],
    tips: [
      "Confirm meal inclusions with your stay, because food options thin out near jungle stays.",
      "Eat light before rafting or water activities.",
      "Carry snacks and water for long nature blocks; do not depend on finding cafes inside forest routes.",
    ],
    budget: "INR 350-800 per person per day for simple local meals; INR 900-1,600 if meals are bundled with a resort or activity stay.",
  },
  {
    keys: ["manali", "old manali", "solang", "vashisht"],
    source: "Manali food guide",
    style:
      "Manali food mixes Himachali dishes, trout, Tibetan snacks, North Indian comfort food, and Old Manali cafe culture. It works best when you pair local dishes with warm meals after sightseeing or cold-weather drives.",
    mustTry: [
      "Siddu",
      "Himachali dham",
      "Trout fish if you eat fish",
      "Thukpa",
      "Momos",
      "Tibetan bread or noodles",
      "Apple desserts or local fruit products",
    ],
    areas: [
      "Old Manali for cafes, breakfasts, and relaxed dinners",
      "Mall Road for easy family restaurants and quick meals",
      "Vashisht for lighter cafe stops after temple or hot-spring visits",
      "Naggar-side cafes if your route includes Naggar Castle",
    ],
    tips: [
      "Keep warm, filling meals after Solang or high-altitude day trips.",
      "Ask locally for the best siddu or dham availability because some dishes are timing-dependent.",
      "Avoid heavy meals just before long hill drives.",
    ],
    budget: "INR 500-1,100 per person per day for casual meals; INR 1,300-2,200 with cafes, trout, and nicer dinners.",
  },
  {
    keys: ["mumbai", "bombay"],
    source: "Mumbai food guide",
    style:
      "Mumbai food is street snacks, coastal meals, Irani cafes, old-city sweets, and neighborhood-specific eating. The strongest food days cluster by area: South Mumbai, Bandra/Juhu, Dadar/Matunga, or the beach-side snack belt.",
    mustTry: [
      "Vada pav",
      "Pav bhaji",
      "Bhel or sev puri",
      "Bombay sandwich",
      "Kheema pav or Irani cafe breakfast",
      "Seafood thali",
      "Kulfi or falooda",
    ],
    areas: [
      "Fort, Colaba, and Kala Ghoda for cafes, Irani food, and South Mumbai classics",
      "Girgaon Chowpatty and Marine Drive area for evening snacks",
      "Dadar and Matunga for Maharashtrian and South Indian food",
      "Bandra or Juhu for cafes, bakeries, and beach-side snacks",
    ],
    tips: [
      "Street food is best at crowded stalls with fast turnover.",
      "Avoid mixing far-apart food neighborhoods in one evening because Mumbai transit can eat the plan.",
      "Keep seafood meals to well-reviewed restaurants rather than random beach stalls.",
    ],
    budget: "INR 500-1,200 per person per day for mixed street food and casual meals; INR 1,500-3,000 with seafood and cafes.",
  },
  {
    keys: ["pune"],
    source: "Pune food guide",
    style:
      "Pune food works best as old-city snacks, Maharashtrian breakfast, misal, thalis, bakery stops, and student-area cafes. It is a good city for compact food walks if you avoid peak traffic hops.",
    mustTry: [
      "Misal pav",
      "Vada pav",
      "Poha",
      "Sabudana khichdi or vada",
      "Maharashtrian thali",
      "Mastani",
      "Bakery snacks",
    ],
    areas: [
      "Old Pune and Tulshibaug lanes for snacks and sweets",
      "FC Road and JM Road for student food, cafes, and quick meals",
      "Koregaon Park for cafes and calmer dinners",
      "Camp area for bakeries and older food institutions",
    ],
    tips: [
      "Use old-city food with Shaniwar Wada and Dagdusheth rather than crossing the city mid-day.",
      "Misal spice varies widely, so start moderate.",
      "Keep cafes for evening if heritage lanes get hot or crowded.",
    ],
    budget: "INR 400-900 per person per day for snacks and casual meals; INR 1,100-2,000 with cafes and full thalis.",
  },
  {
    keys: ["satara"],
    source: "Satara food guide",
    style:
      "Satara food is simple Maharashtrian meals, misal, snacks, and famous kandi pedhe. It pairs well with waterfall, fort, and Kaas-side routes when you plan meals before leaving the city core.",
    mustTry: [
      "Kandi pedhe",
      "Misal pav",
      "Maharashtrian thali",
      "Poha breakfast",
      "Vada pav",
      "Local sweets from busy shops",
    ],
    areas: [
      "Satara city market for breakfast, snacks, and sweets",
      "Bus stand and central lanes for quick budget meals",
      "Well-reviewed restaurants before Thoseghar, Kaas, or Chalkewadi drives",
      "Roadside tea and snack stops only where they look busy and clean",
    ],
    tips: [
      "Buy kandi pedhe from established shops with steady turnover.",
      "Eat before long nature routes because options can become limited.",
      "Keep monsoon drives food-flexible in case road timing changes.",
    ],
    budget: "INR 300-750 per person per day for simple meals; INR 900-1,500 with sweets and a comfortable restaurant meal.",
  },
];

const stateProfiles = [
  {
    keys: ["maharashtra"],
    source: "Maharashtra regional food guide",
    style:
      "For Maharashtra, plan around misal, vada pav, poha, thalis, farsan, local sweets, and regional spice styles. The best food stops are usually central markets, old-city lanes, and busy family restaurants.",
    mustTry: [
      "Misal pav",
      "Vada pav",
      "Poha",
      "Maharashtrian thali",
      "Sabudana vada",
      "Local farsan",
      "Regional sweets",
    ],
    areas: [
      "Old-city or temple-adjacent lanes for snacks after sightseeing",
      "Central market for breakfast, sweets, and quick food",
      "Bus stand or college areas for budget snacks",
      "Well-reviewed family restaurants for safer full meals",
    ],
    tips: [
      "Ask for spice level before ordering misal or regional gravies.",
      "Choose snack places with high turnover.",
      "Use thalis for lunch and lighter snacks for evening.",
    ],
    budget: "INR 350-900 per person per day for casual Maharashtrian meals; more if you add specialty non-veg meals.",
  },
  {
    keys: ["goa"],
    source: "Goa regional food guide",
    style:
      "Goa food is coastal Konkani and Goan Catholic cooking: fish curry rice, seafood thalis, cafreal, xacuti, vindaloo, poi bread, sweets, beach shacks, and bakery stops.",
    mustTry: [
      "Fish curry rice",
      "Seafood thali",
      "Chicken cafreal",
      "Goan xacuti",
      "Poi bread",
      "Bebinca",
    ],
    areas: [
      "Panjim or Mapusa for local Goan restaurants and markets",
      "North Goa beach belt for cafes and busy shacks",
      "South Goa beach belt for calmer seafood meals",
      "Old Goa and Fontainhas for heritage-day meal breaks",
    ],
    tips: [
      "Check seasonal shack openings and recent seafood reviews.",
      "Eat close to your beach cluster at night to avoid long transfers.",
      "Balance beach menus with one market or Panjim meal.",
    ],
    budget: "INR 700-1,600 per person per day, depending on seafood and cafe choices.",
  },
  {
    keys: ["karnataka"],
    source: "Karnataka regional food guide",
    style:
      "Karnataka food changes by region, but for most trips you can rely on idli-dosa breakfasts, jolada rotti meals in the north, thalis, filter coffee, local snacks, and simple homestay food near nature routes.",
    mustTry: [
      "Idli or dosa breakfast",
      "Jolada rotti meal where available",
      "Vegetarian thali",
      "Bisi bele bath",
      "Filter coffee",
      "Local market snacks",
    ],
    areas: [
      "Central market lanes for breakfast and snacks",
      "Bus stand or college areas for budget meals",
      "Well-reviewed family restaurants for full meals",
      "Homestay or resort kitchens near nature destinations",
    ],
    tips: [
      "Confirm meal availability before remote nature routes.",
      "Choose busy breakfast places for better freshness.",
      "Carry water and snacks on forest or viewpoint days.",
    ],
    budget: "INR 350-900 per person per day for simple meals; more for resort dining or specialty restaurants.",
  },
  {
    keys: ["himachal pradesh", "himachal"],
    source: "Himachal regional food guide",
    style:
      "Himachal food combines local mountain dishes, Tibetan snacks, North Indian meals, trout in some valleys, tea, bakeries, and cafe food. Warm, filling meals after high-altitude sightseeing usually work best.",
    mustTry: [
      "Siddu",
      "Himachali dham",
      "Thukpa",
      "Momos",
      "Trout where locally available",
      "Tea and bakery snacks",
    ],
    areas: [
      "Main market or Mall Road for easy meals",
      "Old-town or cafe lanes for breakfasts and relaxed dinners",
      "Homestay kitchens for local food if available",
      "Viewpoint routes only for tea/snacks unless reviews are strong",
    ],
    tips: [
      "Keep heavy meals away from long hill drives.",
      "Ask locally which dishes are actually available that day.",
      "Carry snacks for mountain-route buffers.",
    ],
    budget: "INR 500-1,300 per person per day for casual meals; more for cafes and specialty trout meals.",
  },
];

const fallbackProfile = {
  source: "Regional Indian food guide",
  style:
    "Use this as a practical regional food plan: start with the city's busy market lanes, choose local thalis or breakfast dishes, keep snacks to high-turnover stalls, and verify current restaurant choices with recent map reviews before going.",
  mustTry: [
    "Local breakfast specialty",
    "Regional thali",
    "Market snacks from busy stalls",
    "A well-reviewed family restaurant meal",
    "Local sweets or bakery item",
  ],
  areas: [
    "Main market or old-city lanes for breakfast and snacks",
    "Transport or college areas for budget food",
    "Well-reviewed family restaurants for full meals",
    "A stay-recommended dinner place for the first night",
  ],
  tips: [
    "Use recent reviews for restaurant selection because openings and quality change fast.",
    "Ask hotel staff or locals for the dish the city is currently known for.",
    "Start with moderate spice and keep bottled water handy.",
  ],
  budget: "INR 400-900 per person per day for casual local meals; adjust upward for seafood, cafes, or specialty restaurants.",
};

export async function getFoodGuide({ city }) {
  const destination = String(city ?? "this destination").trim() || "this destination";
  const resolved = await resolveTravelDestination(destination).catch(() => null);
  const profile = getProfile(destination, resolved);

  return {
    source: profile.source,
    city: resolved?.locality || resolved?.name || destination,
    state: resolved?.state || "",
    style: profile.style,
    mustTry: profile.mustTry,
    areas: profile.areas,
    tips: [
      ...profile.tips,
      "Before choosing a specific restaurant, check very recent reviews and opening hours.",
    ],
    budget: profile.budget,
  };
}

function getProfile(destination, resolved) {
  const normalizedValues = [
    destination,
    resolved?.input,
    resolved?.query,
    resolved?.name,
    resolved?.locality,
    resolved?.state,
  ]
    .filter(Boolean)
    .map(normalizeName);

  return (
    findProfile(cityProfiles, normalizedValues) ||
    findProfile(stateProfiles, normalizedValues) ||
    fallbackProfile
  );
}

function findProfile(profiles, normalizedValues) {
  return profiles.find((profile) =>
    profile.keys.some((key) => {
      const normalizedKey = normalizeName(key);

      return normalizedValues.some(
        (value) => value === normalizedKey || value.includes(normalizedKey),
      );
    }),
  );
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
