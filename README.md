# Hard Power Index (HPI)

HPI is a full-stack geopolitical intelligence dashboard that ranks 50 countries strictly by hard-power capacity. It uses nine weighted, normalized criteria: military strength (25%), absolute GDP (20%), industrial output (10%), trade volume (10%), energy production (10%), nuclear capability (8%), strategic influence (7%), logistics/infrastructure (5%), and currency power (5%).

## Project layout

```
apps/
  api/      Express API, MongoDB comments, scheduled World Bank refresh
  web/      Next.js + Tailwind + Recharts dashboard
```

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI`. A local MongoDB URL works too.
2. Install dependencies with `npm install`.
3. Start the dashboard and API with `npm run dev`.
4. Open `http://localhost:3000`.

The API runs at `http://localhost:4000`. It refreshes public World Bank GDP, trade, industry, and electricity-production measurements at startup and every 24 hours. It retains a curated baseline if a provider is unavailable. Military, nuclear, strategic influence, logistics, and currency components are deliberately modelled expert baselines; SIPRI/Comtrade/energy-provider adapters can be added in `apps/api/src/rankings.js` when licensed API access is available.

Set `OPENAI_API_KEY` to enable the Index AI Analyst. Without one, the assistant uses a clear local-model fallback that still describes the scoring weights and current ranking snapshot.

## Endpoints

- `GET /api/rankings` — 50 ranked countries, their normalized score components, and methodology.
- `POST /api/ask` — `{ "question": "Why is USA ranked #1?" }`.
- `GET /api/comments` — latest-first MongoDB discussion feed.
- `POST /api/comments` — `{ "name": "…", "comment": "…" }`.
