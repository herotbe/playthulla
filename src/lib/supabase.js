// ============================================================
// THULLA — Supabase client (graceful no-op when not configured)
// ============================================================
// If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, we get
// a real client. Otherwise we export `null` and the rest of the
// app falls back to localStorage. Nothing crashes.
// See SUPABASE.md for setup.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (url && key)
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const isSupabaseConfigured = !!supabase;

// ------ Auth helpers --------
export async function signInWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signUpWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signUp({ email, password });
}
export async function signInWithGoogle() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}
export async function signInWithFacebook() {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  return supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin },
  });
}
export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ------ Multiplayer room scaffolding --------
// Implemented next session — see MULTIPLAYER.md for the plan.
export async function createRoom({ hostId, hostName, isStakes, wager }) {
  if (!supabase) return { error: { message: 'Multiplayer requires Supabase' } };
  // INSERT into rooms table, generate 4-letter code, return code
  return { error: { message: 'Not implemented yet — see MULTIPLAYER.md' } };
}
export async function joinRoom({ code, userId, userName }) {
  if (!supabase) return { error: { message: 'Multiplayer requires Supabase' } };
  return { error: { message: 'Not implemented yet — see MULTIPLAYER.md' } };
}
export function subscribeToRoom(code, onChange) {
  if (!supabase) return () => {};
  // Will use supabase.channel(`room:${code}`).on('postgres_changes', ...)
  return () => {};
}
