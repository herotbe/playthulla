// ============================================================
// THULLA — Local profile / coins / cosmetics / trophies store
// ----------------------------------------------------------
// All persistence goes through this single API so we can swap
// the implementation to Supabase later WITHOUT touching components.
// ============================================================

const STORAGE_KEY = 'thulla.profile.v1';
const TROPHY_KEY  = 'thulla.trophies.v1';

// ------ Catalog of unlockable cosmetics -------
// Note: themes 'classic', 'neon', 'mehfil' come unlocked by default.
export const COSMETICS = {
  themes: [
    { id: 'classic',   name: 'Classic',   price: 0,    default: true,  swatch: ['#1a4d40', '#f0c674'] },
    { id: 'neon',      name: 'Neon',      price: 0,    default: true,  swatch: ['#0d0220', '#ff2d95'] },
    { id: 'mehfil',    name: 'Mehfil',    price: 0,    default: true,  swatch: ['#3d0a2c', '#e8b85c'] },
    { id: 'midnight',  name: 'Midnight',  price: 250,  swatch: ['#0a0a1f', '#7c5cff'] },
    { id: 'sunset',    name: 'Sunset',    price: 250,  swatch: ['#2a0a14', '#ff7a3d'] },
    { id: 'jade',      name: 'Jade',      price: 400,  swatch: ['#0e2818', '#3dd68c'] },
  ],
  cardBacks: [
    { id: 'paisley',   name: 'Paisley',   price: 0,    default: true },
    { id: 'shamiana',  name: 'Shamiana',  price: 150 },
    { id: 'jaali',     name: 'Jaali',     price: 200 },
    { id: 'marble',    name: 'Marble',    price: 350 },
  ],
  slamFx: [
    { id: 'classic',   name: 'Classic Slam',   price: 0,    default: true },
    { id: 'fire',      name: 'Fire Slam',      price: 200 },
    { id: 'lightning', name: 'Lightning Slam', price: 300 },
    { id: 'shatter',   name: 'Shatter Slam',   price: 500 },
  ],
  avatars: [
    // base set free
    { id: 'lion',      glyph: '🦁', price: 0, default: true },
    { id: 'tiger',     glyph: '🐯', price: 0, default: true },
    { id: 'eagle',     glyph: '🦅', price: 0, default: true },
    { id: 'dragon',    glyph: '🐉', price: 0, default: true },
    { id: 'fox',       glyph: '🦊', price: 0, default: true },
    { id: 'wolf',      glyph: '🐺', price: 0, default: true },
    // premium
    { id: 'crown',     glyph: '👑', price: 100 },
    { id: 'fire',      glyph: '🔥', price: 100 },
    { id: 'lightning', glyph: '⚡', price: 100 },
    { id: 'diamond',   glyph: '💎', price: 200 },
    { id: 'joker',     glyph: '🃏', price: 200 },
    { id: 'ninja',     glyph: '🥷', price: 200 },
  ],
};

// ------ Default profile -------
function defaultProfile() {
  const unlocked = {};
  for (const cat of Object.keys(COSMETICS)) {
    unlocked[cat] = COSMETICS[cat].filter(x => x.default).map(x => x.id);
  }
  return {
    displayName: '',
    coins: 500,                 // welcome coins
    xp: 0,
    level: 1,
    avatar: '🦁',
    selectedTheme: 'classic',
    selectedCardBack: 'paisley',
    selectedSlamFx: 'classic',
    unlocked,
    stats: { wins: 0, losses: 0, thullas: 0, gamesPlayed: 0 },
    createdAt: Date.now(),
    syncedAt: 0,                // future: last cloud sync
  };
}

// ------ Read/write helpers -------
function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeRaw(profile) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
}

// ------ Public API -------
export function getProfile() {
  const existing = readRaw();
  if (existing) return existing;
  const p = defaultProfile();
  writeRaw(p);
  return p;
}

export function saveProfile(profile) {
  writeRaw(profile);
  return profile;
}

export function resetProfile() {
  const p = defaultProfile();
  writeRaw(p);
  return p;
}

export function addCoins(profile, amount) {
  const next = { ...profile, coins: Math.max(0, profile.coins + amount) };
  writeRaw(next);
  return next;
}

export function isUnlocked(profile, category, id) {
  return (profile.unlocked?.[category] || []).includes(id);
}

