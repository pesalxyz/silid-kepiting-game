function normalizeWord(s) {
  return (s || "").trim().toLowerCase();
}

function pairKey(main, undercover) {
  return `${normalizeWord(main)}__${normalizeWord(undercover)}`;
}

export function secureRandomInt(max) {
  if (max <= 0) return 0;
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function secureShuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getMaxSilid(playersCount) {
  if (playersCount <= 4) return 1;
  if (playersCount <= 8) return 2;
  return 3;
}

export function sanitizeNames(list, fallbackCount) {
  const arr = Array.from({ length: fallbackCount }, (_, i) => (list?.[i] || "").trim() || `Pemain ${i + 1}`);
  return arr;
}

export function collectWordPool(wordBank, customPairs, settings) {
  const selected = settings.selectedPacks || [];
  let pool = wordBank.filter((w) => selected.includes(w.pack));
  if (Number(settings.difficulty) > 0) {
    pool = pool.filter((w) => w.difficulty === Number(settings.difficulty));
  }
  if (customPairs?.length) {
    const customFiltered = customPairs.filter((w) => {
      if (Number(settings.difficulty) > 0) return w.difficulty === Number(settings.difficulty);
      return true;
    });
    pool = pool.concat(customFiltered);
  }
  return pool;
}

export function selectRoundPair(state, wordPool) {
  if (!wordPool.length) return { pair: null, reused: false, warning: "Word bank kosong untuk filter ini." };

  const recent = new Set(state.usedPairs.slice(0, state.settings.antiRepeatN).map((x) => x.key));
  const fresh = wordPool.filter((w) => !recent.has(pairKey(w.main, w.undercover)));
  const reused = fresh.length === 0;
  const source = fresh.length ? fresh : wordPool;
  const pick = source[secureRandomInt(source.length)];

  state.usedPairs.unshift({
    key: pairKey(pick.main, pick.undercover),
    pack: pick.pack,
    main: pick.main,
    undercover: pick.undercover,
    ts: Date.now(),
    round: state.round.number
  });

  return {
    pair: pick,
    reused,
    warning: reused ? "Pasangan kata fresh habis, sistem memakai ulang pair lama." : ""
  };
}

export function buildRolePool(activeCount, silidCount, kepitingCount) {
  const roles = [];
  for (let i = 0; i < silidCount; i += 1) roles.push("Impostor");
  for (let i = 0; i < kepitingCount; i += 1) roles.push("Kepiting");
  while (roles.length < activeCount) roles.push("Warga");
  return secureShuffle(roles);
}

export function startRoundAssignments(state, pair) {
  const activePlayers = state.settings.gameMode === "fixed"
    ? state.players
    : state.players.filter((p) => p.alive);

  if (state.settings.gameMode === "fixed") {
    state.players.forEach((p) => { p.alive = true; });
  }

  const roles = buildRolePool(activePlayers.length, state.settings.silidCount, state.settings.kepitingCount);
  const order = secureShuffle(activePlayers.map((p) => p.id));

  state.round.activePlayerIds = activePlayers.map((p) => p.id);
  state.round.assignments = {};
  activePlayers.forEach((p, idx) => {
    const role = roles[idx];
    const word = role === "Warga" ? pair.main : role === "Impostor" ? pair.undercover : "KAMU KEPITING 🦀 (Tidak ada kata)";
    state.round.assignments[p.id] = { role, word };
    if (role === "Warga") p.stats.asWarga += 1;
    if (role === "Impostor") p.stats.asImpostor += 1;
    if (role === "Kepiting") p.stats.asKepiting += 1;
  });

  state.round.revealIndex = 0;
  state.round.revealOpen = false;
  state.round.lockedAssignments = false;
  state.round.voting = {
    revoteDepth: 0,
    tieCandidates: null,
    cursor: 0,
    voterOrder: order,
    votesByVoter: {},
    openTally: {}
  };
  state.round.eliminatedPlayerId = null;
  state.round.roundWinner = null;
  state.round.pair = pair;
  state.round.discussion.totalSec = state.settings.discussionMinutes * 60;
  state.round.discussion.remainingSec = state.settings.discussionMinutes * 60;
  state.round.discussion.running = false;
}

export function voteCandidates(state) {
  const aliveIds = state.players.filter((p) => p.alive).map((p) => p.id);
  if (!state.round.voting.tieCandidates) return aliveIds;
  return aliveIds.filter((id) => state.round.voting.tieCandidates.includes(id));
}

export function submitVote(state, voterId, targetId) {
  if (!state.players.find((p) => p.id === voterId)?.alive) return false;
  if (state.round.voting.votesByVoter[voterId]) return false;
  state.round.voting.votesByVoter[voterId] = targetId;
  state.round.voting.openTally[targetId] = (state.round.voting.openTally[targetId] || 0) + 1;
  return true;
}

export function tallyVotes(votesByVoter) {
  const tally = {};
  Object.values(votesByVoter).forEach((target) => {
    tally[target] = (tally[target] || 0) + 1;
  });
  const ordered = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!ordered.length) return { top: [], tally, max: 0 };
  const max = ordered[0][1];
  const top = ordered.filter(([, c]) => c === max).map(([id]) => Number(id));
  return { top, tally, max };
}

