import { estimateCost } from "./cost.js";
import { searchFlights } from "./flights.js";
import { getFoodGuide } from "./foodGuide.js";
import { getPlaceInsight } from "./placeInsight.js";
import { getPlaces } from "./places.js";
import { getTravelGuide } from "./travelGuide.js";
import { getWeather } from "./weather.js";

const tools = {
  getWeather,
  getPlaces,
  estimateCost,
  searchFlights,
  getFoodGuide,
  getPlaceInsight,
  getTravelGuide,
};

export const toolDefinitions = [
  {
    name: "getWeather",
    description: "Get forecast weather for a city and date phrase.",
    params: {
      city: "string",
      dates: "string",
    },
  },
  {
    name: "getPlaces",
    description: "Find attractions, restaurants, and points of interest for a destination.",
    params: {
      city: "string",
      interests: "string[]",
    },
  },
  {
    name: "estimateCost",
    description: "Estimate trip costs based on destination, travelers, pace, and trip length.",
    params: {
      city: "string",
      days: "number",
      travelers: "number",
      budgetStyle: "budget | balanced | premium",
    },
  },
  {
    name: "searchFlights",
    description: "Search sample flight offers when origin, destination, and dates are available.",
    params: {
      origin: "IATA code",
      destination: "IATA code",
      departureDate: "YYYY-MM-DD",
      returnDate: "YYYY-MM-DD",
      travelers: "number",
    },
  },
  {
    name: "getFoodGuide",
    description: "Explain a city's local food style, must-try dishes, eating areas, and practical tips.",
    params: {
      city: "string",
      interests: "string[]",
    },
  },
  {
    name: "getTravelGuide",
    description: "Answer direct travel questions about transport, safety, stays, packing, local etiquette, and general trip decisions.",
    params: {
      city: "string",
      topic: "transport | safety | stays | packing | general",
      question: "string",
    },
  },
  {
    name: "getPlaceInsight",
    description: "Explain a specific place or seasonal travel choice, including monsoon waterfall and winter hill-station guidance.",
    params: {
      city: "string",
      place: "string",
      season: "monsoon | winter | summer | empty",
      question: "string",
    },
  },
];

export async function runTool(name, args = {}) {
  const tool = tools[name];

  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return tool(args);
}
