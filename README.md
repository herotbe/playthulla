# Thulla

> throw down. or get thulla'd.

The desi card game, online. Built with Vite + React + Tailwind. Free to host. Works offline-first, with a paved path to online multiplayer + accounts.

## What's in this project

- **Solo vs AI** — three difficulties, six bot personalities. Fully playable today.
- **Local pass-and-play** — 4 humans, one phone.
- **Coins + cosmetics shop** — themes, avatars, card backs, slam effects. Saved on-device for now, sync to cloud once Supabase is connected.
- **Stakes rooms** — wager coins, winner takes the pot.
- **Trophy ladder** — local leaderboard, ready to go global.
- **Auth scaffolding** — email + Google + Facebook sign-in (turn on once Supabase is configured).
- **Online multiplayer with room codes** — fully designed, wiring is one session away. See `MULTIPLAYER.md`.
- **Logo assets** — `public/logo-wordmark.svg`, `public/logo-icon.svg`, `public/favicon.svg`. Open `public/logo-preview.html` in a browser to grab high-res copies for socials.

## Quick start

You'll need [Node.js (LTS)](https://nodejs.org) and [Git](https://git-scm.com). Both are one-time installs.

```bash
# install dependencies (one time)
npm install

# run dev server (live-reloads on save)
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). The game runs entirely in the browser — no backend needed for solo and local play.

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Vercel/Netlify pick this up automatically.

## Project layout

```
playthulla/
├── public/                  static files served as-is
│   ├── logo-wordmark.svg
│   ├── logo-icon.svg
│   ├── favicon.svg
│   └── logo-preview.html    open this to grab logos for socials
├── src/
│   ├── main.jsx             entry point
│   ├── App.jsx              the whole game UI + flow
│   ├── index.css            Tailwind directives
│   └── lib/
│       ├── botAI.js         bot brain — difficulties + personalities
│       ├── store.js         coins / cosmetics / trophies (localStorage now)
│       └── supabase.js      auth + multiplayer client (dormant until configured)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example             copy to .env.local when adding Supabase
├── DEPLOY.md                ↳ get the game live for free
├── SUPABASE.md              ↳ turn on accounts + cloud save + Facebook OAuth
├── MULTIPLAYER.md           ↳ design spec for online play (next session)
└── README.md                this file
```

## What's free, what costs money

| Thing | Free? |
|---|---|
| Hosting on Vercel/Netlify/Cloudflare Pages | yes, indefinitely |
| GitHub repo | yes |
| Custom domain (`*.vercel.app`) | yes |
| Real `.com` domain | ~$10/year |
| Supabase (auth + Postgres + Realtime) | free tier covers low thousands of users |
| Google + Facebook OAuth | free |
| Apple App Store dev account | $99/year (only if you ship native iOS) |
| Google Play dev account | $25 one-time (only if you ship native Android) |

You can launch and grow this entire project to thousands of daily players for **$0**.

## Roadmap

- ✅ **Phase 3** — bots, coins, cosmetics, stakes, ladder, auth scaffolding (this release)
- ⏭ **Phase 4** — Supabase wiring: real accounts, cloud save, Facebook/Google sign-in (one session, see `SUPABASE.md`)
- ⏭ **Phase 5** — online multiplayer with 4-letter room codes (one session, see `MULTIPLAYER.md`)
- ⏭ **Phase 6** — push notifications, mobile app wrappers (Capacitor → iOS/Android), opt-in ads
- ⏭ **Phase 7** — friends list, chat, daily/weekly tournaments, seasonal ladder

## License

All rights reserved by the project owner during development. Public license decision deferred until launch.