export function unlockItem(profile, category, id) {
  const item = (COSMETICS[category] || []).find(x => x.id === id);
  if (!item) return { ok: false, reason: 'not-found', profile };
  if (isUnlocked(profile, category, id)) return { ok: false, reason: 'already', profile };
  if (profile.coins < (item.price || 0)) return { ok: false, reason: 'no-coins', profile };
  const next = {
    ...profile,
    coins: profile.coins - (item.price || 0),
    unlocked: {
      ...profile.unlocked,
      [category]: [...(profile.unlocked[category] || []), id],
    },
  };
  writeRaw(next);
  return { ok: true, profile: next };
}

export function selectItem(profile, category, id) {
  const map = { themes: 'selectedTheme', cardBacks: 'selectedCardBack', slamFx: 'selectedSlamFx', avatars: 'avatar' };
  const field = map[category];
  if (!field) return profile;
  if (category !== 'avatars' && !isUnlocked(profile, category, id)) return profile;
  if (category === 'avatars') {
    // avatars are stored as glyph
    const found = COSMETICS.avatars.find(a => a.id === id);
    const next = { ...profile, avatar: found?.glyph ?? profile.avatar };
    writeRaw(next);
    return next;
  }
  const next = { ...profile, [field]: id };
  writeRaw(next);
  return next;
}

export function recordGameResult(profile, { placement, totalPlayers, isStakes, stakesWager }) {
  // placement 1 = first to win, totalPlayers - 1 = last (the thulla)
  const isThulla = placement === totalPlayers; // last place
  const prizeByPlace = { 1: 100, 2: 50, 3: 20 };
  const stakesPrize = isStakes ? Math.floor((stakesWager * totalPlayers) * (prizeByPlace[placement] || 0) / 100) : 0;
  const baseCoins = prizeByPlace[placement] || 0;
  const xpGain = isThulla ? 5 : (totalPlayers - placement) * 10 + 5;

  const next = {
    ...profile,
    coins: Math.max(0, profile.coins + baseCoins + stakesPrize - (isStakes ? stakesWager : 0)),
    xp: profile.xp + xpGain,
    stats: {
      wins: profile.stats.wins + (placement === 1 ? 1 : 0),
      losses: profile.stats.losses + (isThulla ? 1 : 0),
      thullas: profile.stats.thullas + (isThulla ? 1 : 0),
      gamesPlayed: profile.stats.gamesPlayed + 1,
    },
  };
  // level up curve: 100 xp per level (linear, simple)
  next.level = Math.max(1, Math.floor(next.xp / 100) + 1);
  writeRaw(next);
  return { profile: next, baseCoins, stakesPrize, xpGain };
}

// ------ Trophy ladder (local) -------
export function getLadder() {
  try {
    const raw = localStorage.getItem(TROPHY_KEY);
    if (!raw) return seedLadder();
    return JSON.parse(raw);
  } catch { return seedLadder(); }
}
function seedLadder() {
  // seed with placeholder rivals so the screen isn't empty pre-launch
  const seed = [
    { name: 'Sheru',  trophies: 1480, avatar: '🦁' },
    { name: 'Bablu',  trophies: 1220, avatar: '🐯' },
    { name: 'Babu',   trophies: 1090, avatar: '🧠' },
    { name: 'Pagal',  trophies:  860, avatar: '🃏' },
    { name: 'Yaar',   trophies:  650, avatar: '🐉' },
    { name: 'Saathi', trophies:  420, avatar: '🦊' },
    { name: 'Don',    trophies:  280, avatar: '👑' },
  ];
  try { localStorage.setItem(TROPHY_KEY, JSON.stringify(seed)); } catch {}
  return seed;
}

export function recordTrophyChange(profile, deltaTrophies) {
  const ladder = getLadder();
  const me = ladder.find(r => r.name === (profile.displayName || 'you')) || null;
  const newRow = me
    ? { ...me, trophies: Math.max(0, me.trophies + deltaTrophies), avatar: profile.avatar }
    : { name: profile.displayName || 'you', trophies: Math.max(0, deltaTrophies), avatar: profile.avatar };
  const others = ladder.filter(r => r.name !== newRow.name);
  const next = [...others, newRow].sort((a, b) => b.trophies - a.trophies).slice(0, 50);
  try { localStorage.setItem(TROPHY_KEY, JSON.stringify(next)); } catch {}
  return next;
}
