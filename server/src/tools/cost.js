const cityProfiles = {
  sangli: {
    tier: "small-city",
    stay: 1300,
    food: 450,
    localTransport: 350,
    activities: 200,
    buffer: 220,
  },
  miraj: {
    tier: "small-city",
    stay: 1200,
    food: 430,
    localTransport: 320,
    activities: 180,
    buffer: 200,
  },
  kolhapur: {
    tier: "regional-city",
    stay: 1500,
    food: 500,
    localTransport: 450,
    activities: 250,
    buffer: 250,
  },
  satara: {
    tier: "regional-city",
    stay: 1400,
    food: 450,
    localTransport: 400,
    activities: 250,
    buffer: 230,
  },
  pune: {
    tier: "metro",
    stay: 2400,
    food: 800,
    localTransport: 650,
    activities: 450,
    buffer: 450,
  },
  mumbai: {
    tier: "major-metro",
    stay: 3300,
    food: 1000,
    localTransport: 650,
    activities: 500,
    buffer: 500,
  },
  goa: {
    tier: "tourist",
    stay: 2800,
    food: 1000,
    localTransport: 700,
    activities: 700,
    buffer: 500,
  },
  jaipur: {
    tier: "tourist",
    stay: 2600,
    food: 950,
    localTransport: 650,
    activities: 850,
    buffer: 500,
  },
  manali: {
    tier: "tourist",
    stay: 2400,
    food: 850,
    localTransport: 700,
    activities: 900,
    buffer: 500,
  },
};

const defaultProfile = {
  tier: "standard-city",
  stay: 1800,
  food: 650,
  localTransport: 500,
  activities: 350,
  buffer: 320,
};

const internationalMultipliers = {
  kyoto: 6.2,
  tokyo: 6.8,
  paris: 7.2,
  london: 7.5,
  iceland: 8.4,
  reykjavik: 8.4,
};

const budgetMultipliers = {
  budget: 0.72,
  balanced: 1,
  premium: 1.75,
};

export async function estimateCost({
  city,
  days = 3,
  travelers = 2,
  budgetStyle = "balanced",
}) {
  const normalizedCity = String(city ?? "").toLowerCase();
  const matchedCity = findMatchedCity(normalizedCity);
  const profile = matchedCity ? cityProfiles[matchedCity] : defaultProfile;
  const internationalMultiplier =
    Object.entries(internationalMultipliers).find(([key]) =>
      normalizedCity.includes(key),
    )?.[1] ?? 1;
  const styleMultiplier = budgetMultipliers[budgetStyle] ?? 1;
  const adjustedDailyRates = Object.fromEntries(
    Object.entries({
      stay: profile.stay,
      food: profile.food,
      localTransport: profile.localTransport,
      activities: profile.activities,
      buffer: profile.buffer,
    }).map(([key, value]) => [
      key,
      roundToNearest50(value * styleMultiplier * internationalMultiplier),
    ]),
  );
  const safeDays = Math.max(1, Number(days) || 1);
  const safeTravelers = Math.max(1, Number(travelers) || 1);
  const rooms = Math.max(1, Math.ceil(safeTravelers / 2));
  const transportUnits = Math.max(1, Math.ceil(safeTravelers / 4));
  const breakdown = {
    stay: adjustedDailyRates.stay * rooms * safeDays,
    food: adjustedDailyRates.food * safeTravelers * safeDays,
    localTransport: adjustedDailyRates.localTransport * transportUnits * safeDays,
    activities: adjustedDailyRates.activities * safeTravelers * safeDays,
    buffer: adjustedDailyRates.buffer * safeDays,
  };
  const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const dailyPerTraveler = roundToNearest50(total / safeDays / safeTravelers);

  return {
    source: "City-tier component estimator",
    currency: "INR",
    city,
    tier: profile.tier,
    days: safeDays,
    travelers: safeTravelers,
    budgetStyle,
    dailyPerTraveler,
    formattedDailyPerTraveler: `INR ${Intl.NumberFormat("en-IN").format(dailyPerTraveler)}`,
    total,
    formattedTotal: `INR ${Intl.NumberFormat("en-IN").format(total)}`,
    breakdown,
    assumptions: {
      rooms,
      roomBasis: "Stay is estimated per shared room, not per traveler.",
      transportBasis: "Local transport is estimated per small group.",
    },
    note: "Estimate covers shared stay, meals, local transport, modest activities, and a small buffer. It excludes intercity flights/trains, luxury shopping, and premium hotels.",
  };
}

function findMatchedCity(normalizedCity) {
  return Object.keys(cityProfiles).find((city) => normalizedCity.includes(city));
}

function roundToNearest50(value) {
  return Math.round(value / 50) * 50;
}
