// ============================================================
// THULLA — Bot AI
// 3 difficulties × 6 personality archetypes
// ============================================================

const RV = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

export const DIFFICULTIES = {
  easy:   { id: 'easy',   name: 'Easy',   thinkMs: [300, 700],   noise: 0.55, blurb: 'Forgiving · plays mostly random' },
  medium: { id: 'medium', name: 'Medium', thinkMs: [600, 1200],  noise: 0.18, blurb: 'Solid · follows real strategy' },
  hard:   { id: 'hard',   name: 'Hard',   thinkMs: [900, 1600],  noise: 0.05, blurb: 'Brutal · counts cards, plays mean' },
};

export const PERSONALITIES = {
  aggressive:  { id: 'aggressive',  name: 'Aggressive',  avatar: '🦁', highBias:  0.30, thullaBias:  0.15, randomness: 0.05, acceptRequest: 0.55, blurb: 'Plays high. Goes for blood.' },
  defensive:   { id: 'defensive',   name: 'Defensive',   avatar: '🛡️', highBias: -0.30, thullaBias: -0.15, randomness: 0.05, acceptRequest: 0.92, blurb: 'Hoards. Survives. Hates risk.' },
  chaotic:     { id: 'chaotic',     name: 'Chaotic',     avatar: '🃏', highBias:  0.05, thullaBias:  0.10, randomness: 0.45, acceptRequest: 0.50, blurb: 'You will not predict this one.' },
  calculating: { id: 'calculating', name: 'Calculating', avatar: '🧠', highBias:  0.00, thullaBias:  0.00, randomness: 0.00, acceptRequest: 0.85, blurb: 'Cold. Optimal. No drama.' },
  bluffer:     { id: 'bluffer',     name: 'Bluffer',     avatar: '🥷', highBias:  0.10, thullaBias:  0.25, randomness: 0.20, acceptRequest: 0.35, blurb: 'Throws nonsense. Sometimes wins.' },
  loyal:       { id: 'loyal',       name: 'Loyal',       avatar: '🐉', highBias: -0.15, thullaBias: -0.20, randomness: 0.05, acceptRequest: 0.95, blurb: 'Sporting. Plays clean.' },
};

const NAME_POOL = {
  aggressive:  ['Sheru', 'Tiger', 'Hunter', 'Razor', 'Blaze', 'Champ'],
  defensive:   ['Bablu', 'Wall',  'Sentinel', 'Iron', 'Anchor', 'Boss'],
  chaotic:     ['Pagal', 'Joker', 'Wildcard', 'Phantom', 'Tornado', 'Spark'],
  calculating: ['Babu',  'Brain', 'Don',     'Cipher', 'Vector', 'Sage'],
  bluffer:     ['Chappa','Mystery','Trickster','Smoke', 'Mirage', 'Slim'],
  loyal:       ['Saathi','Buddy', 'Yaar',    'Falcon', 'Honor',  'Shield'],
};

// Generate a roster of bots for a single match
export function generateBots(count, difficulty = 'medium') {
  const archetypes = Object.keys(PERSONALITIES);
  // shuffle archetypes so order varies
  const shuffled = [...archetypes].sort(() => Math.random() - 0.5);
  const used = new Set();
  const bots = [];
  for (let i = 0; i < count; i++) {
    const arch = shuffled[i % shuffled.length];
    const pool = NAME_POOL[arch].filter(n => !used.has(n));
    const name = pool[Math.floor(Math.random() * pool.length)] || `Bot ${i + 1}`;
    used.add(name);
    bots.push({
      name,
      personality: arch,
      difficulty,
      avatar: PERSONALITIES[arch].avatar,
      isBot: true,
    });
  }
  return bots;
}

// Realistic "thinking" delay before bot plays
export function botThinkDelay(difficulty) {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const [lo, hi] = d.thinkMs;
  return lo + Math.random() * (hi - lo);
}

