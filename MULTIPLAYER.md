# MULTIPLAYER.md — online play with room codes

Architecture spec for real-time 4-player online Thulla. Designed to plug into the existing single-device game with **minimal** changes. Total wiring cost in code: ~1 hour. Total cost in dollars: $0 (Supabase free tier).

## High-level model

- **Hosts and joiners** — one player creates a room, gets a 4-letter code, shares it. Up to 3 friends join with the code.
- **Room codes** — 4 uppercase letters (e.g., `MNGB`). 26⁴ = 456,976 combos, plenty to avoid clashes for our scale.
- **Authoritative state** — the room state lives in a Supabase table. Every mutation goes through a Supabase RPC (database function) that validates the move server-side. No client trusts another client.
- **Real-time updates** — Supabase Realtime broadcasts row changes to subscribed clients. Each client mirrors the room state and re-renders.
- **Bot fill** — empty seats can optionally be filled by AI bots running on the host's client (or via a serverless function for fairness; v1 we'll do client-host for simplicity).

## Database schema

Add this to your Supabase SQL Editor:

```sql
-- Rooms
create table public.rooms (
  code text primary key,
  host_id uuid references auth.users(id) not null,
  status text not null default 'waiting',  -- waiting | playing | finished
  is_stakes boolean default false,
  wager integer default 0,
  state jsonb,                              -- full game state
  seats jsonb default '[]'::jsonb,          -- [{userId, name, avatar, seat}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Realtime: enable for rooms
alter publication supabase_realtime add table public.rooms;

-- RLS: anyone can read a room they're seated in. Only host can update directly.
alter table public.rooms enable row level security;

create policy "Read room if seated"
  on public.rooms for select
  using (
    exists (select 1 from jsonb_array_elements(seats) s
            where (s->>'userId')::uuid = auth.uid())
    or host_id = auth.uid()
  );

-- Mutations go through RPC functions (below) — no direct UPDATE policy.
```

## RPC functions

These run server-side and are the ONLY way to mutate room state. This is what makes the game cheat-resistant.

```sql
-- Create a room with a unique 4-letter code
create or replace function public.create_room(
  p_is_stakes boolean default false,
  p_wager integer default 0
) returns text
language plpgsql security definer as $$
declare
  new_code text;
  attempts int := 0;
begin
  loop
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 4));
    -- ensure A-Z only
    new_code := regexp_replace(new_code, '[^A-Z]', chr(65 + (random()*25)::int), 'g');
    if not exists (select 1 from public.rooms where code = new_code) then exit; end if;
    attempts := attempts + 1;
    if attempts > 10 then raise exception 'Could not generate unique room code'; end if;
  end loop;

  insert into public.rooms (code, host_id, status, is_stakes, wager, seats, state)
  values (
    new_code, auth.uid(), 'waiting', p_is_stakes, p_wager,
    jsonb_build_array(jsonb_build_object(
      'userId', auth.uid(),
      'name', (select coalesce(display_name, split_part(email, '@', 1)) from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid()),
      'avatar', (select avatar from public.profiles where id = auth.uid()),
      'seat', 0
    )),
    null
  );
  return new_code;
end; $$;

-- Join a room
create or replace function public.join_room(p_code text) returns void
language plpgsql security definer as $$
declare
  r public.rooms%rowtype;
  next_seat int;
begin
  select * into r from public.rooms where code = upper(p_code);
  if r is null then raise exception 'Room not found'; end if;
  if r.status <> 'waiting' then raise exception 'Room already started'; end if;
  if jsonb_array_length(r.seats) >= 4 then raise exception 'Room full'; end if;
  if exists (select 1 from jsonb_array_elements(r.seats) s where (s->>'userId')::uuid = auth.uid())
    then return; end if;     -- already in
  next_seat := jsonb_array_length(r.seats);
  update public.rooms
  set seats = seats || jsonb_build_object(
    'userId', auth.uid(),
    'name', (select coalesce(display_name, split_part(email, '@', 1)) from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid()),
    'avatar', (select avatar from public.profiles where id = auth.uid()),
    'seat', next_seat
  ),
  updated_at = now()
  where code = upper(p_code);
end; $$;

-- Start the game (host only) — deals cards, sets first turn
create or replace function public.start_game(p_code text) returns void
language plpgsql security definer as $$
-- ... pseudo: validate host, validate seat count, generate deck server-side, deal,
-- ... write initial state to rooms.state, set status='playing'
$$;

-- Play a card (validates turn, suit-following, A♠ rule, etc.)
create or replace function public.play_card(p_code text, p_card_id text) returns void
language plpgsql security definer as $$
-- ... pseudo: load room.state, find auth.uid()'s seat, verify it's their turn,
-- ... verify the card is in their hand, verify the play is legal,
-- ... mutate state (handle thulla / flush / round end), write back, update timestamp
$$;

-- Same shape: request_cards(p_code, p_target_seat), respond_request(p_code, p_accept)
```

