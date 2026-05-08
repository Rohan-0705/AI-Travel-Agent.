# AI Travel Assistant

An interview-level MERN + Agentic AI travel planner with:

- React travel chat UI
- Socket.io real-time streaming
- Node/Express agent controller
- Tool calling for weather, places, flights, and cost estimates
- Pluggable LLM providers: mock, OpenAI, Gemini, or xAI/Grok
- Optional MongoDB persistence

## Architecture

```text
User -> React Chat UI -> Socket.io -> Node Agent Controller
                                      -> LLM Provider
                                      -> Tool Layer
                                      -> Weather / Places / Flights / Cost
```

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Run the backend:

```bash
npm run dev:server
```

Run the React client in another terminal:

```bash
npm run dev:client
```

Open `http://127.0.0.1:5173`.

The app works with `LLM_PROVIDER=mock`, so you can demo streaming and tools before adding paid API keys.

## Main Scripts

```bash
npm run dev:client
npm run dev:server
npm run build
npm run start
npm run lint
```

`npm run start` serves the production `dist/` build from the Express server.

## API Keys

See [docs/API_SETUP.md](docs/API_SETUP.md) for exact signup links and environment variables.

Recommended first real setup:

- Gemini or OpenAI for the model
- OpenWeather for weather
- OpenTripMap for a free-friendly places API, or Google Places for richer results
- MongoDB Atlas if you want saved chat history

## Master Prompt

The core agent instructions live in:

```text
server/src/agent/masterPrompt.js
```

The backend uses the master prompt to:

1. Understand intent.
2. Create an execution plan.
3. Select tools.
4. Execute tools.
5. Stream a structured travel plan back to the UI.
