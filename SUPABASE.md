# SUPABASE.md — accounts + cloud save + Facebook OAuth

This guide turns the dormant auth/cloud features in `src/lib/supabase.js` ON. After this:
- Players sign in with email, Google, or Facebook
- Coins, cosmetics, trophies sync to the cloud (work across devices)
- The trophy ladder becomes global instead of local

Cost: **$0 on the free tier** until you have ~50,000 monthly active users or 500MB of data. By then you'll know it's worth $25/month.

## Step 1 — create a Supabase project (3 min)

1. Go to https://supabase.com → Sign in with GitHub
2. Click **New project**
3. **Name:** `playthulla` · **Database password:** generate one and save it in a password manager · **Region:** pick the one closest to your players
4. Click **Create new project**. Wait ~2 minutes for provisioning.

## Step 2 — get your API keys

In your Supabase project dashboard:

1. Settings (gear) → API
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`, very long)

⚠️ The **anon** key is fine to expose in the browser. The **service_role** key NEVER goes in browser code or `.env.local` files prefixed `VITE_`.

## Step 3 — add the keys to your project

Create a file `.env.local` in your project root (next to `package.json`):

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (the anon key)
```

`.env.local` is in `.gitignore` so it never gets committed. Good — those are public-but-don't-spread secrets.

Restart `npm run dev` so Vite picks up the new env vars.

Then go to **Vercel project → Settings → Environment Variables** and add the same two variables there. Redeploy after saving (Vercel will prompt).

## Step 4 — create the database schema

In your Supabase project: SQL Editor → New query → paste the SQL below → click **Run**.

```sql
-- Profiles: one row per signed-in user, holds coins/cosmetics/stats
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar text default '🦁',
  coins integer default 500 not null,
  xp integer default 0 not null,
  level integer default 1 not null,
  selected_theme text default 'classic',
  selected_card_back text default 'paisley',
  selected_slam_fx text default 'classic',
  unlocked jsonb default '{
    "themes":["classic","neon","mehfil"],
    "cardBacks":["paisley"],
    "slamFx":["classic"],
    "avatars":["lion","tiger","eagle","dragon","fox","wolf"]
  }'::jsonb not null,
  stats jsonb default '{"wins":0,"losses":0,"thullas":0,"gamesPlayed":0}'::jsonb not null,
  trophies integer default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: each user can only read/write their own profile
alter table public.profiles enable row level security;

create policy "Read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Public ladder (anyone can read summary fields)
create view public.ladder as
  select id, display_name, avatar, trophies, level
  from public.profiles
  order by trophies desc
  limit 100;

grant select on public.ladder to anon, authenticated;
```

## Step 5 — turn on email auth

By default Supabase has email auth enabled. Verify:

Supabase project → Authentication → Providers → **Email** should be ON. That's it.

Email confirmations are also on by default — users get a confirmation email when they sign up. You can disable that for development (Auth → Providers → Email → "Confirm email" off) but turn it back on for production.

## Step 6 — turn on Google OAuth

1. Go to https://console.cloud.google.com → create a new project (or pick an existing one)
2. APIs & Services → OAuth consent screen
   - User type: **External**, click Create
   - App name: `Thulla` · User support email: yours · Developer contact: yours
   - Save and continue through scopes (no extras needed) and test users (skip for now)
3. APIs & Services → Credentials → **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Thulla Web`
   - **Authorized redirect URIs:** paste this (replace with your Supabase URL):
     ```
     https://xxxxx.supabase.co/auth/v1/callback
     ```
   - Click Create. Copy the **Client ID** and **Client secret** that pop up.
4. Back in Supabase: Authentication → Providers → **Google** → enable → paste Client ID + Client secret → Save.

Test it: in the live site (or local dev), click Sign in → Continue with Google. You should land in Google's consent screen, then back in your app signed in.

## Step 7 — turn on Facebook OAuth

1. Go to https://developers.facebook.com → My Apps → **Create App**
   - Use case: **Authenticate and request data from users with Facebook Login**
   - App name: `Thulla` · contact email: yours
2. After creation, in your app dashboard:
   - Add **Facebook Login** product → Web platform
   - Site URL: `https://playthulla.vercel.app` (your live URL)
3. App settings → Basic — copy **App ID** and **App secret**
4. Facebook Login → Settings → **Valid OAuth Redirect URIs:** paste your Supabase callback (same as Google):
   ```
   https://xxxxx.supabase.co/auth/v1/callback
   ```
   Save changes.
5. Back in Supabase: Authentication → Providers → **Facebook** → enable → paste App ID + App secret → Save.
6. **Switch your Facebook app to "Live" mode** (top of the dashboard) when you're ready for real users. Until then it only works for you and accounts you add as testers.

Test it: Sign in → Continue with Facebook. Should round-trip back to your app signed in.

## Step 8 — sync local profile to cloud

The current `src/lib/store.js` writes to `localStorage`. To swap in Supabase:

Open `src/lib/store.js` and add this companion file `src/lib/cloudStore.js`:

```js
import { supabase } from './supabase.js';

export async function loadCloudProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    displayName: data.display_name || '',
    avatar: data.avatar || '🦁',
    coins: data.coins,
    xp: data.xp,
    level: data.level,
    selectedTheme: data.selected_theme,
    selectedCardBack: data.selected_card_back,
    selectedSlamFx: data.selected_slam_fx,
    unlocked: data.unlocked,
    stats: data.stats,
  };
}

export async function saveCloudProfile(userId, profile) {
  if (!supabase) return;
  await supabase.from('profiles').update({
    display_name: profile.displayName,
    avatar: profile.avatar,
    coins: profile.coins,
    xp: profile.xp,
    level: profile.level,
    selected_theme: profile.selectedTheme,
    selected_card_back: profile.selectedCardBack,
    selected_slam_fx: profile.selectedSlamFx,
    unlocked: profile.unlocked,
    stats: profile.stats,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
}

export async function loadCloudLadder() {
  if (!supabase) return [];
  const { data } = await supabase.from('ladder').select('*');
  return (data || []).map(r => ({
    name: r.display_name || 'unknown',
    avatar: r.avatar || '🃏',
    trophies: r.trophies,
  }));
}
```

Then in `App.jsx`, when a user signs in, load from cloud and merge with local:

```js
useEffect(() => {
  if (!session?.user) return;
  loadCloudProfile(session.user.id).then(cloud => {
    if (cloud) setProfile(p => ({ ...p, ...cloud }));
  });
}, [session]);

// And on profile changes, push to cloud
useEffect(() => {
  if (!session?.user) return;
  saveCloudProfile(session.user.id, profile);
}, [profile, session]);
```

That's the full migration. localStorage stays as a fallback for signed-out users.

## Troubleshooting

- **"Invalid redirect URL" from Google/Facebook** — the redirect URI in their console must EXACTLY match `https://xxxxx.supabase.co/auth/v1/callback`. No trailing slash. Same protocol. Same casing.
- **Email confirmations not arriving** — check spam. For dev, you can disable confirmations: Auth → Providers → Email → "Confirm email" off.
- **"new row violates row-level security policy"** — the SQL setup creates the right RLS policies; if you skipped or modified them, re-run that block.
- **Facebook only works for me** — you need to switch the FB app to Live mode (top of FB dashboard) and complete a few app review steps for public release. Until then add testers under Roles → Test Users.

## Next

`MULTIPLAYER.md` — wire up online multiplayer with room codes (one session, ~1 hour).
