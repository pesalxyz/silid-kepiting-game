import { WORD_BANK } from "./wordbank.js";
import { createOnlineClient } from "./online.js";

const app = document.getElementById("onlineApp");

const online = {
  connected: false,
  serverUrl: "wss://silid-kepiting-game-production.up.railway.app",
  name: "",
  roomCode: "",
  clientId: "",
  isHost: false,
  peers: [],
  roomState: null,
  revealOpen: false,
  timerId: null,
  warning: ""
};
let pendingAction = null;

const client = createOnlineClient({
  onOpen() {
    online.connected = true;
    online.warning = "Terhubung ke server.";
    if (pendingAction?.mode === "create") {
      const sent = client.createRoom(pendingAction.playerName);
      if (sent) pendingAction = null;
    } else if (pendingAction?.mode === "join") {
      const sent = client.joinRoom(pendingAction.roomCode, pendingAction.playerName);
      if (sent) pendingAction = null;
    }
    render();
  },
  onClose() {
    stopHostTimer();
    pendingAction = null;
    online.connected = false;
    online.roomCode = "";
    online.isHost = false;
    online.peers = [];
    online.roomState = null;
    online.warning = "Koneksi terputus.";
    render();
  },
  onRoom(msg) {
    online.connected = true;
    online.clientId = msg.clientId || online.clientId;
    online.roomCode = msg.roomCode || "";
    online.isHost = Boolean(msg.isHost);
    online.peers = Array.isArray(msg.peers) ? msg.peers : [];
    if (msg.snapshot) online.roomState = msg.snapshot;
    online.warning = `Online aktif di room ${online.roomCode}.`;
    render();
  },
  onPeers(msg) {
    if (msg.roomCode && msg.roomCode !== online.roomCode) return;
    online.peers = Array.isArray(msg.peers) ? msg.peers : [];
    const me = online.peers.find((p) => p.clientId === online.clientId);
    if (me) online.isHost = Boolean(me.isHost);
    render();
  },
  onState(msg) {
    if (msg.roomCode !== online.roomCode) return;
    online.roomState = msg.snapshot || null;
    syncHostTimerByState();
    render();
  },
  onPlayerAction(msg) {
    if (!online.isHost) return;
    if (msg.roomCode !== online.roomCode) return;
    if (!online.roomState) return;
    applyPlayerAction(msg.senderId, msg.action || {});
  },
  onHostChanged(msg) {
    if (msg.roomCode !== online.roomCode) return;
    online.isHost = msg.hostId === online.clientId;
    online.warning = online.isHost ? "Anda menjadi host room." : "Host room berubah.";
    render();
  },
  onServerError(msg) {
    online.warning = msg.message || "Server error.";
    render();
  }
});

