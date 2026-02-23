function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
}

function settingsSection(state, packs) {
  const maxImpostor = state.settings.playersCount <= 4 ? 1 : state.settings.playersCount <= 8 ? 2 : 3;
  const kepBaseMax = state.settings.playersCount >= 7 ? 2 : 1;
  const kepMax = Math.max(0, Math.min(kepBaseMax, state.settings.playersCount - state.settings.silidCount - 1));

  return `
  <section class="card">
    <h2>Setup Game</h2>
    <div class="grid-2">
      <div><label>Jumlah Pemain (3-12)</label><input id="playersCount" type="number" min="3" max="12" value="${state.settings.playersCount}" /></div>
      <div><label>Jumlah Impostor (1-${maxImpostor})</label><input id="silidCount" type="number" min="1" max="${maxImpostor}" value="${state.settings.silidCount}" /></div>
      <div>
        <label>Jumlah Kepiting (0-${kepMax})</label>
        <input id="kepitingCount" type="number" min="0" max="${kepMax}" value="${state.settings.kepitingCount}" />
        <p class="hint">Untuk 2 Kepiting, pemain minimal 7 orang.</p>
      </div>
      <div><label>Durasi Diskusi (1-10 menit)</label><input id="discussionMinutes" type="number" min="1" max="10" value="${state.settings.discussionMinutes}" /></div>
      <div><label>Anti-repeat Last N</label><input id="antiRepeatN" type="number" min="0" max="300" value="${state.settings.antiRepeatN}" /></div>
      <div><label>Difficulty</label><select id="difficulty"><option value="0" ${state.settings.difficulty === 0 ? "selected" : ""}>Semua</option><option value="1" ${state.settings.difficulty === 1 ? "selected" : ""}>Mudah</option><option value="2" ${state.settings.difficulty === 2 ? "selected" : ""}>Sedang</option><option value="3" ${state.settings.difficulty === 3 ? "selected" : ""}>Sulit</option></select></div>
      <div><label>Mode Voting</label><select id="votingMode"><option value="secret" ${state.settings.votingMode === "secret" ? "selected" : ""}>Pass & Vote (Secret)</option><option value="open" ${state.settings.votingMode === "open" ? "selected" : ""}>Open Vote</option></select></div>
      <div><label>Mode Game</label><select id="gameMode"><option value="elimination" ${state.settings.gameMode === "elimination" ? "selected" : ""}>Elimination</option><option value="fixed" ${state.settings.gameMode === "fixed" ? "selected" : ""}>Fixed Rounds</option></select></div>
      <div><label>Jumlah Fixed Round</label><select id="fixedRounds"><option value="3" ${state.settings.fixedRounds === 3 ? "selected" : ""}>3</option><option value="5" ${state.settings.fixedRounds === 5 ? "selected" : ""}>5</option></select></div>
      <div><label>Spectator Mode</label><select id="spectatorMode"><option value="off" ${!state.settings.spectatorMode ? "selected" : ""}>Off</option><option value="on" ${state.settings.spectatorMode ? "selected" : ""}>On</option></select></div>
      <div><label>Sembunyikan Peran Saat Reveal</label><select id="hideRoleDuringReveal"><option value="off" ${!state.settings.hideRoleDuringReveal ? "selected" : ""}>Off</option><option value="on" ${state.settings.hideRoleDuringReveal ? "selected" : ""}>On</option></select></div>
    </div>
  </section>

  <section class="card">
    <h3>Nama Pemain</h3>
    <div class="grid-2">
      ${state.settings.playerNames.map((name, idx) => `<div><label>Pemain ${idx + 1}</label><input data-player-name="${idx}" type="text" value="${esc(name)}" /></div>`).join("")}
    </div>
  </section>

  <section class="card">
    <h3>Pilih Pack Kata</h3>
    <div class="pills">
      ${packs.map((pack) => `
      <label class="pill"><input type="checkbox" value="${esc(pack)}" ${state.settings.selectedPacks.includes(pack) ? "checked" : ""} data-pack />${esc(pack)}</label>
      `).join("")}
    </div>
  </section>

  <section class="card">
    <h3>Custom Words</h3>
    <p class="hint">Format pair: <code>kata1 | kata2</code> (bisa juga koma/semicolon/=>). Baris single akan dipasangkan berurutan.</p>
    <textarea id="customInput" placeholder="Nasi Uduk | Nasi Kuning\nKapal\nPerahu"></textarea>
    <div class="row">
      <button class="btn" id="saveCustomBtn">Simpan Custom</button>
      <button class="btn btn-ghost" id="clearCustomBtn">Hapus Custom</button>
    </div>
    <p class="hint">Tersimpan: ${state.customPairs.length} pair custom.</p>
  </section>

  <section class="card">
    <button class="btn btn-primary btn-xl" id="startMatchBtn">Mulai Ronde</button>
  </section>`;
}

