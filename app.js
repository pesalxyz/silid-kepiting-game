import { PACKS, WORD_BANK } from "./wordbank.js";
import {
  state,
  hydrateState,
  persistState,
  resizePlayers,
  resetScores,
  clearAllData,
  hardResetRoundState
} from "./state.js";
import {
  getMaxSilid,
  sanitizeNames,
  collectWordPool,
  selectRoundPair,
  startRoundAssignments,
  secureShuffle,
  submitVote,
  voteCandidates,
  tallyVotes,
  eliminatePlayer,
  evaluateRoundWinnerElimination,
  evaluateRoundWinnerFixed,
  applyScoring,
  sortedLeaderboard,
  detectScoreTie
} from "./logic.js";
import { renderApp } from "./ui.js";

const app = document.getElementById("app");
const howToDialog = document.getElementById("howToDialog");
const wordPeekDialog = document.getElementById("wordPeekDialog");
const wordPeekBody = document.getElementById("wordPeekBody");
const historyDialog = document.getElementById("historyDialog");
const historyBody = document.getElementById("historyBody");

function normalize(s) {
  return (s || "").trim().toLowerCase();
}

function parseCustomInput(text) {
  const lines = text.split("\n").map((x) => x.trim()).filter(Boolean);
  const pairs = [];
  const singles = [];
  const delimiters = ["|", ",", ";", "=>", " - "];

  lines.forEach((line) => {
    const d = delimiters.find((x) => line.includes(x));
    if (d) {
      const [a, b] = line.split(d).map((x) => x.trim());
      if (a && b) {
        pairs.push({ pack: "Random", main: a, undercover: b, difficulty: 2, tags: ["custom"] });
      }
    } else {
      singles.push(line);
    }
  });

  for (let i = 0; i < singles.length - 1; i += 2) {
    pairs.push({ pack: "Random", main: singles[i], undercover: singles[i + 1], difficulty: 2, tags: ["custom", "single"] });
  }

  return pairs;
}

function setTheme() {
  document.body.dataset.theme = state.theme;
}

function vibrate(ms = 35) {
  if (!state.settings.spectatorMode && navigator.vibrate) navigator.vibrate(ms);
}

function updateWarning(msg = "") {
  state.warning = msg;
}

function render() {
  if (state.settings.gameMode === "elimination" && state.round.lockedAssignments && state.phase === "reveal") {
    state.phase = "discussion";
  }
  state._voteCandidates = voteCandidates(state);
  app.innerHTML = renderApp(state, PACKS, WORD_BANK.length + state.customPairs.length);
  setTheme();
  bindCommonActions();
  bindPhaseActions();
}

function lockPortraitSafe() {
  if (screen.orientation?.lock) {
    screen.orientation.lock("portrait").catch(() => {});
  }
}


