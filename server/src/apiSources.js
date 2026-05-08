export const API_SOURCES = {
  llmProviders: [
    {
      name: "OpenAI",
      env: ["LLM_PROVIDER=openai", "OPENAI_API_KEY", "OPENAI_MODEL"],
      signup: "https://platform.openai.com/api-keys",
      docs: "https://platform.openai.com/docs",
      useFor: "Best default for production agent planning, streaming, and tool-aware responses.",
    },
    {
      name: "Google Gemini",
      env: ["LLM_PROVIDER=gemini", "GEMINI_API_KEY", "GEMINI_MODEL"],
      signup: "https://aistudio.google.com/app/apikey",
      docs: "https://ai.google.dev/gemini-api/docs",
      useFor: "Strong low-cost option with native streaming and function-calling support.",
    },
    {
      name: "xAI Grok",
      env: ["LLM_PROVIDER=xai", "XAI_API_KEY", "XAI_MODEL"],
      signup: "https://console.x.ai/",
      docs: "https://docs.x.ai/docs",
      useFor: "OpenAI-compatible Grok integration for streaming and tool-capable workflows.",
    },
  ],
  travelDataApis: [
    {
      name: "OpenWeather",
      env: ["OPENWEATHER_API_KEY"],
      signup: "https://home.openweathermap.org/api_keys",
      docs: "https://docs.openweather.co.uk/forecast5",
      useFor: "Forecasts and current weather used by the getWeather tool.",
    },
    {
      name: "Google Places API New",
      env: ["GOOGLE_PLACES_API_KEY"],
      signup: "https://console.cloud.google.com/google/maps-apis/credentials",
      docs: "https://developers.google.com/maps/documentation/places/web-service",
      useFor: "High-quality attractions, restaurants, and points of interest for getPlaces.",
    },
    {
      name: "OpenTripMap",
      env: ["OPENTRIPMAP_API_KEY"],
      signup: "https://dev.opentripmap.org/register",
      docs: "https://dev.opentripmap.org/docs",
      useFor: "Free-friendly POI fallback if you do not want Google Places billing.",
    },
    {
      name: "Amadeus Self-Service",
      env: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"],
      signup: "https://developers.amadeus.com/register",
      docs: "https://developers.amadeus.com/self-service/apis-docs",
      useFor: "Optional flight offer search only. This project does not complete flight booking or payments.",
    },
  ],
};
