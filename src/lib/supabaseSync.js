// src/lib/supabaseSync.js
// Cloud-save bridge for Thulla.
// Sits between the existing localStorage store and Supabase:
//   • Guest (not signed in) → localStorage only, unchanged
//   • Signed in → mirrors every state change to cloud
//   • On sign-in → merges local profile into cloud (cloud wins if profile exists)

import {
  getUser,
  onAuthChange,
  getProfile,
  updateProfile,
  recordGameResult,
  getLeaderboard,
  supabaseEnabled,
} from './supabase'

// ── localStorage structure (matches App.jsx exactly) ─────────
// thulla_profiles_v1  →  { [playerName]: { coins, trophies } }
// thulla_lb_v1        →  [{ name, avatar, trophies, isAI }]
const PROFILE_KEY = 'thulla_profiles_v1'
const DEFAULT_NAME = 'You'  // AI mode always stores as 'You'

function readPlayerProfile(name = DEFAULT_NAME) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
    return all[name] || { coins: 500, trophies: 0 }
  } catch { return { coins: 500, trophies: 0 } }
}

function writePlayerProfile(name = DEFAULT_NAME, data) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
    all[name] = { ...(all[name] || {}), ...data }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(all))
  } catch {}
}

// ── Module state ─────────────────────────────────────────────
let currentUser     = null
let unsubscribeAuth = () => {}

// ── initSync ─────────────────────────────────────────────────
/**
 * Call once in App's useEffect(()=>{...},[]).
 * Sets up the auth listener and loads cloud profile if already signed in.
 *
 * @param {function} onProfileChange  called with {coins, trophies} when cloud loads
 */
export async function initSync(onProfileChange) {
  if (!supabaseEnabled) return   // env vars not set → guest-only, no-op

  currentUser = await getUser()
  if (currentUser) {
    await _syncCloudToLocal(onProfileChange)
  }

  unsubscribeAuth = onAuthChange(async (user) => {
    currentUser = user
    if (user) {
      await _syncCloudToLocal(onProfileChange)
    }
    // on sign-out: leave localStorage as-is (local data persists for guests)
  })
}

/** Call in the useEffect cleanup (return value). */
export function teardownSync() {
  unsubscribeAuth()
}

// ── Internal: pull cloud → local on sign-in ──────────────────
async function _syncCloudToLocal(onProfileChange) {
  const local = readPlayerProfile()

  let cloud = await getProfile()

  if (!cloud) {
    // First time signing in → push local coins/trophies up to cloud
    await updateProfile({
      display_name: DEFAULT_NAME,
      coins:        local.coins    ?? 500,
      trophies:     local.trophies ?? 0,
    })
    cloud = await getProfile()
  }

  if (cloud) {
    // Cloud is authoritative: write cloud values into local storage
    writePlayerProfile(DEFAULT_NAME, {
      coins:    cloud.coins,
      trophies: cloud.trophies,
    })
    onProfileChange?.({ coins: cloud.coins, trophies: cloud.trophies })
  }
}

// ── saveGameResult ────────────────────────────────────────────
/**
 * Called at the end of every AI game (already wired in GameOverView).
 * Updates localStorage and syncs to Supabase if the user is signed in.
 *
 * @param {{ placement, coinsEarned, trophiesDelta, gameMode }} params
 * @returns {{ newCoins, newTrophies }}
 */
export async function saveGameResult({ placement, coinsEarned, trophiesDelta, gameMode = 'ai' }) {
  const profile     = readPlayerProfile()
  const newCoins    = Math.max(0, (profile.coins    ?? 500) + coinsEarned)
  const newTrophies = Math.max(0, (profile.trophies ?? 0)   + trophiesDelta)

  // Always update localStorage
  writePlayerProfile(DEFAULT_NAME, { coins: newCoins, trophies: newTrophies })

  // Sync to cloud if signed in
  if (currentUser && supabaseEnabled) {
    await recordGameResult({
      placement,
      coinsEarned,
      trophiesDelta,
      gameMode,
      newCoins,
      newTrophies,
    })
  }

  return { newCoins, newTrophies }
}

// ── fetchLeaderboard ──────────────────────────────────────────
/**
 * Returns leaderboard rows in the shape LeaderboardScreen expects:
 *   { name, avatar, trophies, isAI, isCurrentUser }
 *
 * Falls back to localFallback (the AI_RIVALS array) when:
 *   - Supabase isn't configured, OR
 *   - The cloud leaderboard is empty (no one has signed up yet)
 *
 * @param {Array} localFallback  AI_RIVALS from App.jsx
 */
export async function fetchLeaderboard(localFallback = []) {
  if (!supabaseEnabled) return localFallback

  const rows = await getLeaderboard()
  if (!rows || rows.length === 0) return localFallback

  return rows.map((r, i) => ({
    rank:          i + 1,
    id:            r.id,
    name:          r.display_name,
    avatar:        r.avatar_id || '🃏',  // avatar field name matches LeaderboardScreen
    trophies:      r.trophies,
    coins:         r.coins,
    gamesPlayed:   r.games_played,
    gamesWon:      r.games_won,
    winRate:       r.win_rate,
    isAI:          false,
    isCurrentUser: currentUser ? r.id === currentUser.id : false,
  }))
}

// ── helpers ───────────────────────────────────────────────────
export function getCurrentUser() { return currentUser }
export function isSignedIn()     { return Boolean(currentUser) }
