# MCSRR Ranked Stats

This repository contains a Next.js application called **mcsrrrankedstats**.  It is designed to fetch and visualize speed‑running match statistics from the [MCSR Ranked API](https://docs.mcsrranked.com), allowing users to explore their personal speed‑running data with rich filtering and interactive charts.

## Features

- Search for a player by nickname, UUID or Discord ID and browse all of their ranked/casual matches.
- Client‑side filtering on multiple dimensions including overworld structures, bastion types, end tower heights, seed variations and match type.
- Overview cards summarizing total matches, completions, win rate, forfeits and more.
- Time‑series charts showing completion times over time and histograms of run durations.
- Breakdown bar charts of most common overworld and bastion seed types.
- A flexible architecture that can be extended to include additional seed parameters or fetch additional per–match data from the API (e.g. timelines, splits).

## Getting Started

This project uses Next.js with the app router and TypeScript.  To run it locally you need Node.js installed (tested with Node 18 and 22).  Because this repository only contains source code, you will need to install dependencies and set up an environment file.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the `.env.example` file to `.env.local` and fill in your API base URL and optional API key.  The API key is optional but recommended if you need higher rate limits.

   ```bash
   cp .env.example .env.local
   # then edit .env.local and provide your API key if needed
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

## Project Structure

```
mcsrrrankedstats/
├── app/
│   ├── page.tsx                — Home page with player search
│   ├── u/[identifier]/
│   │   ├── page.tsx            — Server entry point for the user stats page
│   │   └── ui.tsx              — Client component implementing filtering and charts
│   └── api/mcsr/
│       ├── user-matches/route.ts — API route proxying calls to fetch user matches
│       └── match/route.ts        — API route proxying calls to fetch individual match details
├── components/
│   ├── FilterPanel.tsx         — Filter controls for seeds and match properties
│   ├── MatchTable.tsx          — Table listing filtered matches
│   ├── SearchBar.tsx           — Input component on the home page
│   ├── StatCards.tsx           — Summary cards of overall stats
│   └── charts/
│       ├── BreakdownBar.tsx    — Vertical bar chart for seed breakdowns
│       ├── TimeHistogram.tsx   — Histogram of completion times
│       └── TimeTrend.tsx       — Line chart of completion times over time
├── lib/
│   ├── mcsr.ts                 — Helper functions to interact with the MCSR API
│   └── stats.ts                — Filtering and summarization logic
├── types/
│   └── mcsr.ts                 — TypeScript definitions for API data structures
├── next.config.js              — Next.js configuration enabling the app directory
├── tsconfig.json               — TypeScript configuration
├── package.json                — NPM configuration and dependencies
└── README.md                   — This file
```

## Notes

This application does not persist or store any user data.  All filtering is performed client‑side after fetching the complete list of matches for the selected user.  The number of API calls may be large for users with hundreds of matches; in production you may want to implement pagination or server‑side caching.

Recharts is used for charts because it offers responsive charts out of the box and works well with React Server Components.  You can swap it out for another library if you prefer.

### Extending the App

The MCSR Ranked API exposes additional fields (like match timelines and completions) on the `/matches/{match_id}` endpoint.  To include these advanced statistics, you can add a background enrichment process.  For example, once the user’s base match list is loaded, you can fetch details for the most recent N matches and merge them into your data set.  The architecture of this app is designed to allow such extensions without major rewrites.

## License

This project is provided as‑is under the MIT license.  It is intended as a learning exercise and a starting point for your own speed‑running analytics dashboard.