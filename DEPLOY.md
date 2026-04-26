# DEPLOY.md — get Thulla live, for free

By the end of this guide you'll have a public URL like `playthulla.vercel.app` that you can share with anyone, on any device. Total cost: $0. Total time: ~15 minutes the first time, then auto-deploy on every push.

## Prerequisites (one-time, ~10 min)

Install these on the machine you'll be coding on:

1. **Node.js LTS** — https://nodejs.org → grab the LTS installer → next, next, finish. To verify: open a terminal and run `node --version` (should print v20.x or v22.x).
2. **Git** — https://git-scm.com → install with default options. Verify: `git --version`.
3. **GitHub account** — https://github.com → sign up if you don't already have one. Free.
4. **Vercel account** — https://vercel.com → click "Sign up", use **"Continue with GitHub"**. This links them automatically.

Working from a second machine (laptop) later? You'll need Node + Git installed there too. Or skip the install entirely and use [GitHub Codespaces](https://github.com/codespaces) — a full dev environment in your browser, free 60 hours/month.

Socials (Insta/TikTok/Facebook) on your phone is fine and normal — keep them separate from your dev machine.

## Step 1 — get the project running locally

In a terminal, navigate to wherever you want the project to live (e.g., `Documents/code/`), then:

```bash
# unpack the playthulla folder I created for you here
cd playthulla

# install dependencies
npm install

# run dev server
npm run dev
```

Open `http://localhost:5173` in your browser. You should see the THULLA menu. Click around, play a vs-AI game. Verify everything works on your machine first.

When you're ready, stop the server with `Ctrl+C`.

## Step 2 — push to GitHub

```bash
# from inside the playthulla/ folder
git init
git add .
git commit -m "Phase 3: bots, coins, ladder, auth scaffolding"
```

Now create the remote repo:

1. Go to https://github.com/new
2. Repository name: `playthulla` (or whatever you want)
3. Keep it **Public** (Vercel free tier works with private too, public is simpler)
4. **Do NOT** check "Initialize this repository with a README" — we already have files
5. Click "Create repository"

GitHub now shows you commands. Use the **"…or push an existing repository from the command line"** block:

```bash
git remote add origin https://github.com/YOUR-USERNAME/playthulla.git
git branch -M main
git push -u origin main
```

Refresh the GitHub page. Your code should be there.

## Step 3 — connect Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository" — find `playthulla` in the list, click **Import**
3. **Project Name:** `playthulla` (this becomes part of the URL: `playthulla.vercel.app`)
4. **Framework Preset:** Vercel should auto-detect "Vite". If not, pick it from the dropdown.
5. **Build & Output settings:** leave defaults (`npm run build` / `dist`)
6. **Environment Variables:** skip for now — add Supabase keys later (see `SUPABASE.md`)
7. Click **Deploy**

Wait ~60 seconds. Vercel runs `npm install && npm run build`, then publishes the result.

## Step 4 — your URL is live

Vercel shows you a URL: something like `playthulla.vercel.app` (if available) or `playthulla-xyz.vercel.app`. **Click it. Test the live game on your phone.** Send the link to a friend. Real product, in the world.

## Step 5 — auto-deploy on every push

You don't need to do anything else. Now whenever you commit + push to GitHub:

```bash
# after editing some files
git add .
git commit -m "what changed"
git push
```

…Vercel notices, rebuilds, and updates the live site within a minute. **No manual deploys ever again.**

## Step 6 (optional) — custom domain

When you're ready to upgrade `playthulla.vercel.app` to `playthulla.com`:

1. Buy `playthulla.com` from a registrar (Namecheap, Cloudflare Registrar — pick the cheapest, ~$10/year)
2. In Vercel: project → Settings → Domains → Add → type `playthulla.com`
3. Vercel shows you DNS records (A and CNAME). Paste these into your registrar's DNS settings.
4. Wait 5–60 minutes for DNS propagation. Free SSL is automatic.

## Common gotchas

- **`npm install` errors with EACCES / permission denied (macOS/Linux)** — never `sudo npm install`. Fix npm permissions: see https://docs.npmjs.com/resolving-eacces-permissions-errors
- **Vercel build fails with "command not found: vite"** — make sure `package.json` has `"scripts": { "build": "vite build" }`. Already correct in this project.
- **Live site shows blank page** — open browser console (F12). Most often a missing import. Run `npm run build` locally first to catch this before pushing.
- **Pushed but Vercel didn't rebuild** — go to Vercel project → Deployments → check status. If failing, click into the latest deployment to see the error log.

## What about the laptop?

Cleanest workflow:

1. On your **PC**: code, commit, push.
2. On your **laptop**: `git clone https://github.com/YOUR-USERNAME/playthulla.git`, `npm install`, `npm run dev`. Edit, commit, push from laptop too.
3. GitHub is the source of truth. Vercel auto-deploys regardless of which machine pushed.

If you don't want to install Node/Git on the laptop: open the repo on github.com, click **Code** → **Codespaces** → **Create codespace on main**. That's a full VS Code in the browser with everything pre-installed. Edit, commit, push — same as local.

## Next

- `SUPABASE.md` — turn on accounts, cloud save, and Facebook OAuth
- `MULTIPLAYER.md` — wire up online multiplayer with room codes