The trick is that `play_card` reimplements the rules in PL/pgSQL. To avoid that, an alternative is to use a **Supabase Edge Function** in TypeScript that calls into shared rule code, then writes back to the row. That's cleaner — recommended for the actual implementation.

## Client integration

`src/lib/supabase.js` already exports `createRoom`, `joinRoom`, `subscribeToRoom`. Wire them up:

```js
// in supabase.js
export async function createRoom({ isStakes, wager }) {
  const { data, error } = await supabase.rpc('create_room', {
    p_is_stakes: !!isStakes, p_wager: wager || 0,
  });
  if (error) return { error };
  return { code: data };
}

export async function joinRoom(code) {
  const { error } = await supabase.rpc('join_room', { p_code: code });
  return { error };
}

export function subscribeToRoom(code, onChange) {
  const channel = supabase.channel(`room:${code}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}`,
    }, (payload) => onChange(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}
```

In `App.jsx`, add a new phase `'onlineGame'` that:

1. Calls `subscribeToRoom(code, setRoomState)` on mount
2. Renders the same `GameView` but reads `hands`/`trick`/etc. from `roomState.state`
3. When the local user plays, calls `supabase.rpc('play_card', { p_code: code, p_card_id: card.id })` instead of mutating local state directly
4. The realtime channel pushes the new state back, components re-render

## What about cards being secret?

A naive `state` row would expose every player's hand. Two patterns:

**Pattern A (simple, MVP):** store all 4 hands in the `state` jsonb, but the client filters out other players' hands before rendering. Cheaters who inspect the network tab CAN see others' cards. Acceptable for friendly play.

**Pattern B (proper):** store only PUBLIC state (trick, eliminated, ledSuit, turn) in `rooms.state`. Store per-player hands in a separate `hands` table with strict RLS that allows reading only your own row. Server-side RPC functions can read all hands but never return others' to clients. This is the right design for stakes/competitive play.

Recommended: ship Pattern A first to validate the experience, migrate to Pattern B before wide launch.

## Disconnect handling

- Supabase Presence (built-in) tells everyone when a user goes offline
- After 30s offline, that seat becomes a bot (driven by host's client)
- If the host disconnects, transfer host to seat 1
- If 2+ players disconnect, pause the room and auto-resume when at least 1 returns within 5 minutes; otherwise mark `status='finished'` and refund stakes

## Step-by-step "next session" plan

1. Run the SQL above in your Supabase project (~5 min)
2. Implement `play_card` and friends as Edge Functions in TypeScript instead of PL/pgSQL — share rule code with the client (~30 min)
3. Wire up `subscribeToRoom` in `App.jsx`, add the `onlineGame` phase (~20 min)
4. Test with two browser windows: one creates a room, the other joins via the printed code (~15 min)
5. Iterate on edge cases (disconnects, race conditions on simultaneous clicks) (~15 min)

Total: about 1.5 hours of focused work.

## Free tier capacity

Supabase free tier:
- 500 MB database (one room ~5 KB → 100K finished rooms storable, plus you'll prune)
- 2 GB realtime egress per month → ~2 million state-update broadcasts (20 broadcasts × 4 players × 25K games = a lot)
- 50K MAU on auth

You'll launch, soft-launch, and scale to several hundred concurrent players for $0. By the time you hit limits, you'll have plenty of signal that a $25/mo Pro plan is justified.
