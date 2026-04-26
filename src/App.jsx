import { useState, useEffect, useRef } from 'react';
import { DIFFICULTIES, PERSONALITIES, generateBots, botThinkDelay,
         chooseBotPlay, chooseBotRequestResponse, shouldBotRequest } from './lib/botAI.js';
import { COSMETICS, getProfile, saveProfile, addCoins, isUnlocked, unlockItem,
         selectItem, recordGameResult, getLadder, recordTrophyChange } from './lib/store.js';
import { isSupabaseConfigured, signInWithEmail, signUpWithEmail,
         signInWithGoogle, signInWithFacebook, signOut, getSession } from './lib/supabase.js';

// ============================================================
// THULLA — Phase 3
// Bots · Coins · Cosmetics · Stakes · Ladder · Auth scaffolding
// ============================================================

const SUITS = [
  { sym: '♠', name: 'spades' },
  { sym: '♥', name: 'hearts' },
  { sym: '♦', name: 'diamonds' },
  { sym: '♣', name: 'clubs' },
];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RV = Object.fromEntries(RANKS.map((r, i) => [r, i + 2]));
const N = 4;
const AVATARS = ['🦁','🐯','🦅','🐉','🦊','🐺','👑','🔥','⚡','💎','🃏','🥷'];

// ---------- Themes ----------
const THEMES = {
  classic: {
    name: 'Classic', swatch: ['#1a4d40', '#f0c674'],
    vars: {
      '--bg-radial':  'radial-gradient(ellipse at center, #1a4d40 0%, #0a2922 80%)',
      '--bg-overlay': 'radial-gradient(ellipse 100% 60% at 50% 15%, rgba(212,160,82,.10) 0%, transparent 60%)',
      '--panel-bg':   'rgba(10,41,34,.65)',
      '--panel-border':'rgba(212,160,82,.28)',
      '--accent':     '#f0c674', '--accent-deep':'#d4a052', '--accent-text':'#0a2922',
      '--text':       '#f5e9d3', '--text-muted': '#a8b5a8',
      '--danger':     '#f87171', '--success':    '#6ee7b7',
      '--card-bg':    'linear-gradient(180deg,#fdfaf1 0%,#f5e9d3 100%)',
      '--card-border':'rgba(139,102,40,.5)', '--card-red':   '#c1272d', '--card-black': '#1a1a1a',
      '--display-font':"'Cormorant Garamond', serif", '--body-font':  "'Manrope', system-ui, sans-serif",
      '--accent-glow':'0 0 0 0 rgba(240,198,116,.4)',
    },
  },
  neon: {
    name: 'Neon', swatch: ['#0d0220', '#ff2d95'],
    vars: {
      '--bg-radial':  'radial-gradient(ellipse at center, #1a0633 0%, #03000a 85%)',
      '--bg-overlay': 'radial-gradient(ellipse 100% 60% at 50% 15%, rgba(255,45,149,.18) 0%, transparent 60%)',
      '--panel-bg':   'rgba(12,4,28,.75)', '--panel-border':'rgba(0,229,255,.35)',
      '--accent':     '#ff2d95', '--accent-deep':'#00e5ff', '--accent-text':'#fff',
      '--text':       '#e8f7ff', '--text-muted': '#7a8aa0',
      '--danger':     '#ff3860', '--success':    '#00ffa3',
      '--card-bg':    'linear-gradient(180deg,#fafaff 0%,#dde6ff 100%)',
      '--card-border':'rgba(0,229,255,.6)', '--card-red':   '#e6005c', '--card-black': '#0a0a3a',
      '--display-font':"'Audiowide', 'Manrope', sans-serif", '--body-font':  "'Manrope', system-ui, sans-serif",
      '--accent-glow':'0 0 18px rgba(255,45,149,.7), 0 0 35px rgba(0,229,255,.3)',
    },
  },
  mehfil: {
    name: 'Mehfil', swatch: ['#3d0a2c', '#e8b85c'],
    vars: {
      '--bg-radial':  'radial-gradient(ellipse at center, #4a1538 0%, #1a0612 85%)',
      '--bg-overlay': 'radial-gradient(ellipse 100% 60% at 50% 15%, rgba(232,184,92,.18) 0%, transparent 60%)',
      '--panel-bg':   'rgba(50,12,36,.65)', '--panel-border':'rgba(232,184,92,.4)',
      '--accent':     '#e8b85c', '--accent-deep':'#b88838', '--accent-text':'#2a0814',
      '--text':       '#f5e0d3', '--text-muted': '#c89bb0',
      '--danger':     '#ff7a8a', '--success':    '#ffd700',
      '--card-bg':    'linear-gradient(180deg,#fff8e7 0%,#f5dcc0 100%)',
      '--card-border':'rgba(139,82,40,.6)', '--card-red':   '#a01030', '--card-black': '#2a1810',
      '--display-font':"'Cinzel', 'Cormorant Garamond', serif", '--body-font':  "'Manrope', system-ui, sans-serif",
      '--accent-glow':'0 0 12px rgba(232,184,92,.5)',
    },
  },
  midnight: {
    name: 'Midnight', swatch: ['#0a0a1f', '#7c5cff'],
    vars: {
      '--bg-radial':  'radial-gradient(ellipse at center, #1a1740 0%, #050518 85%)',
      '--bg-overlay': 'radial-gradient(ellipse 100% 60% at 50% 15%, rgba(124,92,255,.18) 0%, transparent 60%)',
      '--panel-bg':   'rgba(15,12,40,.7)', '--panel-border':'rgba(124,92,255,.35)',
      '--accent':     '#7c5cff', '--accent-deep':'#4a30c8', '--accent-text':'#fff',
      '--text':       '#dfd8ff', '--text-muted': '#7e7aa0',
      '--danger':     '#ff5570', '--success':    '#5cffce',
      '--card-bg':    'linear-gradient(180deg,#f3f0ff 0%,#dcd6f5 100%)',
      '--card-border':'rgba(124,92,255,.5)', '--card-red':   '#b51c4d', '--card-black': '#16142e',
      '--display-font':"'Cinzel', serif", '--body-font':  "'Manrope', system-ui, sans-serif",
      '--accent-glow':'0 0 14px rgba(124,92,255,.6)',
    },
  },
  sunset: {
    name: 'Sunset', swatch: ['#2a0a14', '#ff7a3d'],
    vars: {
      '--bg-radial':  'radial-gradient(ellipse at center, #4a1124 0%, #14040a 85%)',
      '--bg-overlay': 'radial-gradient(ellipse 100% 60% at 50% 15%, rgba(255,122,61,.18) 0%, transparent 60%)',
      '--panel-bg':   'rgba(50,16,30,.7)', '--panel-border':'rgba(255,122,61,.35)',
      '--accent':     '#ff7a3d', '--accent-deep':'#cc4a18', '--accent-text':'#1a0608',
      '--text':       '#ffe6d6', '--text-muted': '#c8908a',
      '--danger':     '#ff4060', '--success':    '#ffe45c',
      '--card-bg':    'linear-gradient(180deg,#fff5e8 0%,#f5d8b8 100%)',
      '--card-border':'rgba(204,74,24,.55)', '--card-red':   '#a02030', '--card-black': '#2a1408',
      '--display-font':"'Cinzel', serif", '--body-font':  "'Manrope', system-ui, sans-serif",
      '--accent-glow':'0 0 14px rgba(255,122,61,.55)',
    },
  },
  jade: {
    name: 'Jade', swatch: ['#0e2818', '#3dd68c'],
    vars: {
      '--bg-radial':  'radial-gradient(ellipse at center, #163d28 0%, #050f08 85%)',
      '--bg-overlay': 'radial-gradient(ellipse 100% 60% at 50% 15%, rgba(61,214,140,.18) 0%, transparent 60%)',
      '--panel-bg':   'rgba(14,40,24,.7)', '--panel-border':'rgba(61,214,140,.35)',
      '--accent':     '#3dd68c', '--accent-deep':'#1d9858', '--accent-text':'#04140a',
      '--text':       '#dfffeb', '--text-muted': '#7aa890',
      '--danger':     '#ff6b78', '--success':    '#ffd870',
      '--card-bg':    'linear-gradient(180deg,#f1fff5 0%,#d4f0e0 100%)',
      '--card-border':'rgba(29,152,88,.55)', '--card-red':   '#a82048', '--card-black': '#0d2014',
      '--display-font':"'Cinzel', serif", '--body-font':  "'Manrope', system-ui, sans-serif",
      '--accent-glow':'0 0 14px rgba(61,214,140,.55)',
    },
  },
};

// ---------- Audio (singleton ctx + volume controls) ----------
let audioCtx = null;
let sfxVolume = 0.7;
let musicVolume = 0.4;
let musicNodes = null;

const getCtx = () => {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
};
const setSfxVol = (v) => { sfxVolume = v; };
const setMusicVol = (v) => {
  musicVolume = v;
  if (musicNodes) {
    const ctx = getCtx(); if (!ctx) return;
    musicNodes.master.gain.setValueAtTime(v * 0.18, ctx.currentTime);
  }
};

const playSlam = () => {
  if (sfxVolume <= 0) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const boom = ctx.createOscillator();
  const boomG = ctx.createGain();
  boom.connect(boomG); boomG.connect(ctx.destination);
  boom.type = 'sawtooth';
  boom.frequency.setValueAtTime(180, t);
  boom.frequency.exponentialRampToValueAtTime(28, t + 0.22);
  boomG.gain.setValueAtTime(0.55 * sfxVolume, t);
  boomG.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
  boom.start(t); boom.stop(t + 0.3);
  const bufferSize = ctx.sampleRate * 0.12;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource(); noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 1400;
  const noiseG = ctx.createGain();
  noiseG.gain.setValueAtTime(0.45 * sfxVolume, t);
  noiseG.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  noise.connect(filter); filter.connect(noiseG); noiseG.connect(ctx.destination);
  noise.start(t); noise.stop(t + 0.12);
  const tick = ctx.createOscillator();
  const tickG = ctx.createGain();
  tick.connect(tickG); tickG.connect(ctx.destination);
  tick.type = 'square'; tick.frequency.setValueAtTime(2400, t);
  tickG.gain.setValueAtTime(0.18 * sfxVolume, t);
  tickG.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
  tick.start(t); tick.stop(t + 0.05);
  const echo = ctx.createOscillator();
  const echoG = ctx.createGain();
  echo.connect(echoG); echoG.connect(ctx.destination);
  echo.type = 'sine'; echo.frequency.setValueAtTime(80, t + 0.15);
  echoG.gain.setValueAtTime(0.15 * sfxVolume, t + 0.15);
  echoG.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
  echo.start(t + 0.15); echo.stop(t + 0.42);
};
const playCardSnd = () => {
  if (sfxVolume <= 0) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(450, t + 0.07);
  gain.gain.setValueAtTime(0.10 * sfxVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
  osc.start(t); osc.stop(t + 0.08);
};
const playWinSnd = () => {
  if (sfxVolume <= 0) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  [523, 659, 784, 1046].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    gain.gain.setValueAtTime(0.20 * sfxVolume, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.22);
    osc.start(t + i * 0.08); osc.stop(t + i * 0.08 + 0.24);
  });
};
const playFlush = () => {
  if (sfxVolume <= 0) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  [330, 440, 550].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.04);
    gain.gain.setValueAtTime(0.10 * sfxVolume, t + i * 0.04);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.04 + 0.18);
    osc.start(t + i * 0.04); osc.stop(t + i * 0.04 + 0.2);
  });
};
const playUiTap = () => {
  if (sfxVolume <= 0) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sine'; osc.frequency.setValueAtTime(1200, t);
  gain.gain.setValueAtTime(0.06 * sfxVolume, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
  osc.start(t); osc.stop(t + 0.05);
};
const playCoin = () => {
  if (sfxVolume <= 0) return;
  const ctx = getCtx(); if (!ctx) return;
  const t = ctx.currentTime;
  [880, 1320].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle'; osc.frequency.setValueAtTime(f, t + i * 0.05);
    gain.gain.setValueAtTime(0.18 * sfxVolume, t + i * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.05 + 0.18);
    osc.start(t + i * 0.05); osc.stop(t + i * 0.05 + 0.2);
  });
};