// ------------------------------------------------------------
// chooseBotPlay — picks which card index in `hand` the bot plays
// ------------------------------------------------------------
// Args (object):
//   hand           — bot's current hand (array of cards)
//   trick          — current trick on the table [{player, card, isThulla}]
//   ledSuit        — string suit symbol or null
//   firstRound     — boolean: opening of the game (must play A♠)
//   validIndices   — Set<number> of legal indices in hand
//   difficulty     — 'easy' | 'medium' | 'hard'
//   personality    — id from PERSONALITIES
//   playedCards    — flat array of cards already shown this round (for hard mode card-counting)
//   activeOpponentsCardCounts — array of remaining card counts per active player (for hard mode)
export function chooseBotPlay(args) {
  const {
    hand, trick, ledSuit, firstRound, validIndices,
    difficulty = 'medium', personality = 'calculating',
    playedCards = [],
  } = args;

  const validArr = [...validIndices];
  if (validArr.length === 0) return 0;            // shouldn't happen
  if (validArr.length === 1) return validArr[0];   // forced

  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const pers = PERSONALITIES[personality] || PERSONALITIES.calculating;

  // Random override: easy bots fire often, others rarely
  const randomChance = diff.noise + (pers.randomness || 0) * (1 - diff.noise);
  if (Math.random() < randomChance) {
    return validArr[Math.floor(Math.random() * validArr.length)];
  }

  const isLead = trick.length === 0;
  const highBias = pers.highBias || 0;
  const thullaBias = pers.thullaBias || 0;

  // ----- LEADING ----------------------------------------------
  if (isLead) {
    // First-round forced A♠ is already enforced via validIndices.
    if (firstRound) return validArr[0];

    // Score each candidate to lead
    const scores = validArr.map(idx => {
      const card = hand[idx];
      const sameSuit = hand.filter(c => c.suit === card.suit).length;

      let score = 0;
      score += sameSuit * 0.55;                          // long suits = good leads
      score += (15 - RV[card.rank]) * 0.18;              // low cards safer to lead
      score += highBias * (RV[card.rank] - 8) * 0.25;    // aggression = lead higher

      // Avoid leading a high card unless we have several below it (control)
      if (RV[card.rank] >= 12 && sameSuit < 3) score -= 0.6;

      // Avoid leading high spades (everyone wants to dump spades)
      if (card.suit === '♠' && RV[card.rank] >= 11) score -= 0.5;

      // Hard mode: lead suits opponents are likely void in (more thulla potential)
      if (difficulty === 'hard') {
        const playedInSuit = playedCards.filter(c => c.suit === card.suit).length;
        if (playedInSuit >= 6) score += 0.4;             // suit thinning out
      }

      // Slight noise to break ties
      score += Math.random() * 0.12;
      return { idx, score };
    });
    scores.sort((a, b) => b.score - a.score);
    return scores[0].idx;
  }

  // ----- FOLLOWING --------------------------------------------
  const hasLedSuit = hand.some(c => c.suit === ledSuit);

  if (hasLedSuit) {
    // We must follow led suit (validIndices reflects that).
    const myLed = validArr
      .map(i => ({ idx: i, card: hand[i] }))
      .filter(o => o.card.suit === ledSuit)
      .sort((a, b) => RV[a.card.rank] - RV[b.card.rank]);

    if (myLed.length === 0) return validArr[0];          // shouldn't happen

    // Highest led-suit card on table so far
    const tableMax = trick
      .filter(t => t.card.suit === ledSuit)
      .reduce((m, t) => Math.max(m, RV[t.card.rank]), 0);

    // How many active opponents are still to play after us in this trick?
    // We don't know exactly without state, but trick.length tells us how many played.
    // remaining = activeCount - trick.length - 1 (us)
    // We'll approximate: if 2+ players still after us, risk of thulla is real.
    const playersAfterUs = Math.max(0, 4 - trick.length - 1);

    // SAFE play (won't make us senior) = below tableMax
    const safe = myLed.filter(o => RV[o.card.rank] < tableMax);
    const dangerous = myLed.filter(o => RV[o.card.rank] >= tableMax);

    // Defensive logic: if there's risk of thulla after us AND we have safe cards, play safe.
    const thullaRisk = playersAfterUs * 0.25 + (1 - hand.length / 13) * 0.2;
    const wantSafe = (thullaRisk - highBias * 0.3 - thullaBias * 0.4) > 0.2;

    if (wantSafe && safe.length > 0) {
      // Play LOWEST safe card — dump weak cards and stay non-senior
      return safe[0].idx;
    }

    // Otherwise: take control if we can.
    if (dangerous.length > 0 && playersAfterUs <= 1) {
      // Late in trick, low risk of thulla after us — play HIGHEST to win
      return dangerous[dangerous.length - 1].idx;
    }

    // Default: lowest of led suit (safest)
    return myLed[0].idx;
  }

  // ----- THULLA (don't have led suit, must dump) --------------
  // Goal: dump our highest non-Ace, non-Spade card.
  // Variations for personality.
  const candidates = validArr.map(i => ({ idx: i, card: hand[i] }));
  const scored = candidates.map(o => {
    let s = RV[o.card.rank];                             // higher rank = better to dump
    if (o.card.suit === '♠') s -= 4.5;                   // hold spades (often valuable)
    if (o.card.rank === 'A')  s -= 3.5;                  // hold aces (great leads)
    if (o.card.rank === 'K')  s -= 1.0;                  // kings useful
    s += thullaBias * 6;                                 // bluffer dumps higher; loyal lower
    s += highBias  * 3;
    s += Math.random() * 0.4;                            // tiny noise
    return { ...o, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].idx;
}

// ------------------------------------------------------------
// Bot decision when targeted by a "request cards" demand
// ------------------------------------------------------------
// Returns true = ACCEPT (target wins, requester absorbs cards)
// Returns false = REFUSE (requester keeps playing)
export function chooseBotRequestResponse(args) {
  const { personality = 'calculating', myHandSize, requesterHandSize } = args;
  const pers = PERSONALITIES[personality] || PERSONALITIES.calculating;
  let acceptProb = pers.acceptRequest ?? 0.85;

  // If requester is sitting on a giant pile, accepting feels merciful — bump up
  if (requesterHandSize > 25) acceptProb += 0.05;

  // If we have very few cards, we're about to win anyway by playing — slight refuse bias
  if (myHandSize <= 3) acceptProb -= 0.15;

  // Clamp
  acceptProb = Math.max(0.05, Math.min(0.98, acceptProb));
  return Math.random() < acceptProb;
}

// ------------------------------------------------------------
// Bot decision: should I initiate a request right now?
// (Called when canRequest = true on bot's turn before they play)
// ------------------------------------------------------------
export function shouldBotRequest(args) {
  const { personality = 'calculating', myHandSize, targetHandSize } = args;
  const pers = PERSONALITIES[personality] || PERSONALITIES.calculating;
  // Requesting transfers target's cards into MY hand. So I lose cards if my hand grows.
  // Only request if target has few cards (small absorption) AND I'm in a tough spot.
  if (myHandSize < 18) return false;                     // not in trouble
  if (targetHandSize > 8) return false;                  // too costly to absorb
  // Then a personality-driven flip
  const baseProb = 0.4 - (pers.highBias || 0) * 0.4 + (pers.thullaBias || 0) * 0.1;
  return Math.random() < baseProb;
}