function buildWordPeekTable() {
  const rows = state.players.map((p) => {
    const a = state.round.assignments[p.id] || {};
    const status = p.alive ? "Aktif" : "Eliminasi";
    const word = a.role === "Kepiting" ? "(Tidak ada kata)" : (a.word || "-");
    return `<tr><td>${p.name}</td><td>${a.role || "-"}</td><td>${word}</td><td>${status}</td></tr>`;
  }).join("");

  const html = `
    <table class="table">
      <thead><tr><th>Nama</th><th>Peran</th><th>Kata</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  return html;
}

function buildHistoryTable() {
  const list = state.history.slice(0, 20);
  if (!list.length) return `<p class="hint">Belum ada history.</p>`;
  return list.map((h) => `<div class="history-item"><span>${h.main} vs ${h.undercover}</span><span>${h.pack}</span></div>`).join("");
}

function antiBackLeakGuard() {
  history.pushState({ guard: true }, "", location.href);
  window.addEventListener("popstate", () => {
    if (["reveal", "discussion", "voting", "elimination"].includes(state.phase)) {
      history.pushState({ guard: true }, "", location.href);
      alert("Navigasi mundur dinonaktifkan selama ronde aktif.");
    }
  });
}

function bindCommonActions() {
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) themeBtn.onclick = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    persistState();
    render();
  };

  const howToBtn = document.getElementById("howToBtn");
  if (howToBtn) howToBtn.onclick = () => howToDialog.showModal();

  const viewWordsBtn = document.getElementById("viewWordsBtn");
  if (viewWordsBtn) viewWordsBtn.onclick = () => {
    if (!state.round.assignments || !Object.keys(state.round.assignments).length) {
      alert("Data kata belum tersedia. Mulai permainan dulu agar peran dibagikan.");
      return;
    }
    wordPeekBody.innerHTML = buildWordPeekTable();
    wordPeekDialog.showModal();
  };

  const viewHistoryBtn = document.getElementById("viewHistoryBtn");
  if (viewHistoryBtn) viewHistoryBtn.onclick = () => {
    historyBody.innerHTML = buildHistoryTable();
    historyDialog.showModal();
  };

  const clearHistoryDialogBtn = document.getElementById("clearHistoryDialogBtn");
  if (clearHistoryDialogBtn) clearHistoryDialogBtn.onclick = () => {
    if (!confirm("Hapus history pasangan kata?")) return;
    state.history = [];
    state.usedPairs = [];
    persistState();
    historyBody.innerHTML = buildHistoryTable();
    render();
  };

  const clearDataBtn = document.getElementById("clearDataBtn");
  if (clearDataBtn) clearDataBtn.onclick = () => {
    if (!confirm("Hapus semua data tersimpan (setting, skor, history, custom)?")) return;
    clearAllData();
    location.reload();
  };

  const quickResetBtn = document.getElementById("quickResetBtn");
  if (quickResetBtn) quickResetBtn.onclick = () => {
    if (!confirm("Reset ronde aktif dan kembali ke setup?")) return;
    hardResetRoundState();
    state.phase = "setup";
    state.gameOver = null;
    updateWarning("");
    persistState();
    render();
  };

}

function bindSetupActions() {
  const playersCount = document.getElementById("playersCount");
  const silidCount = document.getElementById("silidCount");
  const kepitingCount = document.getElementById("kepitingCount");
  const discussionMinutes = document.getElementById("discussionMinutes");
  const antiRepeatN = document.getElementById("antiRepeatN");
  const difficulty = document.getElementById("difficulty");
  const votingMode = document.getElementById("votingMode");
  const gameMode = document.getElementById("gameMode");
  const fixedRounds = document.getElementById("fixedRounds");
  const spectatorMode = document.getElementById("spectatorMode");

  playersCount.onchange = () => {
    resizePlayers(Number(playersCount.value));
    const maxSilid = getMaxSilid(state.settings.playersCount);
    if (state.settings.silidCount > maxSilid) state.settings.silidCount = maxSilid;
    const kepMax = Math.max(0, Math.min(1, state.settings.playersCount - state.settings.silidCount - 1));
    if (state.settings.kepitingCount > kepMax) state.settings.kepitingCount = kepMax;
    persistState();
    render();
  };

  silidCount.onchange = () => {
    const maxSilid = getMaxSilid(state.settings.playersCount);
    state.settings.silidCount = Math.max(1, Math.min(maxSilid, Number(silidCount.value) || 1));
    const kepMax = Math.max(0, Math.min(1, state.settings.playersCount - state.settings.silidCount - 1));
    if (state.settings.kepitingCount > kepMax) state.settings.kepitingCount = kepMax;
    persistState();
    render();
  };

  kepitingCount.onchange = () => {
    const kepMax = Math.max(0, Math.min(1, state.settings.playersCount - state.settings.silidCount - 1));
    state.settings.kepitingCount = Math.max(0, Math.min(kepMax, Number(kepitingCount.value) || 0));
    persistState();
    render();
  };

  discussionMinutes.onchange = () => {
    state.settings.discussionMinutes = Math.max(1, Math.min(10, Number(discussionMinutes.value) || 3));
    persistState();
  };

  antiRepeatN.onchange = () => {
    state.settings.antiRepeatN = Math.max(0, Math.min(300, Number(antiRepeatN.value) || 50));
    persistState();
  };

  difficulty.onchange = () => {
    state.settings.difficulty = Number(difficulty.value);
    persistState();
  };

  votingMode.onchange = () => {
    state.settings.votingMode = votingMode.value;
    persistState();
  };

  gameMode.onchange = () => {
    state.settings.gameMode = gameMode.value;
    persistState();
  };

  fixedRounds.onchange = () => {
    state.settings.fixedRounds = Number(fixedRounds.value);
    persistState();
  };

  spectatorMode.onchange = () => {
    state.settings.spectatorMode = spectatorMode.value === "on";
    persistState();
  };

  app.querySelectorAll("[data-player-name]").forEach((el) => {
    el.addEventListener("change", () => {
      const idx = Number(el.dataset.playerName);
      state.settings.playerNames[idx] = el.value.trim() || `Pemain ${idx + 1}`;
      state.players[idx].name = state.settings.playerNames[idx];
      persistState();
    });
  });

  app.querySelectorAll("[data-pack]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const selected = Array.from(app.querySelectorAll("[data-pack]:checked")).map((x) => x.value);
      state.settings.selectedPacks = selected;
      persistState();
    });
  });

  const saveCustomBtn = document.getElementById("saveCustomBtn");
  if (saveCustomBtn) saveCustomBtn.onclick = () => {
    const customInput = document.getElementById("customInput");
    const pairs = parseCustomInput(customInput.value);
    if (!pairs.length) {
      alert("Custom words tidak valid.");
      return;
    }
    state.customPairs = state.customPairs.concat(pairs);
    customInput.value = "";
    persistState();
    render();
  };

  const clearCustomBtn = document.getElementById("clearCustomBtn");
  if (clearCustomBtn) clearCustomBtn.onclick = () => {
    if (!confirm("Hapus semua custom words?")) return;
    state.customPairs = [];
    persistState();
    render();
  };

  const startMatchBtn = document.getElementById("startMatchBtn");
  if (startMatchBtn) startMatchBtn.onclick = () => {
    state.settings.playerNames = sanitizeNames(state.settings.playerNames, state.settings.playersCount);
    resizePlayers(state.settings.playersCount);
    state.players.forEach((p, idx) => { p.name = state.settings.playerNames[idx]; p.alive = true; });

    if (!state.settings.selectedPacks.length && !state.customPairs.length) {
      alert("Pilih minimal satu pack atau tambah custom words.");
      return;
    }
    if (state.settings.silidCount + state.settings.kepitingCount >= state.settings.playersCount) {
      alert("Silid + Kepiting harus lebih kecil dari jumlah pemain.");
      return;
    }

    state.gameOver = null;
    state.round.number = 0;
    state.round.fixedProgress = 0;
    state.round.suddenDeath = false;
    nextRound();
  };
}

function nextRound() {
  // Guard: in elimination mode, once a match has started, role+word must stay the same
  // and flow should continue from discussion/voting only.
  if (
    state.settings.gameMode === "elimination" &&
    state.round.lockedAssignments
  ) {
    continueEliminationCycle();
    return;
  }

  state.round.number += 1;
  if (state.settings.gameMode === "fixed") state.round.fixedProgress += 1;

  const pool = collectWordPool(WORD_BANK, state.customPairs, state.settings);
  const { pair, reused, warning } = selectRoundPair(state, pool);
  if (!pair) {
    alert("Tidak ada pair kata untuk filter ini.");
    state.phase = "setup";
    render();
    return;
  }

  startRoundAssignments(state, pair);
  state.history.unshift({ main: pair.main, undercover: pair.undercover, pack: pair.pack, ts: Date.now(), round: state.round.number });
  updateWarning(warning || (reused ? "Pair diulang karena stok fresh habis." : ""));
  state.phase = "reveal";
  persistState();
  render();
}

function bindRevealActions() {
  const revealBtn = document.getElementById("revealBtn");
  if (!revealBtn) return;

  let timer = null;
  const startHold = () => {
    timer = setTimeout(() => {
      state.round.revealOpen = true;
      vibrate(55);
      render();
    }, 500);
  };
  const endHold = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  revealBtn.addEventListener("mousedown", startHold);
  revealBtn.addEventListener("touchstart", startHold, { passive: true });
  revealBtn.addEventListener("mouseup", endHold);
  revealBtn.addEventListener("mouseleave", endHold);
  revealBtn.addEventListener("touchend", endHold);
  revealBtn.addEventListener("touchcancel", endHold);

  const hideNextBtn = document.getElementById("hideNextBtn");
  if (hideNextBtn) hideNextBtn.onclick = () => {
    state.round.revealOpen = false;
    state.round.revealIndex += 1;
    if (state.round.revealIndex >= state.round.activePlayerIds.length) {
      if (state.settings.gameMode === "elimination") state.round.lockedAssignments = true;
      state.phase = "discussion";
    }
    render();
  };
}

function startDiscussionTimer() {
  if (state.round.discussion.running) return;
  state.round.discussion.running = true;
  state.round.discussion.timerId = setInterval(() => {
    state.round.discussion.remainingSec -= 1;
    if (state.round.discussion.remainingSec <= 0) {
      state.round.discussion.remainingSec = 0;
      stopDiscussionTimer();
      vibrate(100);
      state.phase = "voting";
    }
    render();
  }, 1000);
}

function stopDiscussionTimer() {
  state.round.discussion.running = false;
  if (state.round.discussion.timerId) {
    clearInterval(state.round.discussion.timerId);
    state.round.discussion.timerId = null;
  }
}

function resetDiscussionTimer() {
  stopDiscussionTimer();
  state.round.discussion.totalSec = state.settings.discussionMinutes * 60;
  state.round.discussion.remainingSec = state.round.discussion.totalSec;
}

function resetVotingForAlivePlayers() {
  const aliveIds = state.players.filter((p) => p.alive).map((p) => p.id);
  state.round.voting = {
    revoteDepth: 0,
    tieCandidates: null,
    cursor: 0,
    voterOrder: secureShuffle(aliveIds),
    votesByVoter: {},
    openTally: {}
  };
}

function roleStatsCurrentGame() {
  const roles = Object.values(state.round.assignments || {});
  const totalWarga = roles.filter((x) => x.role === "Warga").length;
  const totalSilid = roles.filter((x) => x.role === "Silid").length;
  const totalKepiting = roles.filter((x) => x.role === "Kepiting").length;

  const aliveIds = new Set(state.players.filter((p) => p.alive).map((p) => p.id));
  let aliveWarga = 0;
  let aliveSilid = 0;
  let aliveKepiting = 0;
  Object.entries(state.round.assignments).forEach(([id, a]) => {
    if (!aliveIds.has(Number(id))) return;
    if (a.role === "Warga") aliveWarga += 1;
    if (a.role === "Silid") aliveSilid += 1;
    if (a.role === "Kepiting") aliveKepiting += 1;
  });

  return {
    totalWarga,
    totalSilid,
    totalKepiting,
    aliveWarga,
    aliveSilid,
    aliveKepiting,
    eliminatedWarga: totalWarga - aliveWarga,
    eliminatedSilid: totalSilid - aliveSilid
  };
}

function evaluateEliminationModeWinner() {
  const r = roleStatsCurrentGame();
  if (r.eliminatedSilid >= r.totalSilid) {
    return { team: "Warga", reason: "Semua Silid sudah tereliminasi." };
  }
  if (r.eliminatedWarga >= Math.max(1, r.totalWarga - 1)) {
    return { team: "Silid", reason: "Warga yang tereliminasi sudah mencapai batas, Silid menang." };
  }
  return null;
}

function applyFinalEliminationScores(winnerTeam) {
  const aliveIds = new Set(state.players.filter((p) => p.alive).map((p) => p.id));
  if (winnerTeam === "Kepiting") {
    state.players.forEach((p) => {
      const role = state.round.assignments[p.id]?.role;
      if (role === "Kepiting") p.score += 5;
    });
    return;
  }

  if (winnerTeam === "Warga") {
    state.players.forEach((p) => {
      const role = state.round.assignments[p.id]?.role;
      if (role !== "Warga") return;
      p.score += aliveIds.has(p.id) ? 2 : 1;
    });
  }

  if (winnerTeam === "Silid") {
    state.players.forEach((p) => {
      const role = state.round.assignments[p.id]?.role;
      if (role !== "Silid") return;
      p.score += aliveIds.has(p.id) ? 3 : 1;
    });
  }
}

function finalizeEliminationModeGame(gameOver) {
  applyFinalEliminationScores(gameOver.team);
  state.gameOver = gameOver;
  state.phase = "gameover";
  persistState();
  render();
}

function continueEliminationCycle() {
  resetDiscussionTimer();
  resetVotingForAlivePlayers();
  state.phase = "discussion";
  persistState();
  render();
}

function bindDiscussionActions() {
  const startBtn = document.getElementById("timerStartBtn");
  const pauseBtn = document.getElementById("timerPauseBtn");
  const resetBtn = document.getElementById("timerResetBtn");
  const toVotingBtn = document.getElementById("toVotingBtn");

  if (startBtn) startBtn.onclick = startDiscussionTimer;
  if (pauseBtn) pauseBtn.onclick = () => { stopDiscussionTimer(); render(); };
  if (resetBtn) resetBtn.onclick = () => { resetDiscussionTimer(); render(); };
  if (toVotingBtn) toVotingBtn.onclick = () => {
    stopDiscussionTimer();
    state.phase = "voting";
    render();
  };
}

function moveVotingCursorToNextAlive() {
  while (state.round.voting.cursor < state.round.voting.voterOrder.length) {
    const id = state.round.voting.voterOrder[state.round.voting.cursor];
    const p = state.players.find((x) => x.id === id);
    if (p?.alive && !state.round.voting.votesByVoter[id]) return;
    state.round.voting.cursor += 1;
  }
}

function finishVotingIfReady() {
  const aliveCount = state.players.filter((p) => p.alive).length;
  const votesCount = Object.keys(state.round.voting.votesByVoter).length;
  if (votesCount < aliveCount) return false;

  const result = tallyVotes(state.round.voting.votesByVoter);
  if (result.top.length > 1) {
    state.round.voting.revoteDepth += 1;
    state.round.voting.tieCandidates = result.top;
    state.round.voting.cursor = 0;
    state.round.voting.votesByVoter = {};
    state.round.voting.openTally = {};
    state.round.voting.voterOrder = secureShuffle(state.players.filter((p) => p.alive).map((p) => p.id));
    updateWarning(`Vote seri. Revote ke-${state.round.voting.revoteDepth} untuk kandidat seri.`);
    render();
    return true;
  }

  const eliminatedId = result.top[0];
  eliminatePlayer(state, eliminatedId);
  const eliminatedRole = state.round.assignments[eliminatedId]?.role;
  if (state.settings.gameMode === "elimination" && eliminatedRole === "Silid") {
    Object.entries(state.round.voting.votesByVoter).forEach(([voterId, targetId]) => {
      if (Number(targetId) !== Number(eliminatedId)) return;
      const voter = state.players.find((p) => p.id === Number(voterId));
      if (!voter) return;
      voter.score += 1;
      voter.stats.bonusHits += 1;
    });
  }
  state.phase = "elimination";
  updateWarning("");
  persistState();
  render();
  return true;
}

function bindVotingActions() {
  const buttons = app.querySelectorAll(".voteBtn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = Number(btn.dataset.target);
      moveVotingCursorToNextAlive();
      const voterId = state.round.voting.voterOrder[state.round.voting.cursor];
      if (!voterId) return;

      if (Number(voterId) === Number(targetId)) {
        alert("Tidak boleh vote diri sendiri.");
        return;
      }

      const ok = submitVote(state, voterId, targetId);
      if (!ok) {
        alert("Vote tidak valid / sudah vote.");
        return;
      }

      vibrate(20);
      state.round.voting.cursor += 1;
      moveVotingCursorToNextAlive();
      if (!finishVotingIfReady()) render();
    });
  });
}

function endRoundAndProceed(roundWinner) {
  state.round.roundWinner = roundWinner;
  applyScoring(state, roundWinner);

  const eliminated = state.round.eliminatedPlayerId;
  const eliminatedAssignment = state.round.assignments[eliminated];

  if (state.settings.gameMode === "fixed") {
    const targetRounds = state.round.suddenDeath ? Number.MAX_SAFE_INTEGER : state.settings.fixedRounds;
    if (state.round.fixedProgress >= targetRounds && !state.round.suddenDeath) {
      if (detectScoreTie(state.players)) {
        state.round.suddenDeath = true;
        updateWarning("Skor seri di puncak. Sudden death ronde tambahan dimulai.");
        nextRound();
        return;
      }
      state.gameOver = {
        team: sortedLeaderboard(state.players)[0]?.name || "-",
        reason: "Fixed rounds selesai. Pemain skor tertinggi menang."
      };
      state.phase = "gameover";
      persistState();
      render();
      return;
    }

    if (state.round.suddenDeath && !detectScoreTie(state.players)) {
      state.gameOver = {
        team: sortedLeaderboard(state.players)[0]?.name || "-",
        reason: "Sudden death selesai. Pemimpin skor menang."
      };
      state.phase = "gameover";
      persistState();
      render();
      return;
    }

    nextRound();
  }
}

function bindEliminationActions() {
  const eliminatedRole = state.round.assignments[state.round.eliminatedPlayerId]?.role;
  const continueBtn = document.getElementById("continueAfterElimBtn");

  if (state.settings.gameMode === "elimination") {
    if (continueBtn) {
      continueBtn.onclick = () => {
        const winner = evaluateEliminationModeWinner();
        if (winner) {
          finalizeEliminationModeGame(winner);
          return;
        }
        continueEliminationCycle();
      };
    }

    const guessBtn = document.getElementById("guessBtn");
    const skipBtn = document.getElementById("skipGuessBtn");
    if (eliminatedRole === "Kepiting" && guessBtn && skipBtn) {
      const applyGuess = (guess) => {
        const correct = normalize(guess) === normalize(state.round.pair.main);
        if (correct) {
          finalizeEliminationModeGame({
            team: "Kepiting",
            reason: "Kepiting tereliminasi tetapi tebakan kata utama benar."
          });
          return;
        }
        const winner = evaluateEliminationModeWinner();
        if (winner) {
          finalizeEliminationModeGame(winner);
          return;
        }
        continueEliminationCycle();
      };

      guessBtn.onclick = () => {
        const guess = document.getElementById("kepitingGuess").value;
        applyGuess(guess);
      };
      skipBtn.onclick = () => applyGuess("");
    }
    return;
  }

  if (continueBtn) {
    continueBtn.onclick = () => {
      const winner = state.settings.gameMode === "fixed"
        ? evaluateRoundWinnerFixed(state)
        : evaluateRoundWinnerElimination(state);
      if (winner) {
        endRoundAndProceed(winner);
      } else {
        nextRound();
      }
    };
  }

  const guessBtn = document.getElementById("guessBtn");
  const skipBtn = document.getElementById("skipGuessBtn");
  if (eliminatedRole === "Kepiting" && guessBtn && skipBtn) {
    const applyGuess = (guess) => {
      const winner = state.settings.gameMode === "fixed"
        ? evaluateRoundWinnerFixed(state, guess)
        : evaluateRoundWinnerElimination(state, guess);
      if (winner) {
        endRoundAndProceed(winner);
        return;
      }

      const fallback = state.settings.gameMode === "fixed"
        ? evaluateRoundWinnerFixed(state)
        : evaluateRoundWinnerElimination(state);

      if (fallback) endRoundAndProceed(fallback);
      else nextRound();
    };

    guessBtn.onclick = () => {
      const guess = document.getElementById("kepitingGuess").value;
      applyGuess(guess);
    };
    skipBtn.onclick = () => applyGuess("");
  }
}

function bindGameOverActions() {
  const playAgainBtn = document.getElementById("playAgainBtn");
  const backSetupBtn = document.getElementById("backSetupBtn");
  const resetScoreBtn = document.getElementById("resetScoreBtn");

  if (playAgainBtn) playAgainBtn.onclick = () => {
    hardResetRoundState();
    state.players.forEach((p) => { p.alive = true; });
    state.gameOver = null;
    nextRound();
  };

  if (backSetupBtn) backSetupBtn.onclick = () => {
    state.phase = "setup";
    state.gameOver = null;
    render();
  };

  if (resetScoreBtn) resetScoreBtn.onclick = () => {
    if (!confirm("Reset semua skor pemain?")) return;
    resetScores();
    render();
  };
}

function bindPhaseActions() {
  if (state.phase === "setup") bindSetupActions();
  if (state.phase === "reveal") bindRevealActions();
  if (state.phase === "discussion") bindDiscussionActions();
  if (state.phase === "voting") bindVotingActions();
  if (state.phase === "elimination") bindEliminationActions();
  if (state.phase === "gameover") bindGameOverActions();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }
}

function bootstrap() {
  hydrateState();
  setTheme();
  registerServiceWorker();
  antiBackLeakGuard();
  lockPortraitSafe();

  const initialCount = Math.min(12, Math.max(3, Number(state.settings.playersCount) || 6));
  resizePlayers(initialCount);
  state.phase = "setup";

  document.addEventListener("click", lockPortraitSafe, { once: true });
  window.addEventListener("beforeunload", persistState);

  // Expose clear data action on Ctrl+Shift+X for quick manual reset in dev.
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
      if (confirm("Clear all persisted data sekarang?")) {
        clearAllData();
        location.reload();
      }
    }
  });

  render();
}

bootstrap();