const startMusic = () => {
  const ctx = getCtx(); if (!ctx) return;
  if (musicNodes) return;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  const freqs = [110, 165, 220, 277];
  const oscs = freqs.map((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = f;
    const oscG = ctx.createGain();
    oscG.gain.value = 0.1;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08 + i * 0.04;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.06;
    lfo.connect(lfoG); lfoG.connect(oscG.gain);
    osc.connect(oscG); oscG.connect(master);
    osc.start(); lfo.start();
    return { osc, lfo, gain: oscG };
  });
  master.gain.linearRampToValueAtTime(musicVolume * 0.18, ctx.currentTime + 2);
  musicNodes = { master, oscs };
};
const stopMusic = () => {
  if (!musicNodes) return;
  const ctx = getCtx(); if (!ctx) return;
  const m = musicNodes;
  m.master.gain.cancelScheduledValues(ctx.currentTime);
  m.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  setTimeout(() => {
    try { m.oscs.forEach(o => { o.osc.stop(); o.lfo.stop(); }); } catch(e) {}
  }, 700);
  musicNodes = null;
};

// ---------- Card helpers ----------
const newDeck = () => {
  const d = [];
  for (const s of SUITS) for (const r of RANKS)
    d.push({ suit: s.sym, red: s.sym === '♥' || s.sym === '♦', rank: r, id: r + s.sym });
  return d;
};
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sortHand = (h) => {
  const ord = { '♠': 0, '♥': 1, '♣': 2, '♦': 3 };
  return [...h].sort((a, b) => a.suit !== b.suit ? ord[a.suit] - ord[b.suit] : RV[a.rank] - RV[b.rank]);
};
const deal = (n) => {
  const deck = shuffle(newDeck());
  const hands = Array.from({ length: n }, () => []);
  for (let i = 0; i < deck.length; i++) hands[i % n].push(deck[i]);
  return hands.map(sortHand);
};
const aceSpadesIdx = (hands) => {
  for (let i = 0; i < hands.length; i++)
    if (hands[i].some(c => c.rank === 'A' && c.suit === '♠')) return i;
  return 0;
};
const findSenior = (trick, ledSuit) => {
  let s = null, max = -1;
  for (const t of trick) {
    if (t.card.suit === ledSuit && RV[t.card.rank] > max) {
      s = t.player; max = RV[t.card.rank];
    }
  }
  return s ?? trick[0].player;
};
const nextActive = (idx, elim, n) => {
  let next = (idx + 1) % n;
  let safety = n + 1;
  while (elim.includes(next) && safety > 0) { next = (next + 1) % n; safety--; }
  return next;
};

// ---------- Card component ----------
function CardFace({ card, onClick, disabled, playable, size = 'md', dim, slamming }) {
  const sizes = {
    md: { w: 70, h: 100, fs: 22, cs: 13 },
    sm: { w: 56, h: 80, fs: 18, cs: 11 },
    lg: { w: 96, h: 136, fs: 32, cs: 17 },
  };
  const sz = sizes[size];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`thulla-card-btn relative rounded-lg select-none ${playable ? 'is-playable' : ''} ${dim ? 'opacity-40' : ''} ${slamming ? 'slam-anim' : ''}`}
      style={{
        width: sz.w, height: sz.h,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: '0 3px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.6)',
        color: card.red ? 'var(--card-red)' : 'var(--card-black)',
        fontFamily: 'var(--display-font)',
        touchAction: 'manipulation',
      }}
    >
      <span style={{ position: 'absolute', top: 4, left: 6, fontSize: sz.cs, fontWeight: 700, lineHeight: 1 }}>
        {card.rank}<br />{card.suit}
      </span>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: sz.fs, fontWeight: 700 }}>
        {card.suit}
      </span>
      <span style={{ position: 'absolute', bottom: 4, right: 6, fontSize: sz.cs, fontWeight: 700, lineHeight: 1, transform: 'rotate(180deg)' }}>
        {card.rank}<br />{card.suit}
      </span>
    </button>
  );
}

