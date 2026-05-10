// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
// REPLACE your existing src/lib/supabase.js with this file.
// This is a complete drop-in: client + auth helpers + profile
// CRUD + leaderboard fetching + game result logging.
//
// The file falls back gracefully when env vars are absent so
// local dev still works without a Supabase project.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

// ── Client ────────────────────────────────────────────────────
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY
const isConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,   // handles OAuth redirects
      },
    })
  : null

// ── Helper: safe-call wrapper ─────────────────────────────────
// Returns { data, error }. If Supabase isn't configured, returns
// { data: null, error: null } so callers can treat it as "no data".
async function sb(fn) {
  if (!supabase) return { data: null, error: null }
  try {
    return await fn(supabase)
  } catch (err) {
    console.warn('[supabase]', err.message)
    return { data: null, error: err }
  }
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

/** Get the currently logged-in user (null if not signed in) */
export async function getUser() {
  const { data } = await sb(s => s.auth.getUser())
  return data?.user ?? null
}

/** Listen for auth state changes: signIn, signOut, tokenRefreshed */
export function onAuthChange(callback) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session?.user ?? null)
  )
  return () => subscription.unsubscribe()
}

/** Sign up with email + password */
export async function signUpEmail(email, password, displayName) {
  return sb(s =>
    s.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    })
  )
}

/** Sign in with email + password */
export async function signInEmail(email, password) {
  return sb(s => s.auth.signInWithPassword({ email, password }))
}

/** Sign in with Google OAuth (redirects to Google, comes back to your app) */
export async function signInGoogle() {
  return sb(s =>
    s.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  )
}

/** Sign in with Facebook OAuth */
export async function signInFacebook() {
  return sb(s =>
    s.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin },
    })
  )
}

/** Sign out */
export async function signOut() {
  return sb(s => s.auth.signOut())
}

/** Request a password-reset email */
export async function resetPassword(email) {
  return sb(s =>
    s.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}?resetPassword=true`,
    })
  )
}

// ─────────────────────────────────────────────────────────────
// PROFILE  (coins, trophies, stats)
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the profile for the current user.
 * Returns the profile object or null.
 */
export async function getProfile() {
  const user = await getUser()
  if (!user) return null

  const { data, error } = await sb(s =>
    s.from('profiles').select('*').eq('id', user.id).single()
  )
  if (error) console.warn('[supabase] getProfile:', error.message)
  return data ?? null
}

/**
 * Upsert profile fields.
 * Merges provided fields into the existing profile.
 *
 * @param {object} fields  e.g. { display_name, coins, trophies, ... }
 */
export async function updateProfile(fields) {
  const user = await getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  return sb(s =>
    s
      .from('profiles')
      .upsert({ id: user.id, ...fields }, { onConflict: 'id' })
      .select()
      .single()
  )
}

/**
 * Sync local localStorage profile into the cloud on first sign-in.
 * Call this once right after the user signs in.
 *
 * @param {object} localProfile  Your thulla.profile.v1 object from localStorage
 */
export async function syncLocalProfileToCloud(localProfile) {
  if (!localProfile) return

  const existing = await getProfile()
  if (!existing) {
    // Brand-new cloud profile: push local data up
    await updateProfile({
      display_name:  localProfile.displayName  ?? 'Player',
      avatar_id:     localProfile.avatarId     ?? 'default',
      coins:         localProfile.coins        ?? 500,
      trophies:      localProfile.trophies     ?? 0,
      games_played:  localProfile.gamesPlayed  ?? 0,
      games_won:     localProfile.gamesWon     ?? 0,
      placement_1st: localProfile.placement1st ?? 0,
      placement_2nd: localProfile.placement2nd ?? 0,
      placement_3rd: localProfile.placement3rd ?? 0,
      thulla_count:  localProfile.thullaCount  ?? 0,
    })
  }
  // If cloud profile already exists, cloud wins (don't overwrite)
  return getProfile()
}

// ─────────────────────────────────────────────────────────────
// GAME RESULTS
// ─────────────────────────────────────────────────────────────

/**
 * Log a completed game and atomically update the profile.
 *
 * @param {object} result
 *   placement      1|2|3|4
 *   coinsEarned    number
 *   trophiesDelta  number (positive or negative)
 *   gameMode       'solo'|'local'|'online'
 *   newCoins       total coins after this game
 *   newTrophies    total trophies after this game (floor 0)
 */
export async function recordGameResult({
  placement,
  coinsEarned,
  trophiesDelta,
  gameMode = 'solo',
  newCoins,
  newTrophies,
}) {
  const user = await getUser()
  if (!user) return   // guest play — nothing to record

  // 1. Insert game result row
  await sb(s =>
    s.from('game_results').insert({
      user_id:        user.id,
      placement,
      coins_earned:   coinsEarned,
      trophies_delta: trophiesDelta,
      game_mode:      gameMode,
    })
  )

  // 2. Update aggregate stats on profile
  const placementField = {
    1: 'placement_1st',
    2: 'placement_2nd',
    3: 'placement_3rd',
    4: 'thulla_count',
  }[placement]

  // We use a Postgres RPC to atomically increment counters
  // (avoids race conditions if the user somehow submits twice)
  await sb(s =>
    s.rpc('increment_profile_stats', {
      p_user_id:        user.id,
      p_placement_col:  placementField,
      p_coins:          newCoins,
      p_trophies:       Math.max(0, newTrophies),
      p_won:            placement === 1 ? 1 : 0,
    })
  )
}

// ─────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the global leaderboard (top 100 by trophies).
 * Returns an array of profile rows with win_rate included,
 * or an empty array if Supabase isn't configured / request fails.
 */
export async function getLeaderboard() {
  const { data, error } = await sb(s =>
    s.from('leaderboard').select('*')
  )
  if (error) console.warn('[supabase] getLeaderboard:', error.message)
  return data ?? []
}

/**
 * Fetch the current user's rank on the leaderboard.
 * Returns { rank, total } or null.
 */
export async function getMyRank() {
  const user = await getUser()
  if (!user) return null

  const { data, error } = await sb(s =>
    s.rpc('get_my_rank', { p_user_id: user.id })
  )
  if (error) console.warn('[supabase] getMyRank:', error.message)
  return data ?? null
}

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────

/** True when Supabase env vars are present */
export const supabaseEnabled = isConfigured
