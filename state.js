const STORAGE_KEY = "silid_kepiting_state_v2";

function defaultNames(n = 6) {
  return Array.from({ length: n }, (_, i) => `Pemain ${i + 1}`);
}

function makePlayer(id, name, score = 0, stats) {
  return {
    id,
    name,
    alive: true,
    score,
    stats: stats || {
      asWarga: 0,
      asSilid: 0,
      asKepiting: 0,
      eliminated: 0,
      bonusHits: 0
    }
  };
}

export const state = {
  phase: "setup",
  theme: "dark",
  warning: "",
  settings: {
    playersCount: 6,
    playerNames: defaultNames(6),
    silidCount: 1,
    kepitingCount: 1,
    selectedPacks: ["Makanan", "Tempat", "Benda", "Hewan", "Random"],
    difficulty: 0,
    antiRepeatN: 50,
    discussionMinutes: 3,
    votingMode: "secret",
    gameMode: "elimination",
    fixedRounds: 3,
    spectatorMode: false,
    openVotingLiveCounter: true
  },
  round: {
    number: 0,
    fixedProgress: 0,
    suddenDeath: false,
    activePlayerIds: [],
    pair: null,
    revealIndex: 0,
    revealOpen: false,
    lockedAssignments: false,
    assignments: {},
    discussion: {
      totalSec: 180,
      remainingSec: 180,
      running: false,
      timerId: null
    },
    voting: {
      revoteDepth: 0,
      tieCandidates: null,
      cursor: 0,
      voterOrder: [],
      votesByVoter: {},
      openTally: {}
    },
    eliminatedPlayerId: null,
    roundWinner: null
  },
  players: defaultNames(6).map((name, idx) => makePlayer(idx + 1, name)),
  usedPairs: [],
  history: [],
  customPairs: [],
  gameOver: null
};

export function hydrateState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved) return;

    state.theme = saved.theme || state.theme;
    state.settings = { ...state.settings, ...(saved.settings || {}) };
    state.usedPairs = Array.isArray(saved.usedPairs) ? saved.usedPairs : [];
    state.history = Array.isArray(saved.history) ? saved.history : [];
    state.customPairs = Array.isArray(saved.customPairs) ? saved.customPairs : [];

    const count = Math.min(12, Math.max(3, Number(state.settings.playersCount) || 6));
    state.settings.playersCount = count;
    if (!Array.isArray(state.settings.playerNames) || state.settings.playerNames.length !== count) {
      state.settings.playerNames = defaultNames(count);
    }

    const savedPlayers = Array.isArray(saved.players) ? saved.players : [];
    state.players = Array.from({ length: count }, (_, idx) => {
      const base = savedPlayers[idx];
      const name = state.settings.playerNames[idx] || `Pemain ${idx + 1}`;
      if (!base) return makePlayer(idx + 1, name);
      return makePlayer(idx + 1, name, Number(base.score) || 0, base.stats);
    });
  } catch {
    // ignore corrupted cache
  }
}

export function persistState() {
  const payload = {
    theme: state.theme,
    settings: state.settings,
    usedPairs: state.usedPairs.slice(0, 1200),
    history: state.history.slice(0, 100),
    customPairs: state.customPairs,
    players: state.players.map((p) => ({ id: p.id, name: p.name, score: p.score, stats: p.stats }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resizePlayers(count) {
  const nextCount = Math.min(12, Math.max(3, Number(count) || 6));
  state.settings.playersCount = nextCount;

  const oldPlayers = state.players;
  const oldNames = state.settings.playerNames;
  const names = Array.from({ length: nextCount }, (_, idx) => oldNames[idx] || `Pemain ${idx + 1}`);

  state.settings.playerNames = names;
  state.players = names.map((name, idx) => {
    const prev = oldPlayers[idx];
    return makePlayer(idx + 1, name, prev?.score || 0, prev?.stats);
  });
}

export function resetScores() {
  state.players.forEach((p) => {
    p.score = 0;
    p.stats = { asWarga: 0, asSilid: 0, asKepiting: 0, eliminated: 0, bonusHits: 0 };
    p.alive = true;
  });
  persistState();
}

export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hardResetRoundState() {
  if (state.round.discussion.timerId) clearInterval(state.round.discussion.timerId);
  state.round = {
    number: 0,
    fixedProgress: 0,
    suddenDeath: false,
    activePlayerIds: [],
    pair: null,
    revealIndex: 0,
    revealOpen: false,
    lockedAssignments: false,
    assignments: {},
    discussion: {
      totalSec: state.settings.discussionMinutes * 60,
      remainingSec: state.settings.discussionMinutes * 60,
      running: false,
      timerId: null
    },
    voting: {
      revoteDepth: 0,
      tieCandidates: null,
      cursor: 0,
      voterOrder: [],
      votesByVoter: {},
      openTally: {}
    },
    eliminatedPlayerId: null,
    roundWinner: null
  };
}
