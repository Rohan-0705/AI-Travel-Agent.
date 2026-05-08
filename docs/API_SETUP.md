# API Setup

This project runs immediately with `LLM_PROVIDER=mock`. Add real keys when you want live model responses and live travel data.

## Required for Real AI

Choose one model provider.

| Provider | Where to get key | Env vars | Used by |
| --- | --- | --- | --- |
| OpenAI | https://platform.openai.com/api-keys | `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL` | Provider-agnostic planning and streaming final responses |
| Google Gemini | https://aistudio.google.com/app/apikey | `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` | Provider-agnostic planning and streaming final responses |
| xAI / Grok | https://console.x.ai/ | `LLM_PROVIDER=xai`, `XAI_API_KEY`, `XAI_MODEL` | OpenAI-compatible Grok planning and streaming final responses |

## Travel Data APIs

| API | Where to get key | Env vars | Tool |
| --- | --- | --- | --- |
| OpenWeather | https://home.openweathermap.org/api_keys | `OPENWEATHER_API_KEY` | `getWeather(city, dates)` via Geocoding API + 5 Day / 3 Hour Forecast |
| Google Places API New | https://console.cloud.google.com/google/maps-apis/credentials | `GOOGLE_PLACES_API_KEY` | `getPlaces(city, interests)` |
| OpenTripMap | https://dev.opentripmap.org/register | `OPENTRIPMAP_API_KEY` | fallback for `getPlaces(city, interests)` |
| Amadeus Self-Service | https://developers.amadeus.com/register | `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | `searchFlights(origin, destination, departureDate)` |
| MongoDB Atlas | https://www.mongodb.com/cloud/atlas/register | `MONGO_URI` | optional chat and plan persistence |

## Recommended Setup

For the cleanest demo:

1. Use `LLM_PROVIDER=gemini` or `LLM_PROVIDER=openai`.
2. Add `OPENWEATHER_API_KEY`.
3. Add either `GOOGLE_PLACES_API_KEY` or `OPENTRIPMAP_API_KEY`.
4. Add Mongo only if you want saved conversations.
5. Add Amadeus after you collect origin, destination, and ISO travel dates from the user.

## How the Keys Are Used

- The frontend never receives secret keys.
- React talks to the Node backend through Socket.io.
- The backend agent decides a plan, runs tools, and streams chunks back to React.
- API keys stay in `.env` and are read only by `server/` code.

## Run Locally

```bash
cp .env.example .env
npm install
npm run dev:server
```

In another terminal:

```bash
npm run dev:client
```

Open `http://127.0.0.1:5173`.