// ---------- Impact burst ----------
function ImpactBurst() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99 }}>
      <div className="shockwave" />
      <div className="shockwave shockwave-2" />
      <svg viewBox="0 0 400 400" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '110vw', height: '110vw',
        maxWidth: 700, maxHeight: 700,
      }}>
        <g className="crack-group">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * Math.PI) / 6;
            return (
              <line key={i}
                x1="200" y1="200"
                x2={200 + Math.cos(angle) * 190}
                y2={200 + Math.sin(angle) * 190}
                stroke="white" strokeWidth="2.5" opacity="0.85"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ============================================================
export default function ThullaApp() {
  // Profile / persistence
  const [profile, setProfile] = useState(() => getProfile());
  // Theme is driven by profile.selectedTheme
  const theme = profile.selectedTheme || 'classic';
  const setTheme = (t) => setProfile(p => selectItem(p, 'themes', t));

  // Modes / phase
  const [phase, setPhase] = useState('menu');
  const [gameMode, setGameMode] = useState('local');           // 'local' | 'soloAI' | 'online'
  const [stakesGame, setStakesGame] = useState(false);
  const [stakesWager, setStakesWager] = useState(50);

  // Players: human names, avatars, and bot config
  const [names, setNames] = useState(['','','','']);
  const [avatars, setAvatars] = useState(['🦁','🐯','🦊','🐉']);
  const [playerTypes, setPlayerTypes] = useState(['human','human','human','human']);

  // Game state
  const [hands, setHands] = useState([]);
  const [eliminated, setEliminated] = useState([]);
  const [winnersOrder, setWinnersOrder] = useState([]);
  const [trick, setTrick] = useState([]);
  const [ledSuit, setLedSuit] = useState(null);
  const [leader, setLeader] = useState(0);
  const [turn, setTurn] = useState(0);
  const [firstRound, setFirstRound] = useState(true);
  const [pendingThullaBy, setPendingThullaBy] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [shake, setShake] = useState(false);
  const [requestFrom, setRequestFrom] = useState(null);
  const [playedHistory, setPlayedHistory] = useState([]);  // all cards played this game (for hard-mode bots)

  // Modals
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCoinShop, setShowCoinShop] = useState(false);
  const [showLadder, setShowLadder] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(null);

  // Bot setup
  const [botDifficulty, setBotDifficulty] = useState('medium');

  // Settings
  const [sfx, setSfx] = useState(0.7);
  const [music, setMusic] = useState(0.4);
  const [musicOn, setMusicOn] = useState(false);

  // Auth session
  const [session, setSession] = useState(null);

  useEffect(() => { setSfxVol(sfx); }, [sfx]);
  useEffect(() => { setMusicVol(music); }, [music]);
  useEffect(() => {
    if (musicOn) startMusic(); else stopMusic();
    return () => stopMusic();
  }, [musicOn]);
  useEffect(() => {
    if (isSupabaseConfigured) getSession().then(setSession);
  }, []);

  const isBotAt = (idx) => playerTypes[idx] && typeof playerTypes[idx] === 'object' && playerTypes[idx].isBot;
  const playerInfo = (idx) => {
    const pt = playerTypes[idx];
    if (pt && typeof pt === 'object' && pt.isBot) {
      return { name: pt.name, avatar: pt.avatar, isBot: true, personality: pt.personality, difficulty: pt.difficulty };
    }
    return { name: names[idx]?.trim() || `Player ${idx + 1}`, avatar: avatars[idx], isBot: false };
  };
  const displayName = (i) => playerInfo(i).name;

  // ============== Game flow ==============
  const startLocalGame = () => {
    setGameMode('local');
    setPlayerTypes(['human','human','human','human']);
    setStakesGame(false);
    deal_and_setup();
  };

  const startSoloAIGame = () => {
    setGameMode('soloAI');
    const bots = generateBots(3, botDifficulty);
    // Human is at slot 0; bots fill 1..3
    const types = ['human', bots[0], bots[1], bots[2]];
    setPlayerTypes(types);
    // Names + avatars: keep human's profile, bots show their own
    const newNames = [profile.displayName || names[0] || 'You', bots[0].name, bots[1].name, bots[2].name];
    const newAvs = [profile.avatar || avatars[0], bots[0].avatar, bots[1].avatar, bots[2].avatar];
    setNames(newNames);
    setAvatars(newAvs);
    deal_and_setup();
  };

  const deal_and_setup = () => {
    const newHands = deal(N);
    const starter = aceSpadesIdx(newHands);
    setHands(newHands); setEliminated([]); setWinnersOrder([]); setTrick([]);
    setLedSuit(null); setLeader(starter); setTurn(starter); setFirstRound(true);
    setPendingThullaBy(null); setRevealed(false); setResultData(null); setRequestFrom(null);
    setPlayedHistory([]);
    setPhase('pass');
    getCtx();
  };

  const reveal = () => { setRevealed(true); setPhase('play'); };

  const playCard = (cardIdx) => {
    const card = hands[turn][cardIdx];
    const newHand = hands[turn].filter((_, i) => i !== cardIdx);
    const newHands = hands.map((h, i) => i === turn ? newHand : h);

    const isLead = trick.length === 0;
    let newLedSuit = ledSuit;
    let isThulla = false;

    if (isLead) {
      newLedSuit = card.suit;
    } else {
      const hadLedSuit = hands[turn].some(c => c.suit === ledSuit);
      if (!hadLedSuit && card.suit !== ledSuit) isThulla = true;
    }

    const newTrick = [...trick, { player: turn, card, isThulla }];
    setPlayedHistory(h => [...h, card]);

    if (isThulla) {
      playSlam();
      setShake(true); setTimeout(() => setShake(false), 600);
      const senior = findSenior(newTrick, newLedSuit);
      const cardsToPickup = newTrick.map(t => t.card);
      const handsAfter = newHands.map((h, i) => i === senior ? sortHand([...h, ...cardsToPickup]) : h);
      const newElim = [...eliminated];
      const newWO = [...winnersOrder];
      for (let i = 0; i < N; i++) {
        if (!newElim.includes(i) && handsAfter[i].length === 0) { newElim.push(i); newWO.push(i); }
      }
      if (newWO.length > winnersOrder.length) setTimeout(playWinSnd, 500);
      setHands(handsAfter); setEliminated(newElim); setWinnersOrder(newWO);
      setTrick([]); setLedSuit(null); setFirstRound(false);
      setPendingThullaBy(turn); setLeader(senior); setTurn(senior); setRevealed(false);
      setResultData({
        type: 'thulla', senior, thullaBy: turn, thullaCard: card, ledSuit: newLedSuit,
        cards: cardsToPickup, newWinners: newWO.slice(winnersOrder.length),
      });
      setPhase(N - newElim.length <= 1 ? 'gameOver' : 'result');
      return;
    }

    playCardSnd();
    const activeCount = N - eliminated.length;

    if (newTrick.length >= activeCount) {
      playFlush();
      const senior = findSenior(newTrick, newLedSuit);
      const newElim = [...eliminated];
      const newWO = [...winnersOrder];
      for (let i = 0; i < N; i++) {
        if (!newElim.includes(i) && newHands[i].length === 0) { newElim.push(i); newWO.push(i); }
      }
      if (newWO.length > winnersOrder.length) setTimeout(playWinSnd, 300);
      let actualLeader = senior;
      if (newElim.includes(senior) && N - newElim.length > 1) {
        actualLeader = nextActive(senior, newElim, N);
      }
      setHands(newHands); setEliminated(newElim); setWinnersOrder(newWO);
      setTrick([]); setLedSuit(null); setFirstRound(false); setPendingThullaBy(null);
      setLeader(actualLeader); setTurn(actualLeader); setRevealed(false);
      setResultData({
        type: 'flush', senior, actualLeader, ledSuit: newLedSuit,
        cards: newTrick.map(t => t.card), newWinners: newWO.slice(winnersOrder.length),
      });
      setPhase(N - newElim.length <= 1 ? 'gameOver' : 'result');
      return;
    }

    const next = nextActive(turn, eliminated, N);
    setHands(newHands); setLedSuit(newLedSuit); setTrick(newTrick);
    setTurn(next); setRevealed(false); setPhase('pass');
  };

  // Initiate request
  const initiateRequest = () => {
    if (pendingThullaBy == null || eliminated.includes(pendingThullaBy)) return;
    setRequestFrom(turn);
    setRevealed(false);
    playUiTap();
    // If the target is a bot, skip the pass-and-decide and auto-resolve
    if (isBotAt(pendingThullaBy)) {
      setPhase('botDeciding');
      const targetInfo = playerInfo(pendingThullaBy);
      const accept = chooseBotRequestResponse({
        personality: targetInfo.personality,
        myHandSize: hands[pendingThullaBy].length,
        requesterHandSize: hands[turn].length,
      });
      setTimeout(() => {
        if (accept) acceptRequest(); else refuseRequest();
      }, 1400);
    } else {
      setPhase('requestPass');
    }
  };

  const acceptRequest = () => {
    const target = pendingThullaBy;
    const requester = requestFrom;
    if (target == null || requester == null || eliminated.includes(target)) return;
    const targetHand = hands[target];
    const newHands = hands.map((h, i) => {
      if (i === target) return [];
      if (i === requester) return sortHand([...h, ...targetHand]);
      return h;
    });
    const newElim = [...eliminated, target];
    const newWO = [...winnersOrder, target];
    setTimeout(playWinSnd, 100);
    setHands(newHands); setEliminated(newElim); setWinnersOrder(newWO);
    setPendingThullaBy(null); setRevealed(false); setRequestFrom(null);
    setResultData({
      type: 'request', requester, target,
      cardsTaken: targetHand.length, newWinners: [target],
    });
    setPhase(N - newElim.length <= 1 ? 'gameOver' : 'result');
  };

  const refuseRequest = () => {
    const target = pendingThullaBy;
    const requester = requestFrom;
    setPendingThullaBy(null); setRequestFrom(null); setRevealed(false);
    setResultData({ type: 'refusal', requester, target });
    setPhase('result');
  };

  const continueAfterResult = () => {
    setResultData(null);
    setPhase('pass');
  };

  // Valid plays — A♠ MUST lead first round
  const validPlays = (() => {
    if (phase !== 'play') return new Set();
    const hand = hands[turn] || [];
    const isLead = trick.length === 0;
    const valid = new Set();
    if (isLead) {
      if (firstRound) {
        const idx = hand.findIndex(c => c.rank === 'A' && c.suit === '♠');
        if (idx >= 0) valid.add(idx);
      } else {
        for (let i = 0; i < hand.length; i++) valid.add(i);
      }
    } else {
      const hasLed = hand.some(c => c.suit === ledSuit);
      for (let i = 0; i < hand.length; i++) {
        if (hasLed) { if (hand[i].suit === ledSuit) valid.add(i); }
        else valid.add(i);
      }
    }
    return valid;
  })();

  const canRequest = phase === 'play' && trick.length === 0 && pendingThullaBy != null
    && pendingThullaBy !== turn && !eliminated.includes(pendingThullaBy);

  // ============== Bot turn handler ==============
  // When it's a bot's turn, auto-reveal/play after a thinking delay.
  const botTimerRef = useRef(null);
  useEffect(() => {
    if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
    if (phase !== 'pass' && phase !== 'play') return;
    if (!isBotAt(turn)) return;
    if (gameMode !== 'soloAI') return;

    // At pass phase, just auto-reveal & move to play
    if (phase === 'pass') {
      botTimerRef.current = setTimeout(() => {
        setRevealed(true);
        setPhase('play');
      }, 350);
      return;
    }

    // At play phase, decide
    const me = playerInfo(turn);
    const delay = botThinkDelay(me.difficulty);
    botTimerRef.current = setTimeout(() => {
      // Maybe initiate a request first
      if (canRequest) {
        const target = pendingThullaBy;
        if (shouldBotRequest({
          personality: me.personality,
          myHandSize: hands[turn].length,
          targetHandSize: hands[target]?.length ?? 0,
        })) {
          // Bot initiates request
          setRequestFrom(turn);
          if (isBotAt(target)) {
            // Bot asking bot — auto-resolve
            setPhase('botDeciding');
            const targetInfo = playerInfo(target);
            const accept = chooseBotRequestResponse({
              personality: targetInfo.personality,
              myHandSize: hands[target].length,
              requesterHandSize: hands[turn].length,
            });
            setTimeout(() => {
              if (accept) acceptRequest(); else refuseRequest();
            }, 1300);
          } else {
            // Bot asking human — show decide screen directly
            setRevealed(true);
            setPhase('requestDecide');
          }
          return;
        }
      }

      // Otherwise pick a card to play
      const idx = chooseBotPlay({
        hand: hands[turn],
        trick, ledSuit, firstRound,
        validIndices: validPlays,
        difficulty: me.difficulty,
        personality: me.personality,
        playedCards: playedHistory,
      });
      playCard(idx);
    }, delay);

    return () => { if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, revealed, pendingThullaBy]);

  // ============== Game over hook: award coins, trophies ==============
  const gameOverProcessedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'gameOver') { gameOverProcessedRef.current = false; return; }
    if (gameOverProcessedRef.current) return;
    gameOverProcessedRef.current = true;

    if (gameMode !== 'soloAI') return;            // only solo-AI awards coins (local pass-n-play has no single profile)

    // Determine human placement (player 0)
    let placement = winnersOrder.indexOf(0) + 1;
    if (placement === 0) {
      // human didn't win — they're the THULLA
      placement = N;
    }
    const result = recordGameResult(profile, {
      placement, totalPlayers: N,
      isStakes: stakesGame,
      stakesWager: stakesWager,
    });
    setProfile(result.profile);
    if (result.baseCoins + result.stakesPrize > 0) playCoin();

    // trophies (placement 1 = +30, 2 = +10, 3 = -5, 4 = -20)
    const trophyDelta = ({1: 30, 2: 10, 3: -5, 4: -20})[placement] ?? 0;
    if (trophyDelta !== 0) recordTrophyChange(result.profile, trophyDelta);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, winnersOrder]);

  // ============== UI helpers ==============
  const setName = (i, v) => setNames(n => n.map((x, j) => j === i ? v.slice(0, 14) : x));
  const pickAvatar = (av) => {
    if (showAvatarPicker == null) return;
    setAvatars(a => {
      const swapIdx = a.indexOf(av);
      const next = [...a];
      if (swapIdx >= 0 && swapIdx !== showAvatarPicker) next[swapIdx] = next[showAvatarPicker];
      next[showAvatarPicker] = av;
      return next;
    });
    setShowAvatarPicker(null);
  };
  const randomizeNames = () => {
    const fun = ['Tiger','Sheru','Bablu','Champ','Boss','Don','Raja','Ninja','Smasher','Falcon','Phantom','Ace'];
    const sh = shuffle(fun);
    setNames([sh[0], sh[1], sh[2], sh[3]]);
  };

  const themeVars = THEMES[theme]?.vars || THEMES.classic.vars;

  // ============== Render ==============
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Cinzel:wght@500;700;900&family=Audiowide&family=Manrope:wght@400;500;600;700;800&display=swap');
        .thulla-bg {
          background: var(--bg-overlay), var(--bg-radial);
          font-family: var(--body-font); color: var(--text);
          min-height: 100vh; transition: background 0.4s;
        }
        .display { font-family: var(--display-font); letter-spacing: .02em; }
        .gold { color: var(--accent); }
        .muted { color: var(--text-muted); }
        .panel {
          background: var(--panel-bg); backdrop-filter: blur(8px);
          border: 1px solid var(--panel-border); border-radius: 12px;
        }
        .btn-primary {
          background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
          color: var(--accent-text); font-weight: 800;
          padding: 14px 22px; border-radius: 10px;
          border: 1px solid var(--accent-deep);
          box-shadow: 0 2px 14px rgba(0,0,0,.4), var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.35);
          cursor: pointer; transition: transform .12s;
          font-family: var(--body-font); font-size: 16px;
          touch-action: manipulation;
        }
        .btn-primary:hover { transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
        .btn-ghost {
          background: transparent; color: var(--accent); font-weight: 600;
          padding: 12px 16px; border-radius: 10px;
          border: 1px solid var(--panel-border); cursor: pointer;
          font-family: var(--body-font); font-size: 14px; transition: background .2s;
          touch-action: manipulation;
        }
        .btn-ghost:hover { background: var(--panel-bg); }
        .btn-secondary {
          background: var(--panel-bg); color: var(--accent);
          font-weight: 600; padding: 6px 12px; border-radius: 6px;
          border: 1px solid var(--panel-border); cursor: pointer; font-size: 12px;
          touch-action: manipulation;
        }
        .btn-danger {
          background: linear-gradient(180deg, var(--danger) 0%, #8b1c20 100%);
          color: #fff; font-weight: 700; padding: 12px 16px;
          border-radius: 10px; border: 1px solid #5e1417; cursor: pointer; width: 100%;
          font-size: 14px; touch-action: manipulation;
        }
        .input-field {
          background: rgba(0,0,0,.25); color: var(--text);
          border: 1px solid var(--panel-border); border-radius: 8px;
          padding: 10px 12px; outline: none; width: 100%;
          font-family: var(--body-font); font-size: 14px;
        }
        .input-field:focus { border-color: var(--accent); }
        .avatar-bubble {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--panel-bg); border: 2px solid var(--accent);
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; cursor: pointer; flex-shrink: 0;
          box-shadow: var(--accent-glow); touch-action: manipulation;
        }
        .pillbar {
          background: var(--panel-bg); border: 1px solid var(--panel-border);
          border-radius: 999px; padding: 4px; display: inline-flex; gap: 4px;
        }
        .pillbar button {
          background: transparent; border: none; padding: 6px 12px; border-radius: 999px;
          color: var(--text-muted); font-weight: 600; font-size: 12px; cursor: pointer;
          font-family: var(--body-font); touch-action: manipulation;
        }
        .pillbar button.active { background: var(--accent); color: var(--accent-text); }

        .thulla-card-btn { transition: transform .12s; cursor: default; position: relative; }
        .thulla-card-btn.is-playable { cursor: pointer; }
        .thulla-card-btn.is-playable:hover { transform: translateY(-12px); z-index: 999 !important; }
        .thulla-card-btn.is-playable:focus { transform: translateY(-12px); z-index: 999 !important; outline: none; }
        .thulla-card-btn.is-playable:active { transform: translateY(-12px) scale(1.05); z-index: 999 !important; }

        input[type="range"].vol {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 6px; border-radius: 3px;
          background: var(--panel-bg); border: 1px solid var(--panel-border);
          outline: none;
        }
        input[type="range"].vol::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: var(--accent); cursor: pointer;
          box-shadow: var(--accent-glow);
        }
        input[type="range"].vol::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%; border: none;
          background: var(--accent); cursor: pointer;
        }

        @keyframes slideIn { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .slide-in { animation: slideIn .35s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation: fadeIn .3s ease-out; }
        @keyframes pulseGold {
          0%,100% { box-shadow: 0 0 0 0 var(--accent), 0 2px 14px rgba(0,0,0,.4); }
          50% { box-shadow: 0 0 0 14px transparent, 0 2px 14px rgba(0,0,0,.4); }
        }
        .pulse { animation: pulseGold 2s infinite; }

        @keyframes slam {
          0% { transform: translateY(-280px) scale(2.6) rotate(-22deg); opacity: 0; }
          40% { transform: translateY(12px) scale(1.6) rotate(6deg); opacity: 1; }
          55% { transform: translateY(-6px) scale(1.25) rotate(-3deg); }
          75% { transform: translateY(2px) scale(1.05) rotate(1deg); }
          100% { transform: translateY(0) scale(1) rotate(0); }
        }
        .slam-anim { animation: slam .6s cubic-bezier(.34,1.56,.64,1); }

        @keyframes shake {
          0%,100% { transform: translateX(0) translateY(0); }
          10% { transform: translateX(-8px) translateY(2px); }
          20% { transform: translateX(8px) translateY(-2px); }
          30% { transform: translateX(-6px) translateY(2px); }
          40% { transform: translateX(6px) translateY(-1px); }
          50% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
          85% { transform: translateX(2px); }
        }
        .shake { animation: shake .55s; }

        @keyframes redFlash {
          0% { opacity: 0; }
          25% { opacity: 0.6; }
          100% { opacity: 0; }
        }
        .red-flash {
          position: fixed; inset: 0; pointer-events: none; z-index: 100;
          background: radial-gradient(circle at center, var(--danger) 0%, transparent 65%);
          animation: redFlash .55s ease-out;
        }

        @keyframes shockwave {
          0% { width: 30px; height: 30px; opacity: 1; border-width: 8px; }
          100% { width: 700px; height: 700px; opacity: 0; border-width: 1px; }
        }
        .shockwave {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          border-radius: 50%; border: 8px solid var(--danger);
          animation: shockwave .7s cubic-bezier(.16,.99,.3,1) forwards;
        }
        .shockwave-2 {
          border-color: var(--accent);
          animation-delay: .12s;
          animation-duration: .65s;
        }

        @keyframes crackGroup {
          0% { transform: scale(0); opacity: 0; }
          15% { transform: scale(.3); opacity: 1; }
          70% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.1); opacity: 0; }
        }
        .crack-group { transform-origin: center; animation: crackGroup .7s ease-out forwards; }

        @keyframes thullaMega {
          0% { transform: scale(0) rotate(-30deg) translateY(-80px); opacity: 0; }
          25% { transform: scale(1.7) rotate(10deg) translateY(0); opacity: 1; }
          40% { transform: scale(1.25) rotate(-5deg); }
          55% { transform: scale(1.1) rotate(3deg); }
          70% { transform: scale(.95) rotate(-1deg); }
          100% { transform: scale(1.05) rotate(0); opacity: 1; }
        }
        @keyframes thullaWobble {
          0%,100% { transform: scale(1.05) rotate(0); }
          25% { transform: scale(1.08) rotate(-1deg); }
          75% { transform: scale(1.08) rotate(1deg); }
        }
        .thulla-mega-text {
          font-family: var(--display-font); font-weight: 900;
          font-size: clamp(56px, 16vw, 110px);
          color: var(--danger);
          text-shadow:
            0 0 24px var(--danger),
            0 0 48px var(--danger),
            -2px -2px 0 #fff,
            2px 2px 0 rgba(0,0,0,.5),
            0 8px 18px rgba(0,0,0,.7);
          letter-spacing: .06em; line-height: 1;
          animation:
            thullaMega .85s cubic-bezier(.34,1.56,.64,1) forwards,
            thullaWobble 1.2s ease-in-out .85s infinite;
        }

        @keyframes confetti {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: absolute; width: 10px; height: 14px;
          animation: confetti 2.5s ease-in forwards;
        }
        .hand-row { padding-top: 18px; padding-bottom: 10px; }
        .menu-card-fan { display: flex; justify-content: center; margin: 24px 0; }
        .menu-card-fan > div { transform-origin: bottom center; transition: transform .3s; }
        .menu-card-fan > div:nth-child(1) { transform: rotate(-18deg) translateX(40px); }
        .menu-card-fan > div:nth-child(2) { transform: rotate(-6deg) translateX(15px); }
        .menu-card-fan > div:nth-child(3) { transform: rotate(6deg) translateX(-15px); }
        .menu-card-fan > div:nth-child(4) { transform: rotate(18deg) translateX(-40px); }

        .coin-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: linear-gradient(180deg, var(--accent), var(--accent-deep));
          color: var(--accent-text); font-weight: 800;
          padding: 4px 10px; border-radius: 999px; font-size: 13px;
          box-shadow: var(--accent-glow);
        }

        @keyframes spinDots {
          0%,100% { opacity: .3; }
          50% { opacity: 1; }
        }
        .thinking-dot { animation: spinDots 1s ease-in-out infinite; display: inline-block; }
        .thinking-dot:nth-child(2) { animation-delay: .15s; }
        .thinking-dot:nth-child(3) { animation-delay: .3s; }
      `}</style>

      <div className={`thulla-bg ${shake ? 'shake' : ''}`} style={themeVars}>
        {phase === 'menu' && (
          <MainMenu
            profile={profile}
            theme={theme} setTheme={setTheme}
            onPlayLocal={() => setPhase('lobby')}
            onShowRules={() => setShowRules(true)}
            onShowSettings={() => setShowSettings(true)}
            onShowCoinShop={() => setShowCoinShop(true)}
            onShowLadder={() => setShowLadder(true)}
            onShowAuth={() => setShowAuth(true)}
            session={session}
          />
        )}
        {phase === 'lobby' && (
          <Lobby
            profile={profile}
            stakesGame={stakesGame} setStakesGame={setStakesGame}
            stakesWager={stakesWager} setStakesWager={setStakesWager}
            onPickLocal={() => setPhase('nameEntry')}
            onPickAI={() => setPhase('botSetup')}
            onPickOnline={() => setPhase('online')}
            onBack={() => setPhase('menu')}
          />
        )}
        {phase === 'botSetup' && (
          <BotSetup
            difficulty={botDifficulty} setDifficulty={setBotDifficulty}
            onBack={() => setPhase('lobby')}
            onStart={startSoloAIGame}
            profile={profile}
          />
        )}
        {phase === 'nameEntry' && (
          <NameEntry
            names={names} avatars={avatars} setName={setName}
            onPickAvatar={(i) => setShowAvatarPicker(i)}
            onRandomize={randomizeNames}
            onBack={() => setPhase('lobby')}
            onStart={startLocalGame}
          />
        )}
        {phase === 'online' && (
          <RoomCodeView onBack={() => setPhase('lobby')} session={session} onShowAuth={() => setShowAuth(true)} />
        )}
        {(phase === 'pass' || phase === 'play') && !isBotAt(turn) && (
          <GameView
            hands={hands} turn={turn} leader={leader} trick={trick} ledSuit={ledSuit}
            firstRound={firstRound} eliminated={eliminated} phase={phase} revealed={revealed}
            reveal={reveal} playCard={playCard} validPlays={validPlays}
            canRequest={canRequest} pendingThullaBy={pendingThullaBy} initiateRequest={initiateRequest}
            setShowRules={setShowRules} setShowSettings={setShowSettings}
            playerInfo={playerInfo}
            onBackToMenu={() => setPhase('menu')}
            isStakes={stakesGame} stakesWager={stakesWager}
          />
        )}
        {(phase === 'pass' || phase === 'play') && isBotAt(turn) && (
          <BotSpectate
            turn={turn} hands={hands} trick={trick} ledSuit={ledSuit}
            eliminated={eliminated} pendingThullaBy={pendingThullaBy}
            playerInfo={playerInfo}
            onBackToMenu={() => setPhase('menu')}
            setShowRules={setShowRules} setShowSettings={setShowSettings}
          />
        )}
        {phase === 'requestPass' && (
          <RequestPass
            target={pendingThullaBy} requester={requestFrom}
            playerInfo={playerInfo}
            onReveal={() => { setRevealed(true); setPhase('requestDecide'); }}
          />
        )}
        {phase === 'requestDecide' && (
          <RequestDecide
            target={pendingThullaBy} requester={requestFrom}
            myCards={hands[pendingThullaBy]?.length ?? 0}
            playerInfo={playerInfo}
            onAccept={acceptRequest} onRefuse={refuseRequest}
            isHumanDeciding={!isBotAt(pendingThullaBy)}
          />
        )}
        {phase === 'botDeciding' && (
          <BotDeciding
            target={pendingThullaBy} requester={requestFrom}
            playerInfo={playerInfo}
          />
        )}
        {phase === 'result' && resultData && (
          <ResultView data={resultData} onContinue={continueAfterResult} playerInfo={playerInfo} />
        )}
        {phase === 'gameOver' && (
          <GameOverView
            winnersOrder={winnersOrder} eliminated={eliminated} hands={hands}
            playerInfo={playerInfo}
            onPlayAgain={() => gameMode === 'soloAI' ? startSoloAIGame() : startLocalGame()}
            onMenu={() => setPhase('menu')}
            isStakes={stakesGame} stakesWager={stakesWager} gameMode={gameMode}
            profile={profile}
          />
        )}
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        {showSettings && (
          <SettingsModal
            sfx={sfx} setSfx={setSfx}
            music={music} setMusic={setMusic}
            musicOn={musicOn} setMusicOn={setMusicOn}
            theme={theme} setTheme={setTheme}
            profile={profile}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showCoinShop && (
          <CoinShop
            profile={profile}
            onPurchase={(cat, id) => {
              const r = unlockItem(profile, cat, id);
              if (r.ok) { playCoin(); setProfile(r.profile); }
              return r;
            }}
            onSelect={(cat, id) => {
              const next = selectItem(profile, cat, id);
              setProfile(next);
              playUiTap();
            }}
            onClose={() => setShowCoinShop(false)}
          />
        )}
        {showLadder && (
          <TrophyLadderModal profile={profile} onClose={() => setShowLadder(false)} />
        )}
        {showAuth && (
          <AuthModal
            session={session} setSession={setSession}
            onClose={() => setShowAuth(false)}
          />
        )}
        {showAvatarPicker !== null && (
          <AvatarPicker current={avatars[showAvatarPicker]} onPick={pickAvatar} onClose={() => setShowAvatarPicker(null)} />
        )}
      </div>
    </>
  );
}

// ============================================================
// MainMenu
// ============================================================
function MainMenu({ profile, theme, setTheme, onPlayLocal, onShowRules, onShowSettings, onShowCoinShop, onShowLadder, onShowAuth, session }) {
  const sampleCards = [
    { suit: '♠', rank: 'A', red: false }, { suit: '♥', rank: 'K', red: true },
    { suit: '♣', rank: 'Q', red: false }, { suit: '♦', rank: 'J', red: true },
  ];
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="flex items-center gap-2">
          <button onClick={onShowAuth} className="btn-secondary" title="Account">
            {session ? '👤 ' + (session.user?.email?.split('@')[0] || 'me') : '👤 Sign in'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="coin-chip">🪙 {profile.coins}</span>
          <button onClick={onShowLadder} className="btn-secondary">🏆</button>
          <button onClick={onShowCoinShop} className="btn-secondary">🛍️</button>
          <button onClick={onShowSettings} className="btn-secondary">⚙</button>
        </div>
      </div>

      <div className="text-center mb-2 mt-12">
        <div className="display gold font-bold" style={{ fontSize: 64, letterSpacing: '.1em', textShadow: '0 6px 30px rgba(240,198,116,.35)', lineHeight: 1 }}>
          THULLA
        </div>
        <div className="muted text-sm italic mt-2 tracking-wide">throw down. or get thulla'd.</div>
      </div>

      <div className="menu-card-fan">
        {sampleCards.map((c, i) => (
          <div key={i}><CardFace card={c} size="md" playable={false} /></div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
        <button onClick={onPlayLocal} className="btn-primary pulse" style={{ fontSize: 17 }}>
          ▶  Play
          <div style={{ fontSize: 10, fontWeight: 500, opacity: .8, marginTop: 2 }}>vs AI · local · online</div>
        </button>
        <button onClick={onShowRules} className="btn-ghost">
          📖  How to play
        </button>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="text-[10px] muted uppercase tracking-widest">Theme</div>
        <div className="pillbar">
          {Object.entries(THEMES).map(([key, t]) => {
            const owned = isUnlocked(profile, 'themes', key);
            return (
              <button key={key} disabled={!owned} onClick={() => owned && setTheme(key)}
                className={theme === key ? 'active' : ''}
                style={{ opacity: owned ? 1 : 0.4 }}
                title={owned ? '' : 'Unlock in shop'}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: t.swatch[1], marginRight: 6, verticalAlign: 'middle' }} />
                {t.name}{!owned && ' 🔒'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Lobby — pick mode
// ============================================================
function Lobby({ profile, stakesGame, setStakesGame, stakesWager, setStakesWager, onPickLocal, onPickAI, onPickOnline, onBack }) {
  return (
    <div className="flex flex-col min-h-screen p-5 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Menu</button>
        <span className="coin-chip">🪙 {profile.coins}</span>
      </div>

      <div className="text-center mb-6">
        <div className="display gold font-bold" style={{ fontSize: 32 }}>Pick a mode</div>
        <div className="muted text-xs mt-1">all modes use the same rules</div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <button onClick={onPickAI} className="panel p-4 text-left slide-in" style={{ borderColor: 'var(--accent)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 32 }}>🤖</span>
            <div>
              <div className="display gold font-bold text-lg">vs AI</div>
              <div className="muted text-xs">solo · 3 bots · earn coins</div>
            </div>
          </div>
        </button>
        <button onClick={onPickLocal} className="panel p-4 text-left slide-in" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 32 }}>👥</span>
            <div>
              <div className="display gold font-bold text-lg">Local pass-and-play</div>
              <div className="muted text-xs">4 humans on one phone</div>
            </div>
          </div>
        </button>
        <button onClick={onPickOnline} className="panel p-4 text-left slide-in" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 32 }}>🌐</span>
            <div>
              <div className="display gold font-bold text-lg">Online <span className="text-xs muted">· beta</span></div>
              <div className="muted text-xs">room codes · play with friends anywhere</div>
            </div>
          </div>
        </button>
      </div>

      {/* Stakes toggle */}
      <div className="panel p-4 slide-in" style={{ animationDelay: '180ms' }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="display gold font-bold">Stakes</div>
            <div className="muted text-xs">wager coins · bigger pot, bigger payout</div>
          </div>
          <button onClick={() => setStakesGame(!stakesGame)} className="btn-secondary"
            style={{ background: stakesGame ? 'var(--accent)' : 'var(--panel-bg)',
                     color: stakesGame ? 'var(--accent-text)' : 'var(--accent)' }}>
            {stakesGame ? 'On' : 'Off'}
          </button>
        </div>
        {stakesGame && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="muted">Wager per player</span>
              <span className="gold font-bold">🪙 {stakesWager}</span>
            </div>
            <input className="vol" type="range" min={10} max={Math.min(profile.coins, 500)} step={10}
                   value={stakesWager} onChange={e => setStakesWager(parseInt(e.target.value))} />
            <div className="muted text-[10px] mt-1 italic">winner takes 50% · 2nd 25% · 3rd 15% · 4th 0% (you eat the loss)</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// BotSetup — pick AI difficulty
// ============================================================
function BotSetup({ difficulty, setDifficulty, onBack, onStart, profile }) {
  return (
    <div className="flex flex-col min-h-screen p-5 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Lobby</button>
        <span className="coin-chip">🪙 {profile.coins}</span>
      </div>

      <div className="text-center mb-6">
        <div className="display gold font-bold" style={{ fontSize: 32 }}>Pick your difficulty</div>
        <div className="muted text-xs mt-1">three bots will be drawn from a roster of personalities</div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {Object.values(DIFFICULTIES).map(d => (
          <button key={d.id} onClick={() => setDifficulty(d.id)}
            className="panel p-4 text-left slide-in"
            style={{ borderColor: difficulty === d.id ? 'var(--accent)' : 'var(--panel-border)' }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 32 }}>
                {d.id === 'easy' ? '🐣' : d.id === 'medium' ? '🦊' : '🐯'}
              </span>
              <div className="flex-1">
                <div className="display gold font-bold text-lg">{d.name}</div>
                <div className="muted text-xs">{d.blurb}</div>
              </div>
              {difficulty === d.id && <span className="gold font-bold">✓</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="panel p-3 mb-4">
        <div className="text-[10px] gold uppercase tracking-widest mb-2">Bot roster preview</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(PERSONALITIES).slice(0, 6).map(p => (
            <div key={p.id} className="text-center text-[10px]">
              <div style={{ fontSize: 24 }}>{p.avatar}</div>
              <div className="gold font-bold">{p.name}</div>
              <div className="muted italic">{p.blurb}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onStart} className="btn-primary pulse" style={{ width: '100%' }}>
        Deal the cards →
      </button>
    </div>
  );
}

// ============================================================
// NameEntry (local pass-and-play)
// ============================================================
function NameEntry({ names, avatars, setName, onPickAvatar, onRandomize, onBack, onStart }) {
  return (
    <div className="flex flex-col min-h-screen p-5 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Lobby</button>
        <button onClick={onRandomize} className="btn-secondary">🎲 Random</button>
      </div>

      <div className="text-center mb-6">
        <div className="display gold font-bold" style={{ fontSize: 36 }}>Who's playing?</div>
        <div className="muted text-xs mt-1">tap the avatar to change · names appear on every screen</div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="panel p-3 flex items-center gap-3 slide-in" style={{ animationDelay: `${i * 60}ms` }}>
            <button onClick={() => onPickAvatar(i)} className="avatar-bubble">{avatars[i]}</button>
            <input
              className="input-field"
              placeholder={`Player ${i + 1}`}
              value={names[i]}
              onChange={e => setName(i, e.target.value)}
              maxLength={14}
            />
          </div>
        ))}
      </div>

      <button onClick={onStart} className="btn-primary pulse" style={{ width: '100%' }}>
        Deal cards →
      </button>
      <div className="text-center muted text-[10px] mt-2">A♠ holder leads first · must play A♠</div>
    </div>
  );
}

// ============================================================
// AvatarPicker
// ============================================================
function AvatarPicker({ current, onPick, onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,.75)', zIndex: 60 }}>
      <div onClick={e => e.stopPropagation()} className="panel p-5 max-w-xs w-full">
        <div className="display gold text-xl font-bold mb-3 text-center">Pick avatar</div>
        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map(av => (
            <button
              key={av} onClick={() => onPick(av)} className="avatar-bubble"
              style={{ width: '100%', aspectRatio: '1', opacity: av === current ? 1 : 0.7, borderWidth: av === current ? 3 : 1 }}
            >
              {av}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GameView (human's turn)
// ============================================================
function GameView({ hands, turn, leader, trick, ledSuit, firstRound, eliminated, phase, revealed, reveal, playCard, validPlays, canRequest, pendingThullaBy, initiateRequest, setShowRules, setShowSettings, playerInfo, onBackToMenu, isStakes, stakesWager }) {
  const opponentOrder = [];
  for (let i = 1; i < N; i++) opponentOrder.push((turn + i) % N);
  const seniorNow = trick.length > 0 && ledSuit ? findSenior(trick, ledSuit) : null;
  const myHand = hands[turn] || [];
  const tooManyCards = myHand.length > 13;
  const overlap = tooManyCards ? -42 : -32;
  const me = playerInfo(turn);

  return (
    <div className="flex flex-col min-h-screen p-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBackToMenu} className="btn-secondary">← Menu</button>
        <div className="display gold text-xl font-bold tracking-widest">THULLA</div>
        <div className="flex gap-1">
          {isStakes && <span className="coin-chip" style={{ fontSize: 11 }}>🪙 {stakesWager}</span>}
          <button onClick={() => setShowSettings(true)} className="btn-secondary">⚙</button>
          <button onClick={() => setShowRules(true)} className="btn-secondary">?</button>
        </div>
      </div>

      <div className="panel px-3 py-2 mb-2 text-center text-xs">
        {firstRound && trick.length === 0 ? (
          <span className="gold">Opening · {me.name} must play A♠</span>
        ) : ledSuit && trick.length > 0 ? (
          <span>Led: <span className="gold font-bold">{ledSuit}</span> · Senior: <span className="gold font-bold">{seniorNow !== null ? playerInfo(seniorNow).name : '—'}</span></span>
        ) : (
          <span className="gold">{me.name} leads the round</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        {opponentOrder.map(p => {
          const info = playerInfo(p);
          return (
            <div key={p} className={`panel p-2 text-center ${eliminated.includes(p) ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-center gap-1">
                <span style={{ fontSize: 16 }}>{info.avatar}</span>
                <span className="text-xs truncate" style={{ maxWidth: 70 }}>{info.name}</span>
                {info.isBot && <span style={{ fontSize: 9 }} className="muted">bot</span>}
              </div>
              <div className="display gold font-bold leading-none my-1" style={{ fontSize: 24 }}>{hands[p]?.length ?? 0}</div>
              <div className="text-[10px] muted">
                {eliminated.includes(p) ? 'WON · out' : 'cards'}
              </div>
              {leader === p && !eliminated.includes(p) && (
                <div className="text-[10px] gold mt-0.5">↳ leader</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel p-3 mb-2 flex flex-col items-center justify-center" style={{ minHeight: 140 }}>
        {trick.length === 0 ? (
          <div className="muted text-sm italic">— empty table —</div>
        ) : (
          <div className="flex flex-wrap gap-3 items-end justify-center">
            {trick.map((t, i) => {
              const info = playerInfo(t.player);
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-[10px] muted mb-1 flex items-center gap-1">
                    <span style={{ fontSize: 12 }}>{info.avatar}</span>
                    <span>{info.name}</span>
                  </div>
                  <CardFace card={t.card} size="sm" playable={false} />
                  {t.isThulla && <div className="text-[10px] mt-1 font-bold" style={{ color: 'var(--danger)' }}>THULLA</div>}
                  {!t.isThulla && t.player === seniorNow && <div className="text-[10px] gold mt-1 font-bold">SENIOR</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end">
        {phase === 'pass' && (
          <div className="panel p-5 text-center slide-in">
            <div className="text-[10px] muted uppercase tracking-widest mb-2">Privacy mode</div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span style={{ fontSize: 36 }}>{me.avatar}</span>
              <div className="display gold text-2xl font-bold">{me.name}</div>
            </div>
            <div className="muted text-sm mb-4">{myHand.length} cards in hand</div>
            <button onClick={reveal} className="btn-primary pulse" style={{ width: '100%' }}>
              Reveal hand
            </button>
          </div>
        )}

        {phase === 'play' && revealed && (
          <div className="slide-in">
            {canRequest && (
              <div className="mb-3">
                <button onClick={initiateRequest} className="btn-danger">
                  Request cards from {playerInfo(pendingThullaBy).name}
                </button>
                <div className="text-[10px] muted text-center mt-1">
                  they decide: hand over their cards, or refuse and force you to play
                </div>
              </div>
            )}
            <div className="text-xs gold text-center mb-1">your hand · tap a card to play</div>
            {trick.length > 0 && !myHand.some(c => c.suit === ledSuit) && (
              <div className="text-center text-xs italic mb-1" style={{ color: 'var(--danger)' }}>
                no {ledSuit} — pick anything to throw THULLA
              </div>
            )}
            <div className="overflow-x-auto hand-row" style={{ marginLeft: -4, marginRight: -4 }}>
              <div className="flex justify-center" style={{ paddingLeft: 18, paddingRight: 18, minWidth: 'min-content' }}>
                {myHand.map((card, idx) => (
                  <div key={card.id} style={{ marginLeft: idx === 0 ? 0 : overlap, zIndex: idx, position: 'relative' }}>
                    <CardFace
                      card={card}
                      onClick={() => playCard(idx)}
                      disabled={!validPlays.has(idx)}
                      playable={validPlays.has(idx)}
                      dim={!validPlays.has(idx)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// BotSpectate (bot's turn — show table, not hand)
// ============================================================
function BotSpectate({ turn, hands, trick, ledSuit, eliminated, pendingThullaBy, playerInfo, onBackToMenu, setShowRules, setShowSettings }) {
  const me = playerInfo(turn);
  const seniorNow = trick.length > 0 && ledSuit ? findSenior(trick, ledSuit) : null;

  return (
    <div className="flex flex-col min-h-screen p-3 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBackToMenu} className="btn-secondary">← Menu</button>
        <div className="display gold text-xl font-bold tracking-widest">THULLA</div>
        <div className="flex gap-1">
          <button onClick={() => setShowSettings(true)} className="btn-secondary">⚙</button>
          <button onClick={() => setShowRules(true)} className="btn-secondary">?</button>
        </div>
      </div>

      <div className="panel px-3 py-2 mb-2 text-center text-xs gold">
        {me.avatar} {me.name} is thinking
        <span className="thinking-dot">.</span>
        <span className="thinking-dot">.</span>
        <span className="thinking-dot">.</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        {[0, 1, 2, 3].map(p => {
          const info = playerInfo(p);
          const isCurrent = p === turn;
          return (
            <div key={p} className={`panel p-2 text-center ${eliminated.includes(p) ? 'opacity-50' : ''}`}
                 style={{ borderColor: isCurrent ? 'var(--accent)' : 'var(--panel-border)' }}>
              <div className="flex items-center justify-center gap-1">
                <span style={{ fontSize: 16 }}>{info.avatar}</span>
              </div>
              <div className="text-[10px] truncate">{info.name}</div>
              <div className="display gold font-bold leading-none my-1" style={{ fontSize: 22 }}>{hands[p]?.length ?? 0}</div>
              <div className="text-[10px] muted">
                {eliminated.includes(p) ? 'OUT' : info.isBot ? 'bot' : 'you'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel p-4 mb-2 flex flex-col items-center justify-center flex-1" style={{ minHeight: 240 }}>
        {trick.length === 0 ? (
          <div className="muted text-sm italic">{me.name} is choosing a card to lead</div>
        ) : (
          <>
            <div className="text-[10px] muted uppercase tracking-widest mb-2">on the table</div>
            <div className="flex flex-wrap gap-3 items-end justify-center">
              {trick.map((t, i) => {
                const info = playerInfo(t.player);
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-[10px] muted mb-1 flex items-center gap-1">
                      <span style={{ fontSize: 12 }}>{info.avatar}</span>
                      <span>{info.name}</span>
                    </div>
                    <CardFace card={t.card} size="sm" playable={false} />
                    {t.isThulla && <div className="text-[10px] mt-1 font-bold" style={{ color: 'var(--danger)' }}>THULLA</div>}
                    {!t.isThulla && t.player === seniorNow && <div className="text-[10px] gold mt-1 font-bold">SENIOR</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Request flows
// ============================================================
function RequestPass({ target, requester, playerInfo, onReveal }) {
  const t = playerInfo(target), r = playerInfo(requester);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      <div className="panel p-6 max-w-md w-full text-center slide-in">
        <div className="text-[10px] muted uppercase tracking-widest mb-2">Decision required</div>
        <div className="display font-bold mb-3" style={{ fontSize: 28, color: 'var(--danger)' }}>
          Cards demanded
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span style={{ fontSize: 36 }}>{r.avatar}</span>
          <span className="muted text-2xl">→</span>
          <span style={{ fontSize: 36 }}>{t.avatar}</span>
        </div>
        <div className="text-sm mb-2">
          <span className="gold font-bold">{r.name}</span> is asking <span className="gold font-bold">{t.name}</span> to hand over their cards.
        </div>
        <div className="muted text-xs mb-5">Pass the phone — only {t.name} should see the next screen.</div>
        <button onClick={onReveal} className="btn-primary pulse" style={{ width: '100%' }}>
          I'm {t.name} — see the request
        </button>
      </div>
    </div>
  );
}

function RequestDecide({ target, requester, myCards, playerInfo, onAccept, onRefuse, isHumanDeciding }) {
  const t = playerInfo(target), r = playerInfo(requester);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      <div className="panel p-6 max-w-md w-full text-center slide-in">
        <div className="text-[10px] muted uppercase tracking-widest mb-2">Your call, {t.name}</div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <span style={{ fontSize: 40 }}>{r.avatar}</span>
          <span className="muted">demands</span>
          <span style={{ fontSize: 40 }}>{t.avatar}</span>
        </div>

        <div className="display gold font-bold mb-1" style={{ fontSize: 24 }}>
          {r.name} wants your hand
        </div>
        <div className="text-sm mb-5">{myCards} cards on the line</div>

        <div className="flex flex-col gap-3">
          <button onClick={onAccept} className="btn-primary" style={{ width: '100%', background: 'linear-gradient(180deg, var(--success) 0%, #2d7a55 100%)', color: '#04150d', borderColor: '#2d7a55' }}>
            ✓ Accept — I win, take my cards
            <div style={{ fontSize: 10, fontWeight: 500, opacity: .85, marginTop: 2 }}>
              {r.name} absorbs your hand · you're out (winner)
            </div>
          </button>
          <button onClick={onRefuse} className="btn-danger" style={{ width: '100%' }}>
            ✗ Refuse — keep playing
            <div style={{ fontSize: 10, fontWeight: 500, opacity: .85, marginTop: 2 }}>
              {r.name} stays stuck, leads again
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function BotDeciding({ target, requester, playerInfo }) {
  const t = playerInfo(target), r = playerInfo(requester);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      <div className="panel p-6 max-w-md w-full text-center slide-in">
        <div className="text-[10px] muted uppercase tracking-widest mb-2">Awaiting decision</div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span style={{ fontSize: 40 }}>{r.avatar}</span>
          <span className="muted">→</span>
          <span style={{ fontSize: 40 }}>{t.avatar}</span>
        </div>
        <div className="display gold font-bold mb-2" style={{ fontSize: 24 }}>
          {t.name} is deciding
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
        </div>
        <div className="muted text-xs">{r.name} requested the cards</div>
      </div>
    </div>
  );
}

// ============================================================
// ResultView
// ============================================================
function ResultView({ data, onContinue, playerInfo }) {
  const [showSlam, setShowSlam] = useState(data.type === 'thulla');
  useEffect(() => {
    if (data.type === 'thulla') {
      const t = setTimeout(() => setShowSlam(false), 900);
      return () => clearTimeout(t);
    }
  }, [data.type]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in relative">
      {data.type === 'thulla' && showSlam && <div className="red-flash" />}
      {data.type === 'thulla' && showSlam && <ImpactBurst />}
      {data.type === 'thulla' && (
        <div style={{
          position: 'fixed', top: '6%', left: 0, right: 0,
          textAlign: 'center', zIndex: 101, pointerEvents: 'none',
        }}>
          <div className="thulla-mega-text">THULLA!</div>
        </div>
      )}

      <div className="panel p-6 max-w-md w-full text-center slide-in" style={{ marginTop: data.type === 'thulla' ? 90 : 0 }}>
        {data.type === 'thulla' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span style={{ fontSize: 26 }}>{playerInfo(data.thullaBy).avatar}</span>
              <span className="muted text-sm">slammed</span>
              <div className={showSlam ? 'slam-anim' : ''}>
                <CardFace card={data.thullaCard} size="md" playable={false} />
              </div>
            </div>
            <div className="text-sm mb-3">
              <span className="gold font-bold">{playerInfo(data.thullaBy).name}</span> couldn't follow {data.ledSuit}.<br/>
              <span className="gold font-bold">{playerInfo(data.senior).name}</span> picks up <span className="gold font-bold">{data.cards.length}</span> cards.
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {data.cards.map((c, i) => <CardFace key={i} card={c} size="sm" playable={false} />)}
            </div>
          </>
        )}
        {data.type === 'flush' && (
          <>
            <div className="display gold font-bold mb-3" style={{ fontSize: 32 }}>Round won</div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span style={{ fontSize: 24 }}>{playerInfo(data.senior).avatar}</span>
              <span><span className="gold font-bold">{playerInfo(data.senior).name}</span> takes the {data.ledSuit} round</span>
            </div>
            <div className="muted text-xs mb-3">cards flushed</div>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {data.cards.map((c, i) => <CardFace key={i} card={c} size="sm" playable={false} />)}
            </div>
            {data.actualLeader !== data.senior && (
              <div className="text-xs muted italic mb-3">
                {playerInfo(data.senior).name} ran out — {playerInfo(data.actualLeader).name} leads next
              </div>
            )}
          </>
        )}
        {data.type === 'request' && (
          <>
            <div className="display gold font-bold mb-3" style={{ fontSize: 32 }}>Cards handed over</div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span style={{ fontSize: 28 }}>{playerInfo(data.requester).avatar}</span>
              <span className="muted">←</span>
              <span style={{ fontSize: 28 }}>{playerInfo(data.target).avatar}</span>
            </div>
            <div className="text-sm mb-4">
              <span className="gold font-bold">{playerInfo(data.target).name}</span> agreed and walked away with the win.<br/>
              <span className="gold font-bold">{playerInfo(data.requester).name}</span> absorbed {data.cardsTaken} cards.
            </div>
          </>
        )}
        {data.type === 'refusal' && (
          <>
            <div className="display font-bold mb-3" style={{ fontSize: 30, color: 'var(--danger)' }}>Refused!</div>
            <div className="flex items-center justify-center gap-3 mb-3">
              <span style={{ fontSize: 32 }}>{playerInfo(data.target).avatar}</span>
              <span style={{ fontSize: 22 }}>🚫</span>
              <span style={{ fontSize: 32 }}>{playerInfo(data.requester).avatar}</span>
            </div>
            <div className="text-sm mb-4">
              <span className="gold font-bold">{playerInfo(data.target).name}</span> refused the request.<br/>
              <span className="gold font-bold">{playerInfo(data.requester).name}</span> must keep playing.
            </div>
          </>
        )}

        {data.newWinners?.length > 0 && (
          <div className="mb-4 p-3 rounded" style={{ background: 'rgba(0,80,40,.4)', border: '1px solid var(--success)' }}>
            {data.newWinners.map(w => (
              <div key={w} className="font-bold text-sm flex items-center justify-center gap-2" style={{ color: 'var(--success)' }}>
                <span>🏆</span><span>{playerInfo(w).avatar}</span><span>{playerInfo(w).name} — WINNER</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onContinue} className="btn-primary" style={{ width: '100%' }}>Continue</button>
      </div>
    </div>
  );
}

// ============================================================
// GameOverView
// ============================================================
function GameOverView({ winnersOrder, eliminated, hands, playerInfo, onPlayAgain, onMenu, isStakes, stakesWager, gameMode, profile }) {
  let loser = null;
  for (let i = 0; i < N; i++) if (!eliminated.includes(i)) { loser = i; break; }
  const colors = ['#f0c674', '#c0c0c0', '#cd7f32', 'var(--danger)'];
  const humanPlace = winnersOrder.indexOf(0) + 1 || N;
  const showRewards = gameMode === 'soloAI';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in relative overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="confetti-piece" style={{
          left: `${Math.random() * 100}%`, top: `-20px`,
          background: ['var(--accent)', 'var(--success)', 'var(--danger)', '#fff'][i % 4],
          animationDelay: `${Math.random() * 1.5}s`,
        }} />
      ))}

      <div className="panel p-6 max-w-md w-full text-center slide-in">
        <div className="display gold font-bold mb-1" style={{ fontSize: 42 }}>Game Over</div>
        <div className="text-lg mb-6 flex items-center justify-center gap-2" style={{ color: 'var(--danger)' }}>
          <span style={{ fontSize: 28 }}>{loser !== null ? playerInfo(loser).avatar : ''}</span>
          <span>{loser !== null ? `${playerInfo(loser).name} is the THULLA` : 'Everyone won'}</span>
        </div>

        <div className="text-left mb-6">
          <div className="text-[10px] gold uppercase tracking-widest mb-2 text-center">Final standings</div>
          {winnersOrder.map((p, i) => {
            const info = playerInfo(p);
            return (
              <div key={p} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--panel-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="display font-bold w-6 text-lg" style={{ color: colors[i] }}>{i + 1}</span>
                  <span style={{ fontSize: 22 }}>{info.avatar}</span>
                  <span>{info.name}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--success)' }}>{i === 0 ? 'CHAMPION' : 'WINNER'}</span>
              </div>
            );
          })}
          {loser !== null && (
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-3">
                <span className="display font-bold w-6 text-lg" style={{ color: 'var(--danger)' }}>{N}</span>
                <span style={{ fontSize: 22 }}>{playerInfo(loser).avatar}</span>
                <span>{playerInfo(loser).name}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--danger)' }}>THULLA · {hands[loser]?.length}</span>
            </div>
          )}
        </div>

        {showRewards && (
          <div className="panel p-3 mb-4" style={{ background: 'rgba(255,215,0,.08)' }}>
            <div className="text-[10px] gold uppercase tracking-widest mb-1">Your rewards</div>
            <div className="text-sm">
              You finished <span className="gold font-bold">#{humanPlace}</span>.
              {humanPlace === 1 && ' You took the championship pot. 🏆'}
              {humanPlace === 4 && ' You wear the THULLA crown. Sorry.'}
            </div>
            <div className="muted text-[10px] mt-1">Coins and trophies updated. Total: 🪙 {profile.coins}</div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onMenu} className="btn-ghost" style={{ flex: 1 }}>Menu</button>
          <button onClick={onPlayAgain} className="btn-primary" style={{ flex: 2 }}>Play Again</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SettingsModal
// ============================================================
function SettingsModal({ sfx, setSfx, music, setMusic, musicOn, setMusicOn, theme, setTheme, profile, onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,.78)', zIndex: 70 }}>
      <div onClick={e => e.stopPropagation()} className="panel p-6 max-w-md w-full" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="display gold text-2xl font-bold">Settings</div>
          <button onClick={onClose} className="text-3xl leading-none muted">×</button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm">SFX volume</span>
              <span className="muted text-xs">{Math.round(sfx * 100)}%</span>
            </div>
            <input className="vol" type="range" min={0} max={1} step={0.05} value={sfx} onChange={e => setSfx(parseFloat(e.target.value))} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm">Music</span>
              <button
                onClick={() => setMusicOn(!musicOn)}
                className="btn-secondary"
                style={{ background: musicOn ? 'var(--accent)' : 'var(--panel-bg)', color: musicOn ? 'var(--accent-text)' : 'var(--accent)' }}
              >
                {musicOn ? 'On' : 'Off'}
              </button>
            </div>
            <div className="flex justify-between mb-1">
              <span className="muted text-xs">volume</span>
              <span className="muted text-xs">{Math.round(music * 100)}%</span>
            </div>
            <input className="vol" type="range" min={0} max={1} step={0.05} value={music} onChange={e => setMusic(parseFloat(e.target.value))} disabled={!musicOn} style={{ opacity: musicOn ? 1 : .4 }} />
            <div className="muted text-[10px] mt-1 italic">ambient drone · richer music coming in next phase</div>
          </div>

          <div>
            <div className="text-sm mb-2">Theme</div>
            <div className="pillbar" style={{ width: '100%', flexWrap: 'wrap' }}>
              {Object.entries(THEMES).map(([key, t]) => {
                const owned = isUnlocked(profile, 'themes', key);
                return (
                  <button key={key} disabled={!owned} onClick={() => owned && setTheme(key)}
                    className={theme === key ? 'active' : ''}
                    style={{ flex: '1 0 30%', textAlign: 'center', opacity: owned ? 1 : 0.4 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: t.swatch[1], marginRight: 6, verticalAlign: 'middle' }} />
                    {t.name}{!owned && ' 🔒'}
                  </button>
                );
              })}
            </div>
            <div className="muted text-[10px] mt-2 italic">unlock more themes in the shop 🛍️</div>
          </div>
        </div>

        <button onClick={onClose} className="btn-primary mt-6" style={{ width: '100%' }}>Done</button>
      </div>
    </div>
  );
}

// ============================================================
// CoinShop
// ============================================================
function CoinShop({ profile, onPurchase, onSelect, onClose }) {
  const [tab, setTab] = useState('themes');
  const [feedback, setFeedback] = useState(null);

  const tabs = [
    { id: 'themes',    label: 'Themes',    icon: '🎨' },
    { id: 'avatars',   label: 'Avatars',   icon: '🎭' },
    { id: 'cardBacks', label: 'Card backs', icon: '🃏' },
    { id: 'slamFx',    label: 'Slam FX',   icon: '💥' },
  ];
  const items = COSMETICS[tab] || [];

  const handleBuy = (id) => {
    const r = onPurchase(tab, id);
    if (r.ok) setFeedback({ type: 'ok', msg: 'Unlocked!' });
    else if (r.reason === 'no-coins') setFeedback({ type: 'err', msg: 'Not enough coins.' });
    else if (r.reason === 'already')  setFeedback({ type: 'err', msg: 'Already owned.' });
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,.85)', zIndex: 80 }}>
      <div onClick={e => e.stopPropagation()} className="panel p-5 max-w-md w-full" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="display gold text-2xl font-bold">Shop 🛍️</div>
          <span className="coin-chip">🪙 {profile.coins}</span>
        </div>

        <div className="pillbar mb-4" style={{ width: '100%', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'active' : ''} style={{ flex: 1 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div className="text-center text-xs mb-3" style={{ color: feedback.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
            {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {items.map(item => {
            const owned = isUnlocked(profile, tab, item.id);
            const selectedField = ({themes:'selectedTheme', cardBacks:'selectedCardBack', slamFx:'selectedSlamFx', avatars:null})[tab];
            const isSelected = tab === 'avatars'
              ? profile.avatar === item.glyph
              : profile[selectedField] === item.id;
            return (
              <div key={item.id} className="panel p-3 text-center" style={{
                borderColor: isSelected ? 'var(--accent)' : 'var(--panel-border)',
                opacity: owned ? 1 : 0.85,
              }}>
                {tab === 'avatars' && (
                  <div className="avatar-bubble mx-auto mb-2" style={{ fontSize: 28 }}>{item.glyph}</div>
                )}
                {tab === 'themes' && (
                  <div className="mx-auto mb-2 rounded-md" style={{
                    width: 64, height: 40,
                    background: `linear-gradient(135deg, ${item.swatch[0]}, ${item.swatch[1]})`,
                    border: '1px solid var(--panel-border)',
                  }} />
                )}
                {(tab === 'cardBacks' || tab === 'slamFx') && (
                  <div className="muted mb-2" style={{ fontSize: 28 }}>
                    {tab === 'cardBacks' ? '🂠' : (item.id === 'fire' ? '🔥' : item.id === 'lightning' ? '⚡' : item.id === 'shatter' ? '💥' : '🃏')}
                  </div>
                )}
                <div className="gold font-bold text-sm">{item.name || item.id}</div>
                {owned ? (
                  isSelected ? (
                    <div className="text-[10px] mt-2" style={{ color: 'var(--success)' }}>✓ Selected</div>
                  ) : (
                    <button onClick={() => onSelect(tab, item.id)} className="btn-secondary mt-2" style={{ width: '100%' }}>
                      Use
                    </button>
                  )
                ) : (
                  <button onClick={() => handleBuy(item.id)} className="btn-primary mt-2" style={{ width: '100%', padding: '6px 8px', fontSize: 12 }}>
                    🪙 {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="btn-ghost mt-4" style={{ width: '100%' }}>Done</button>
      </div>
    </div>
  );
}

// ============================================================
// TrophyLadder
// ============================================================
function TrophyLadderModal({ profile, onClose }) {
  const ladder = getLadder();
  const myRow = { name: profile.displayName || 'you', trophies: 0, avatar: profile.avatar };
  const allRows = ladder.find(r => r.name === myRow.name) ? ladder : [...ladder, myRow].sort((a,b) => b.trophies - a.trophies);
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,.85)', zIndex: 80 }}>
      <div onClick={e => e.stopPropagation()} className="panel p-5 max-w-md w-full" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="display gold text-2xl font-bold">Trophy Ladder 🏆</div>
          <button onClick={onClose} className="text-3xl leading-none muted">×</button>
        </div>
        <div className="text-[10px] muted uppercase tracking-widest mb-2 text-center">local rankings · cloud ladder coming with accounts</div>
        <div>
          {allRows.slice(0, 30).map((row, i) => {
            const isMe = row.name === (profile.displayName || 'you');
            return (
              <div key={row.name + i} className="flex items-center gap-3 py-2 border-b" style={{
                borderColor: 'var(--panel-border)',
                background: isMe ? 'rgba(232,184,92,.08)' : 'transparent',
                paddingLeft: 8, paddingRight: 8, borderRadius: 6,
              }}>
                <span className="display gold font-bold w-6">{i + 1}</span>
                <span style={{ fontSize: 22 }}>{row.avatar}</span>
                <span className="flex-1">{row.name}{isMe && <span className="muted text-xs"> · you</span>}</span>
                <span className="gold font-bold">🏆 {row.trophies}</span>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="btn-primary mt-4" style={{ width: '100%' }}>Close</button>
      </div>
    </div>
  );
}

// ============================================================
// AuthModal — sign in / up (works only when Supabase configured)
// ============================================================
function AuthModal({ session, setSession, onClose }) {
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async () => {
    setBusy(true); setMsg(null);
    const fn = mode === 'signIn' ? signInWithEmail : signUpWithEmail;
    const { data, error } = await fn(email, password);
    setBusy(false);
    if (error) setMsg({ type: 'err', text: error.message });
    else { setMsg({ type: 'ok', text: mode === 'signUp' ? 'Check your email to confirm.' : 'Signed in.' }); if (data?.session) setSession(data.session); }
  };
  const oauth = async (provider) => {
    setBusy(true); setMsg(null);
    const fn = provider === 'google' ? signInWithGoogle : signInWithFacebook;
    const { error } = await fn();
    setBusy(false);
    if (error) setMsg({ type: 'err', text: error.message });
  };
  const doSignOut = async () => { await signOut(); setSession(null); };

  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,.85)', zIndex: 80 }}>
      <div onClick={e => e.stopPropagation()} className="panel p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-3">
          <div className="display gold text-2xl font-bold">Account</div>
          <button onClick={onClose} className="text-3xl leading-none muted">×</button>
        </div>

        {!isSupabaseConfigured && (
          <div className="text-xs mb-4 p-3 rounded" style={{ background: 'rgba(255,200,0,.1)', border: '1px solid var(--accent)' }}>
            Online accounts aren't connected yet.<br/>
            See <code>SUPABASE.md</code> in the project to enable email + Google + Facebook sign-in.<br/>
            For now, your coins and ladder are saved locally on this device.
          </div>
        )}

        {session ? (
          <>
            <div className="text-sm mb-4 text-center">
              Signed in as <span className="gold font-bold">{session.user?.email}</span>
            </div>
            <button onClick={doSignOut} className="btn-danger" style={{ width: '100%' }}>Sign out</button>
          </>
        ) : (
          <>
            <div className="pillbar mb-3" style={{ width: '100%' }}>
              <button onClick={() => setMode('signIn')} className={mode === 'signIn' ? 'active' : ''} style={{ flex: 1 }}>Sign in</button>
              <button onClick={() => setMode('signUp')} className={mode === 'signUp' ? 'active' : ''} style={{ flex: 1 }}>Sign up</button>
            </div>

            <input className="input-field mb-2" placeholder="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="input-field mb-3" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />

            <button onClick={submit} disabled={busy || !isSupabaseConfigured} className="btn-primary mb-3" style={{ width: '100%' }}>
              {mode === 'signIn' ? 'Sign in' : 'Create account'}
            </button>

            <div className="text-center muted text-xs my-2">— or —</div>

            <div className="flex gap-2">
              <button onClick={() => oauth('google')} disabled={busy || !isSupabaseConfigured} className="btn-ghost" style={{ flex: 1 }}>
                Continue with Google
              </button>
              <button onClick={() => oauth('facebook')} disabled={busy || !isSupabaseConfigured} className="btn-ghost" style={{ flex: 1 }}>
                Continue with Facebook
              </button>
            </div>

            {msg && (
              <div className="text-xs mt-3 text-center" style={{ color: msg.type === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
                {msg.text}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// RoomCodeView — online multiplayer placeholder
// ============================================================
function RoomCodeView({ onBack, session, onShowAuth }) {
  const [code, setCode] = useState('');
  return (
    <div className="flex flex-col min-h-screen p-5 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Lobby</button>
        <span className="muted text-xs">Online · beta</span>
      </div>

      <div className="text-center mb-6">
        <div className="display gold font-bold" style={{ fontSize: 32 }}>Play online</div>
        <div className="muted text-xs mt-1">create a room or join with a 4-letter code</div>
      </div>

      {!session ? (
        <div className="panel p-4 mb-4 text-center">
          <div className="text-sm mb-3">Sign in to play online — your trophies, coins and friend list need an account.</div>
          <button onClick={onShowAuth} className="btn-primary" style={{ width: '100%' }}>Sign in / Sign up</button>
        </div>
      ) : (
        <>
          <div className="panel p-5 mb-4">
            <div className="text-[10px] gold uppercase tracking-widest mb-2">Host a game</div>
            <button className="btn-primary" style={{ width: '100%' }} disabled>
              🆕 Create room
              <div style={{ fontSize: 10, fontWeight: 500, opacity: .8, marginTop: 2 }}>coming next session — see MULTIPLAYER.md</div>
            </button>
          </div>
          <div className="panel p-5 mb-4">
            <div className="text-[10px] gold uppercase tracking-widest mb-2">Join a game</div>
            <input className="input-field mb-3" placeholder="enter 4-letter code"
                   value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))} maxLength={4} />
            <button className="btn-primary" style={{ width: '100%' }} disabled>
              Join room {code && `· ${code}`}
            </button>
          </div>
        </>
      )}

      <div className="muted text-xs text-center italic">
        Real-time multiplayer is fully scaffolded — wiring it up takes one session
        once Supabase is connected. See <code>MULTIPLAYER.md</code>.
      </div>
    </div>
  );
}

// ============================================================
// RulesModal
// ============================================================
function RulesModal({ onClose }) {
  return (
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,.78)', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} className="panel p-6 max-w-md w-full" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="display gold text-2xl font-bold">Rules</div>
          <button onClick={onClose} className="text-3xl leading-none muted">×</button>
        </div>
        <div className="text-sm space-y-3">
          <div><strong className="gold">Setup —</strong> 4 players, 13 cards each. Ace high, 2 low.</div>
          <div><strong className="gold">Start —</strong> The A♠ holder leads first and must play the A♠ to open.</div>
          <div><strong className="gold">Following —</strong> Each player must play the led suit if they have it. Highest card of led suit is the senior.</div>
          <div><strong className="gold">Thulla 🎯 —</strong> If you can't follow, you SLAM down any other suit. The senior picks up every card on the table and starts the next round.</div>
          <div><strong className="gold">Flush —</strong> If everyone follows suit, cards are discarded. Senior leads next.</div>
          <div><strong className="gold">Request cards —</strong> Stuck in a thulla loop? Demand the other player's hand. They can <em className="gold">accept</em> (they win, you absorb their cards) or <em className="gold">refuse</em> (you keep playing).</div>
          <div><strong className="gold">Winning —</strong> Run out of cards = you've won. Last player with cards wears the title: THULLA.</div>
        </div>
      </div>
    </div>
  );
}
