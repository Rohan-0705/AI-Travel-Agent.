export async function getFoodGuide({ city }) {
  const destination = String(city ?? "this destination").trim() || "this destination";

  return {
    source: "General local food guide",
    city: destination,
    style:
      `I do not have a verified live food source for ${destination} in this run, so this guide stays general instead of inventing city-specific dishes.`,
    mustTry: [
      "Ask for the current local breakfast specialty",
      "Try a regional thali from a busy local restaurant",
      "Use market snacks only from stalls with high turnover",
      "Keep one relaxed dinner close to your stay",
    ],
    areas: [
      "Main market or central food streets only after checking recent map reviews",
      "Busy transport or college areas for budget snacks",
      "Well-reviewed family restaurants for safer full meals",
    ],
    tips: [
      "Check recent reviews before choosing restaurants.",
      "Ask locals or hotel staff for current popular dishes.",
      "Start with moderate spice and keep bottled water handy.",
    ],
    budget: "Use this as a placeholder budget only: INR 400-900 per person per day for casual local meals.",
  };
}