function esc(s) {
  return String(s ?? "").replace(/[&<>\"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
}

function secureRandomInt(max) {
  if (max <= 0) return 0;
  if (window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffle(arr) {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pickPair() {
  return WORD_BANK[secureRandomInt(WORD_BANK.length)] || { main: "Kucing", undercover: "Harimau" };
}

function getPeerName(id) {
  return online.peers.find((p) => p.clientId === id)?.name || id.slice(0, 6);
}

function ensureConnected() {
  const url = (online.serverUrl || "").trim();
  if (!url) {
    online.warning = "Server WebSocket wajib diisi.";
    render();
    return false;
  }
  client.connect(url);
  return true;
}

function sendHostState() {
  if (!online.isHost || !online.roomCode || !online.roomState) return;
  online.roomState.version = (online.roomState.version || 0) + 1;
  client.publishState(online.roomCode, online.roomState);
  syncHostTimerByState();
  render();
}

function roleCountsAlive(room) {
  let warga = 0;
  let impostor = 0;
  let kepiting = 0;
  room.players.filter((p) => p.alive).forEach((p) => {
    const role = room.assignments[p.id]?.role;
    if (role === "Warga") warga += 1;
    if (role === "Impostor") impostor += 1;
    if (role === "Kepiting") kepiting += 1;
  });
  return { warga, impostor, kepiting };
}

function allAliveSubmitted(map, room) {
  const alive = room.players.filter((p) => p.alive).map((p) => p.id);
  return alive.every((id) => Boolean(map[id]));
}

function startGameFromHost() {
  if (!online.isHost) return;
  const playersCount = online.peers.length;
  if (playersCount < 3) {
    online.warning = "Minimal 3 pemain di room untuk mulai game.";
    render();
    return;
  }

  const impostorCount = Math.max(1, Math.min(3, Number(document.getElementById("hostImpostorCount")?.value || 1)));
  const kepitingBase = playersCount >= 7 ? 2 : 1;
  const kepitingCount = Math.max(0, Math.min(kepitingBase, Number(document.getElementById("hostKepitingCount")?.value || 1)));
  const discussionMinutes = Math.max(1, Math.min(10, Number(document.getElementById("hostDiscussionMinutes")?.value || 3)));

  if (impostorCount + kepitingCount >= playersCount) {
    online.warning = "Impostor + Kepiting harus lebih kecil dari jumlah pemain.";
    render();
    return;
  }

  const pair = pickPair();
  const peerIds = online.peers.map((p) => p.clientId);
  const roles = [];
  for (let i = 0; i < impostorCount; i += 1) roles.push("Impostor");
  for (let i = 0; i < kepitingCount; i += 1) roles.push("Kepiting");
  while (roles.length < peerIds.length) roles.push("Warga");

  const assignedRoles = shuffle(roles);
  const assignments = {};
  peerIds.forEach((id, idx) => {
    const role = assignedRoles[idx];
    const word = role === "Warga" ? pair.main : role === "Impostor" ? pair.undercover : "(Tidak ada kata)";
    assignments[id] = { role, word };
  });

  online.roomState = {
    version: 1,
    hostId: online.clientId,
    phase: "reveal",
    round: 1,
    pair,
    settings: {
      discussionSeconds: discussionMinutes * 60,
      impostorCount,
      kepitingCount
    },
    players: online.peers.map((p) => ({ id: p.clientId, name: p.name, alive: true })),
    assignments,
    revealed: {},
    guesses: {},
    readyForVoting: {},
    voting: {
      order: [],
      cursor: 0,
      votes: {},
      note: ""
    },
    discussion: {
      remainingSec: discussionMinutes * 60,
      running: false
    },
    eliminatedId: null,
    winner: null
  };

  online.warning = "Game online dimulai. Semua pemain reveal peran masing-masing.";
  sendHostState();
}

function transitionToDiscussion(room) {
  room.phase = "discussion";
  room.guesses = {};
  room.readyForVoting = {};
  room.voting = { order: [], cursor: 0, votes: {}, note: "" };
  room.eliminatedId = null;
  room.discussion.remainingSec = room.settings.discussionSeconds;
  room.discussion.running = false;
}

function transitionToVoting(room) {
  room.phase = "voting";
  room.voting = {
    order: shuffle(room.players.filter((p) => p.alive).map((p) => p.id)),
    cursor: 0,
    votes: {},
    note: ""
  };
}

function finalizeVoting(room) {
  const tally = {};
  Object.values(room.voting.votes).forEach((targetId) => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });
  const ordered = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  if (!ordered.length) return;

  const max = ordered[0][1];
  const top = ordered.filter(([, n]) => n === max).map(([id]) => id);
  if (top.length > 1) {
    room.voting.order = shuffle(room.players.filter((p) => p.alive).map((p) => p.id));
    room.voting.cursor = 0;
    room.voting.votes = {};
    room.voting.note = "Vote seri, revote untuk semua pemain aktif.";
    return;
  }

  room.eliminatedId = top[0];
  const target = room.players.find((p) => p.id === room.eliminatedId);
  if (target) target.alive = false;
  room.phase = "elimination";
  room.voting.note = "";
}

function continueAfterElimination(room) {
  const counts = roleCountsAlive(room);
  if (counts.impostor === 0) {
    room.phase = "gameover";
    room.winner = { team: "Warga", reason: "Semua Impostor tereliminasi." };
    return;
  }
  if (counts.impostor >= counts.warga) {
    room.phase = "gameover";
    room.winner = { team: "Impostor", reason: "Jumlah Impostor >= Warga." };
    return;
  }

  room.round += 1;
  transitionToDiscussion(room);
}

function applyPlayerAction(senderId, action) {
  const room = online.roomState;
  if (!room || !action?.type) return;

  if (action.type === "reveal_done" && room.phase === "reveal") {
    room.revealed[senderId] = true;
    const allDone = room.players.every((p) => Boolean(room.revealed[p.id]));
    if (allDone) transitionToDiscussion(room);
    sendHostState();
    return;
  }

  if (action.type === "submit_guess" && room.phase === "discussion") {
    room.guesses[senderId] = String(action.guess || "").trim();
    room.readyForVoting[senderId] = true;
    const allReady = allAliveSubmitted(room.readyForVoting, room);
    if (allReady) transitionToVoting(room);
    sendHostState();
    return;
  }

  if (action.type === "timer_cmd" && room.phase === "discussion") {
    if (senderId !== room.hostId) return;
    if (action.cmd === "start") room.discussion.running = true;
    if (action.cmd === "pause") room.discussion.running = false;
    if (action.cmd === "reset") {
      room.discussion.running = false;
      room.discussion.remainingSec = room.settings.discussionSeconds;
    }
    sendHostState();
    return;
  }

  if (action.type === "cast_vote" && room.phase === "voting") {
    const voterId = room.voting.order[room.voting.cursor];
    if (voterId !== senderId) return;
    const target = String(action.targetId || "");
    if (!target || target === senderId) return;
    const targetAlive = room.players.find((p) => p.id === target && p.alive);
    if (!targetAlive) return;

    room.voting.votes[senderId] = target;
    room.voting.cursor += 1;
    if (room.voting.cursor >= room.voting.order.length) finalizeVoting(room);
    sendHostState();
    return;
  }

  if (action.type === "continue_after_elimination" && room.phase === "elimination") {
    if (senderId !== room.hostId) return;
    continueAfterElimination(room);
    sendHostState();
  }
}

function stopHostTimer() {
  if (online.timerId) {
    clearInterval(online.timerId);
    online.timerId = null;
  }
}

function syncHostTimerByState() {
  const room = online.roomState;
  stopHostTimer();
  if (!online.isHost || !room || room.phase !== "discussion" || !room.discussion.running) return;

  online.timerId = setInterval(() => {
    if (!online.roomState || online.roomState.phase !== "discussion") {
      stopHostTimer();
      return;
    }
    if (!online.roomState.discussion.running) {
      stopHostTimer();
      return;
    }
    online.roomState.discussion.remainingSec = Math.max(0, online.roomState.discussion.remainingSec - 1);
    if (online.roomState.discussion.remainingSec === 0) {
      online.roomState.discussion.running = false;
    }
    sendHostState();
  }, 1000);
}

function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function statusList(title, room, map) {
  return `
    <section class="card">
      <h3>${esc(title)}</h3>
      <div class="grid-2">
        ${room.players.map((p) => `<div><strong>${esc(p.name)}</strong> : <span class="${map[p.id] ? "online-on" : "online-off"}">${map[p.id] ? "Sudah" : "Belum"}</span></div>`).join("")}
      </div>
    </section>
  `;
}

function renderLobby() {
  const maxImpostor = online.peers.length <= 4 ? 1 : online.peers.length <= 8 ? 2 : 3;
  const maxKepiting = online.peers.length >= 7 ? 2 : 1;

  return `
  <section class="card">
    <h2>Lobby Online</h2>
    <div class="grid-2">
      <div>
        <label>Server WebSocket</label>
        <input id="serverUrlInput" type="text" value="${esc(online.serverUrl)}" />
      </div>
      <div>
        <label>Nama Kamu</label>
        <input id="playerNameInput" type="text" value="${esc(online.name)}" />
      </div>
      <div>
        <label>Room Code</label>
        <input id="roomCodeInput" type="text" value="${esc(online.roomCode)}" />
      </div>
      <div>
        <label>Status</label>
        <p class="hint online-status ${online.connected ? "online-on" : "online-off"}">${online.connected ? "Terhubung" : "Belum terhubung"}</p>
      </div>
    </div>
    <div class="row">
      <button class="btn btn-primary" id="createRoomBtn">Buat Room</button>
      <button class="btn" id="joinRoomBtn">Join Room</button>
      <button class="btn btn-ghost" id="leaveRoomBtn">Keluar Room</button>
    </div>
  </section>

  <section class="card">
    <h3>Pemain di Room (${online.peers.length})</h3>
    <p class="hint">${online.roomCode ? `Room: ${esc(online.roomCode)}${online.isHost ? " (Host)" : ""}` : "Belum join room"}</p>
    <div class="pills">
      ${online.peers.map((p) => `<span class="pill">${esc(p.name)}${p.isHost ? " (Host)" : ""}</span>`).join("")}
    </div>
  </section>

  ${online.isHost ? `
  <section class="card">
    <h3>Setup Host</h3>
    <div class="grid-3">
      <div><label>Jumlah Impostor</label><input id="hostImpostorCount" type="number" min="1" max="${Math.max(1, maxImpostor)}" value="1" /></div>
      <div><label>Jumlah Kepiting</label><input id="hostKepitingCount" type="number" min="0" max="${Math.max(0, maxKepiting)}" value="1" /></div>
      <div><label>Diskusi (menit)</label><input id="hostDiscussionMinutes" type="number" min="1" max="10" value="3" /></div>
    </div>
    <button class="btn btn-primary btn-xl" id="hostStartGameBtn">Mulai Game Online</button>
  </section>` : ""}
  `;
}

function renderReveal(room, meId) {
  const mine = room.assignments[meId];
  return `
  <section class="card">
    <h2>Reveal Peran</h2>
    <p class="hint">Setiap user reveal perannya sendiri. Game lanjut otomatis setelah semua reveal.</p>
    <div class="card center">
      <h3>Info Kamu di Ronde Ini</h3>
      <p class="word">Kata: ${esc((mine?.word || "-").toLowerCase())}</p>
      <button class="btn" id="revealDoneBtn" ${room.revealed[meId] ? "disabled" : ""}>${room.revealed[meId] ? "Sudah Reveal" : "Saya Sudah Reveal"}</button>
    </div>
  </section>
  ${statusList("Status Reveal Pemain", room, room.revealed)}
  `;
}

function renderDiscussion(room, meId) {
  const guess = room.guesses[meId] || "";
  const ready = Boolean(room.readyForVoting[meId]);
  const meAlive = room.players.find((p) => p.id === meId)?.alive;
  return `
  <section class="card">
    <h2>Diskusi Ronde ${room.round}</h2>
    <p class="hint">Mode online: tombol Start/Pause/Reset hanya untuk Host.</p>
    <div class="timer">${fmt(room.discussion.remainingSec)}</div>
    ${online.isHost ? `
      <div class="row">
        <button class="btn btn-primary" id="timerStartBtn">Start</button>
        <button class="btn" id="timerPauseBtn">Pause</button>
        <button class="btn btn-ghost" id="timerResetBtn">Reset</button>
      </div>
    ` : ""}
  </section>

  <section class="card">
    <h3>Input Kata Tebakan</h3>
    ${meAlive ? `
      <input id="guessInput" type="text" value="${esc(guess)}" placeholder="Masukkan kata tebakan kamu" ${ready ? "disabled" : ""}/>
      <button class="btn btn-primary" id="readyVotingBtn" ${ready ? "disabled" : ""}>${ready ? "Sudah Klik Lanjut ke Voting" : "Lanjut ke Voting"}</button>
    ` : `<p class="hint">Kamu sudah tereliminasi, menunggu voting pemain aktif.</p>`}
  </section>

  ${statusList("Status Input + Lanjut Voting", room, room.readyForVoting)}
  `;
}

function renderVoting(room, meId) {
  const voterId = room.voting.order[room.voting.cursor];
  const voterName = getPeerName(voterId);
  const myTurn = meId === voterId;
  const voted = Boolean(room.voting.votes[meId]);
  const meAlive = room.players.find((p) => p.id === meId)?.alive;

  return `
  <section class="card">
    <h2>Voting</h2>
    <p><strong>Giliran vote:</strong> ${esc(voterName || "-")}</p>
    <p class="hint">Progress: ${room.voting.cursor + 1}/${room.voting.order.length}</p>
    ${room.voting.note ? `<p class="warn">${esc(room.voting.note)}</p>` : ""}

    ${meAlive && myTurn && !voted ? `
      <div class="vote-targets">
        ${room.players.filter((p) => p.alive && p.id !== meId).map((p) => `<button class="btn voteBtn" data-target="${p.id}">${esc(p.name)}</button>`).join("")}
      </div>
    ` : `<p class="hint">${myTurn ? "Kamu sudah vote." : "Menunggu giliran voter saat ini."}</p>`}
  </section>
  `;
}

function renderElimination(room) {
  const out = room.players.find((p) => p.id === room.eliminatedId);
  const role = room.assignments[room.eliminatedId]?.role;
  return `
  <section class="card">
    <h2>Eliminasi</h2>
    <p><strong>${esc(out?.name || "-")}</strong> tereliminasi.</p>
    <p>Peran: <strong>${esc(role || "-")}</strong></p>
    ${online.isHost ? `<button class="btn btn-primary" id="continueAfterElimBtn">Lanjut</button>` : `<p class="hint">Menunggu host melanjutkan...</p>`}
  </section>
  `;
}

function renderGameOver(room) {
  return `
  <section class="card">
    <h2>Game Over</h2>
    <p class="win">Pemenang: ${esc(room.winner?.team || "-")}</p>
    <p>${esc(room.winner?.reason || "")}</p>
    ${online.isHost ? `<button class="btn btn-primary" id="hostRestartBtn">Main Lagi</button>` : `<p class="hint">Menunggu host memulai ulang.</p>`}
  </section>
  `;
}

function renderGame(room, meId) {
  if (room.phase === "reveal") return renderReveal(room, meId);
  if (room.phase === "discussion") return renderDiscussion(room, meId);
  if (room.phase === "voting") return renderVoting(room, meId);
  if (room.phase === "elimination") return renderElimination(room);
  if (room.phase === "gameover") return renderGameOver(room);
  return `<section class="card"><p>Phase tidak dikenali.</p></section>`;
}

function render() {
  const warning = online.warning ? `<section class="card"><p class="warn">${esc(online.warning)}</p></section>` : "";
  const body = online.roomState ? renderGame(online.roomState, online.clientId) : renderLobby();

  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <h1 class="title">Online Room - Impostor Kepiting</h1>
        <p class="subtitle">Mode online terpisah dari mode offline</p>
      </div>
      <div class="top-actions">
        <button class="btn" id="backOfflineBtn">Kembali ke Offline</button>
      </div>
    </header>
    ${warning}
    ${body}
  `;

  bindActions();
}

function bindActions() {
  const backOfflineBtn = document.getElementById("backOfflineBtn");
  if (backOfflineBtn) backOfflineBtn.onclick = () => { location.href = "./index.html"; };

  const serverUrlInput = document.getElementById("serverUrlInput");
  if (serverUrlInput) {
    serverUrlInput.onchange = () => {
      online.serverUrl = serverUrlInput.value.trim();
    };
  }

  const playerNameInput = document.getElementById("playerNameInput");
  if (playerNameInput) {
    playerNameInput.onchange = () => {
      online.name = playerNameInput.value.trim();
    };
  }

  const roomCodeInput = document.getElementById("roomCodeInput");
  if (roomCodeInput) {
    roomCodeInput.onchange = () => {
      online.roomCode = roomCodeInput.value.toUpperCase().trim();
      render();
    };
  }

  const createRoomBtn = document.getElementById("createRoomBtn");
  if (createRoomBtn) createRoomBtn.onclick = () => {
    if (!ensureConnected()) return;
    const name = online.name || "Host";
    pendingAction = { mode: "create", playerName: name };
    if (online.connected) {
      const sent = client.createRoom(name);
      if (sent) pendingAction = null;
    } else {
      online.warning = "Menghubungkan ke server, mohon tunggu...";
      render();
    }
  };

  const joinRoomBtn = document.getElementById("joinRoomBtn");
  if (joinRoomBtn) joinRoomBtn.onclick = () => {
    if (!online.roomCode) {
      online.warning = "Room code wajib diisi.";
      render();
      return;
    }
    if (!ensureConnected()) return;
    const name = online.name || "Pemain";
    pendingAction = { mode: "join", roomCode: online.roomCode, playerName: name };
    if (online.connected) {
      const sent = client.joinRoom(online.roomCode, name);
      if (sent) pendingAction = null;
    } else {
      online.warning = "Menghubungkan ke server, mohon tunggu...";
      render();
    }
  };

  const leaveRoomBtn = document.getElementById("leaveRoomBtn");
  if (leaveRoomBtn) leaveRoomBtn.onclick = () => {
    client.disconnect();
    online.roomState = null;
  };

  const hostStartGameBtn = document.getElementById("hostStartGameBtn");
  if (hostStartGameBtn) hostStartGameBtn.onclick = startGameFromHost;

  const revealDoneBtn = document.getElementById("revealDoneBtn");
  if (revealDoneBtn) revealDoneBtn.onclick = () => {
    client.sendPlayerAction(online.roomCode, { type: "reveal_done" });
  };

  const timerStartBtn = document.getElementById("timerStartBtn");
  if (timerStartBtn) timerStartBtn.onclick = () => {
    client.sendPlayerAction(online.roomCode, { type: "timer_cmd", cmd: "start" });
  };

  const timerPauseBtn = document.getElementById("timerPauseBtn");
  if (timerPauseBtn) timerPauseBtn.onclick = () => {
    client.sendPlayerAction(online.roomCode, { type: "timer_cmd", cmd: "pause" });
  };

  const timerResetBtn = document.getElementById("timerResetBtn");
  if (timerResetBtn) timerResetBtn.onclick = () => {
    client.sendPlayerAction(online.roomCode, { type: "timer_cmd", cmd: "reset" });
  };

  const readyVotingBtn = document.getElementById("readyVotingBtn");
  if (readyVotingBtn) readyVotingBtn.onclick = () => {
    const guess = document.getElementById("guessInput")?.value || "";
    client.sendPlayerAction(online.roomCode, { type: "submit_guess", guess });
  };

  app.querySelectorAll(".voteBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      client.sendPlayerAction(online.roomCode, {
        type: "cast_vote",
        targetId: btn.dataset.target
      });
    });
  });

  const continueAfterElimBtn = document.getElementById("continueAfterElimBtn");
  if (continueAfterElimBtn) continueAfterElimBtn.onclick = () => {
    client.sendPlayerAction(online.roomCode, { type: "continue_after_elimination" });
  };

  const hostRestartBtn = document.getElementById("hostRestartBtn");
  if (hostRestartBtn) hostRestartBtn.onclick = () => {
    online.roomState = null;
    online.warning = "Room reset ke lobby. Host bisa setup ulang game.";
    client.publishState(online.roomCode, null);
    render();
  };
}

render();