export function eliminatePlayer(state, playerId) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  player.alive = false;
  player.stats.eliminated += 1;
  state.round.eliminatedPlayerId = playerId;
}

export function countAliveByRole(state) {
  const aliveIds = state.players.filter((p) => p.alive).map((p) => p.id);
  let warga = 0;
  let impostor = 0;
  let kepiting = 0;
  aliveIds.forEach((id) => {
    const role = state.round.assignments[id]?.role;
    if (role === "Warga") warga += 1;
    if (role === "Impostor") impostor += 1;
    if (role === "Kepiting") kepiting += 1;
  });
  return { warga, impostor, kepiting, aliveCount: aliveIds.length };
}

export function evaluateRoundWinnerElimination(state, kepitingGuess = "") {
  const counts = countAliveByRole(state);
  const eliminatedRole = state.round.assignments[state.round.eliminatedPlayerId]?.role;

  if (eliminatedRole === "Kepiting") {
    if (normalizeWord(kepitingGuess) === normalizeWord(state.round.pair.main)) {
      return { team: "Kepiting", reason: "Kepiting tereliminasi tapi tebak kata utama dengan benar." };
    }
  }

  if (counts.kepiting > 0 && counts.aliveCount === 2) {
    return { team: "Kepiting", reason: "Kepiting bertahan hingga final 2." };
  }

  if (counts.impostor === 0) {
    return { team: "Warga", reason: "Semua Impostor tereliminasi." };
  }

  if (counts.impostor >= counts.warga) {
    return { team: "Impostor", reason: "Jumlah Impostor >= Warga." };
  }

  return null;
}

export function evaluateRoundWinnerFixed(state, kepitingGuess = "") {
  const eliminatedRole = state.round.assignments[state.round.eliminatedPlayerId]?.role;
  const alive = countAliveByRole(state);
  if (eliminatedRole === "Kepiting" && normalizeWord(kepitingGuess) === normalizeWord(state.round.pair.main)) {
    return { team: "Kepiting", reason: "Kepiting menebak kata dan menang ronde." };
  }
  if (alive.kepiting > 0 && alive.aliveCount === 2) {
    return { team: "Kepiting", reason: "Kepiting bertahan sampai final 2 ronde." };
  }
  if (eliminatedRole === "Impostor" || alive.impostor === 0) {
    return { team: "Warga", reason: "Impostor tersingkir di ronde ini." };
  }
  return { team: "Impostor", reason: "Impostor bertahan ronde ini." };
}

export function applyScoring(state, roundWinner) {
  const aliveById = new Set(state.players.filter((p) => p.alive).map((p) => p.id));
  if (roundWinner.team === "Kepiting") {
    state.players.forEach((p) => {
      const role = state.round.assignments[p.id]?.role;
      if (role === "Kepiting") p.score += 5;
    });
    return;
  }

  if (roundWinner.team === "Warga") {
    state.players.forEach((p) => {
      const role = state.round.assignments[p.id]?.role;
      if (role !== "Warga") return;
      p.score += aliveById.has(p.id) ? 2 : 1;
    });
  }

  if (roundWinner.team === "Impostor") {
    state.players.forEach((p) => {
      const role = state.round.assignments[p.id]?.role;
      if (role !== "Impostor") return;
      p.score += aliveById.has(p.id) ? 3 : 1;
    });
  }

  const eliminatedId = state.round.eliminatedPlayerId;
  const eliminatedRole = state.round.assignments[eliminatedId]?.role;
  if (eliminatedRole === "Impostor") {
    Object.entries(state.round.voting.votesByVoter).forEach(([voterId, targetId]) => {
      if (Number(targetId) === Number(eliminatedId)) {
        const p = state.players.find((x) => x.id === Number(voterId));
        if (p) {
          p.score += 1;
          p.stats.bonusHits += 1;
        }
      }
    });
  }
}

export function sortedLeaderboard(players) {
  return [...players].sort((a, b) => b.score - a.score || a.id - b.id);
}

export function detectScoreTie(players) {
  const board = sortedLeaderboard(players);
  if (!board.length) return false;
  if (board.length === 1) return false;
  return board[0].score === board[1].score;
}