function renderReveal(state) {
  const pid = state.round.activePlayerIds[state.round.revealIndex];
  const player = state.players.find((p) => p.id === pid);
  const assignment = state.round.assignments[pid];
  const roleLabel = state.settings.hideRoleDuringReveal
    ? ""
    : assignment?.role === "Kepiting"
      ? "KAMU KEPITING 🦀"
      : assignment?.role?.toUpperCase();

  return `
  <section class="card center">
    <h2>Giliran ${esc(player?.name || "-")}</h2>
    <p class="hint">Progress reveal: ${state.round.revealIndex + 1}/${state.round.activePlayerIds.length}</p>
    <button id="revealBtn" class="btn btn-primary">Tekan & Tahan untuk Lihat Peran</button>
    <div id="revealPanel" class="${state.round.revealOpen ? "" : "hidden"}">
      ${roleLabel ? `<p class="role">${esc(roleLabel)}</p>` : ""}
      <p class="word">${esc(assignment?.word || "")}</p>
      <button id="hideNextBtn" class="btn">Sembunyikan & Lanjutkan</button>
    </div>
  </section>`;
}

function formatSec(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function renderDiscussion(state) {
  return `
  <section class="card center">
    <h2>Ronde ${state.round.number}</h2>
    <p class="hint">Pemain aktif: ${state.players.filter((p) => p.alive).map((p) => esc(p.name)).join(", ")}</p>
    <div class="timer">${formatSec(state.round.discussion.remainingSec)}</div>
    <div class="row">
      <button class="btn btn-primary" id="timerStartBtn">Start</button>
      <button class="btn" id="timerPauseBtn">Pause</button>
      <button class="btn btn-ghost" id="timerResetBtn">Reset</button>
    </div>
    <button class="btn btn-primary" id="toVotingBtn">Lanjut ke Voting</button>
  </section>`;
}

function renderSecretVoting(state, candidates) {
  const voterId = state.round.voting.voterOrder[state.round.voting.cursor];
  const voter = state.players.find((p) => p.id === voterId);
  return `
  <section class="card center">
    <h2>Voting Rahasia</h2>
    <p>Giliran vote: <strong>${esc(voter?.name || "-")}</strong></p>
    <p class="hint">Progress: ${state.round.voting.cursor + 1}/${state.round.voting.voterOrder.length}</p>
    <div class="vote-targets">
      ${candidates.filter((id) => id !== voterId).map((id) => {
        const p = state.players.find((x) => x.id === id);
        return `<button class="btn voteBtn" data-target="${id}">${esc(p?.name || "-")}</button>`;
      }).join("")}
    </div>
  </section>`;
}

function renderOpenVoting(state, candidates) {
  const voterId = state.round.voting.voterOrder[state.round.voting.cursor];
  const voter = state.players.find((p) => p.id === voterId);
  const tally = state.round.voting.openTally;

  return `
  <section class="card">
    <h2>Open Vote</h2>
    <p><strong>${esc(voter?.name || "-")}</strong> memilih target.</p>
    <p class="hint">Tap nama untuk tambah suara. Progress: ${state.round.voting.cursor + 1}/${state.round.voting.voterOrder.length}</p>
    <div class="grid">
      ${candidates.filter((id) => id !== voterId).map((id) => {
        const p = state.players.find((x) => x.id === id);
        return `<button class="btn voteBtn" data-target="${id}">${esc(p?.name || "-")} (+${tally[id] || 0})</button>`;
      }).join("")}
    </div>
  </section>`;
}

function renderVoting(state, candidates) {
  const tieText = state.warning.includes("Vote seri")
    ? `<p class="warn">Vote seri. Revote semua pemain aktif.</p>`
    : "";

  return `${tieText}${state.settings.votingMode === "open" ? renderOpenVoting(state, candidates) : renderSecretVoting(state, candidates)}`;
}

function renderElimination(state) {
  const p = state.players.find((x) => x.id === state.round.eliminatedPlayerId);
  const a = state.round.assignments[p?.id];
  return `
  <section class="card">
    <h2>Eliminasi</h2>
    <p><strong>${esc(p?.name || "-")}</strong> tereliminasi.</p>
    <p>Peran: <strong>${esc(a?.role || "-")}</strong></p>
    ${a?.role === "Impostor" ? `<p class="win">Satu Impostor telah tertangkap!</p>` : ""}
    ${a?.role === "Kepiting" ? `
      <div class="card">
        <label>Tebak kata utama! (1x)</label>
        <input id="kepitingGuess" type="text" placeholder="Masukkan tebakan" />
        <div class="row">
          <button id="guessBtn" class="btn btn-primary">Submit Tebakan</button>
          <button id="skipGuessBtn" class="btn btn-ghost">Lewati</button>
        </div>
      </div>
    ` : `<button id="continueAfterElimBtn" class="btn btn-primary">Lanjut</button>`}
  </section>`;
}

function renderLeaderboard(state) {
  const rows = [...state.players].sort((a, b) => b.score - a.score || a.id - b.id);
  return `
  <table class="table">
    <thead><tr><th>#</th><th>Nama</th><th>Skor</th><th>Stats</th></tr></thead>
    <tbody>
      ${rows.map((p, idx) => `<tr><td>${idx + 1}</td><td>${esc(p.name)}</td><td>${p.score}</td><td>W:${p.stats.asWarga} I:${p.stats.asImpostor || 0} K:${p.stats.asKepiting} B:${p.stats.bonusHits}</td></tr>`).join("")}
    </tbody>
  </table>`;
}

function renderGameOver(state) {
  return `
  <section class="card">
    <h2>Game Over</h2>
    <p class="win">Faksi Menang: ${esc(state.gameOver?.team || "-")}</p>
    <p>${esc(state.gameOver?.reason || "")}</p>
    ${renderLeaderboard(state)}
    <div class="row">
      <button class="btn btn-primary" id="playAgainBtn">Main Lagi (Setting Sama)</button>
      <button class="btn" id="backSetupBtn">Ubah Setting</button>
      <button class="btn btn-danger" id="resetScoreBtn">Reset Skor</button>
    </div>
  </section>`;
}

export function renderApp(state, packs, totalWordCount) {
  const warning = state.warning ? `<section class="card"><p class="warn">${esc(state.warning)}</p></section>` : "";
  const header = `
    <header class="topbar">
      <div class="brand">
        <h1 class="title">🦀 Impostor Kepiting Game</h1>
        <p class="subtitle">Party word deduction game</p>
      </div>
      <div class="top-actions primary-actions">
        <button class="btn" id="themeToggleBtn">${state.theme === "dark" ? "Light" : "Dark"} Mode</button>
        <button class="btn" id="howToBtn">Cara Main</button>
        <button class="btn" id="viewWordsBtn">Lihat Kata</button>
      </div>
      <div class="top-actions secondary-actions">
        <button class="btn" id="viewHistoryBtn">History</button>
        <button class="btn btn-ghost" id="clearDataBtn">Clear Data</button>
        <button class="btn btn-danger" id="quickResetBtn">Quick Reset</button>
      </div>
    </header>
    <section class="card meta-strip">
      <span class="badge">Word bank: ${totalWordCount} pair</span>
      <span class="badge">Mode: ${state.settings.gameMode === "fixed" ? "Fixed Rounds" : "Elimination"}</span>
      <span class="badge">Ronde: ${state.round.number}</span>
    </section>
  `;

  let body = "";
  if (state.phase === "setup") body = settingsSection(state, packs);
  if (state.phase === "reveal") body = renderReveal(state);
  if (state.phase === "discussion") body = renderDiscussion(state);
  if (state.phase === "voting") body = renderVoting(state, state._voteCandidates || []);
  if (state.phase === "elimination") body = renderElimination(state);
  if (state.phase === "gameover") body = renderGameOver(state);

  return `${header}${warning}${body}`;
}
