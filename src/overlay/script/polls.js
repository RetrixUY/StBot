// Espera a que el DOM esté completamente cargado para evitar errores.
window.addEventListener('DOMContentLoaded', () => {

  // --- Referencias a los elementos del DOM ---
  const card = document.getElementById("pollCard");
  const titleEl = document.getElementById("pollTitle");
  const rowsEl = document.getElementById("pollRows");
  const statusEl = document.getElementById("pollStatus");
  const totalEl = document.getElementById("pollTotal");
  const timebar = document.getElementById("timebar");
  const timefill = document.getElementById("timefill");
  // ***** NUEVO: Referencia al elemento de audio *****
  const pollSound = document.getElementById("sfx-poll");

  // --- Configuraciones y Helpers ---
  const qs = new URLSearchParams(location.search);
  const DONE_MS = Number(qs.get("done")) || 15000;
  const PREDICT_POST_MS = Number(qs.get("predictPost")) || 15000;
  const CANCEL_MS = Number(qs.get("cancel")) || 3000;
  const COLORS = ["#a855f7", "#c084fc", "#8b5cf6", "#7c3aed", "#d946ef", "#9333ea", "#e879f9", "#6d28d9"];

  const fmtInt = (n) => new Intl.NumberFormat().format(Number(n || 0));
  const fmtRatio = (x) => `${(Math.round(Number(x) * 100) / 100).toFixed(2)}×`;
  const pct = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const plural = (n, uno, varios) => n === 1 ? uno : varios;

  // --- Máquina de Estado Robusta ---
  let currentSig = "";
  let phase = "idle";
  let holdTimer = null;
  let holdUntil = 0;
  let lastFrame = null;
  let lastWinSig = "";

  const stageRank = { ACTIVE: 1, LOCKED: 2, COMPLETED: 3, RESOLVED: 3, CANCELED: 3 };
  const now = () => Date.now();
  const inHold = () => phase === "holding" && (holdTimer || now() < holdUntil);

  const isClear = (f) => !f || !f.data || (!f.data.choices && !f.data.outcomes);
  const sigOf = (f) => `${f.kind}|${f.data.title}|${(f.data.choices || f.data.outcomes).map(e => e.title).join("|")}`;

  function clearHold() {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
    holdUntil = 0;
    if (phase === "holding") phase = "idle";
  }

  function startHold(ms) {
    if (inHold()) return;
    phase = "holding";
    holdUntil = now() + ms;
    holdTimer = setTimeout(() => {
      phase = "idle";
      card.classList.add("hidden");
    }, ms);
  }

  // --- Lógica de Sonido ---
  function playPollSound() {
    if (pollSound) {
        pollSound.currentTime = 0;
        pollSound.play().catch(e => console.error("Error al reproducir sonido de encuesta:", e.message));
    }
  }

  // --- Countdown Timer ---
  let countdownTimer = null;
  function stopCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
  }
  function startCountdown(remainingMs, totalMs) {
    if (!Number.isFinite(remainingMs) || remainingMs <= 0 || !Number.isFinite(totalMs) || totalMs <= 0) {
      stopCountdown();
      timebar.classList.add("hidden");
      return;
    }
    const endsAt = now() + remainingMs;
    timebar.classList.remove("hidden");
    const tick = () => {
      const rem = Math.max(0, endsAt - now());
      const width = (Math.max(0, Math.min(1, rem / totalMs)) * 100).toFixed(2);
      timefill.style.width = `${width}%`;
      if (rem <= 0) stopCountdown();
    };
    stopCountdown();
    countdownTimer = setInterval(tick, 200);
    tick();
  }

  // --- Efecto de Confeti ---
  function burstConfetti() {
    for (let i = 0; i < 28; i++) {
      const p = document.createElement("i");
      p.className = "confetti";
      p.style.left = `${Math.round(Math.random() * (card.clientWidth || 600))}px`;
      p.style.background = COLORS[i % COLORS.length];
      p.style.animationDuration = `${900 + Math.random() * 900}ms`;
      p.style.transform = `translateY(0) rotate(${Math.random() * 180}deg)`;
      card.appendChild(p);
      setTimeout(() => p.remove(), 1800);
    }
  }
  
  // --- Mapeo de Datos (Backend -> Frontend) ---
  function mapPayloadToFrame(payload) {
    const { kind, state, data } = payload;
    const frame = { kind, state, title: data.title };

    if (kind === 'poll') {
      const totalVotes = data.votes || 1;
      frame.totalVotes = data.votes;
      frame.entries = data.choices.map((c, i) => ({
        title: c.title,
        votes: c.votes,
        percent: (c.votes / totalVotes) * 100,
        isWinner: state === 'COMPLETED' && data.winnerChoice === i,
      }));
      frame.durationMs = (data.duration || 0) * 1000;
      frame.remainingMs = (data.durationRemaining || 0) * 1000;
    } else { // Prediction
      const totalBetAmount = data.outcomes.reduce((s, o) => s + o.betTotal, 0);
      frame.totalVotes = data.totalBets;
      frame.totalBetAmount = totalBetAmount;
      frame.entries = data.outcomes.map((o, i) => ({
        title: o.title,
        betCount: o.betCount,
        betAmount: o.betTotal,
        returnRate: o.betRatio,
        percent: totalBetAmount > 0 ? (o.betTotal / totalBetAmount) * 100 : 0,
        isWinner: state === 'RESOLVED' && data.winnerOutcomeIndex === i,
      }));
      frame.durationMs = (data.duration || 0) * 1000;
      frame.remainingMs = data.createdAt ? Math.max(0, new Date(data.createdAt).getTime() + frame.durationMs - now()) : 0;
    }
    return frame;
  }
  
  // --- Creación de Elementos ---
  function makeChip(text) {
    const s = document.createElement("span");
    s.className = "chip";
    s.textContent = text;
    return s;
  }

  // --- Función Principal de Renderizado ---
  function renderFrame(payload) {
    if (inHold()) {
      if (lastFrame) card.classList.remove("hidden");
      return;
    }

    if (isClear(payload)) {
      if (phase === "LOCKED" && lastFrame) {
        card.classList.remove("hidden");
        return;
      }
      stopCountdown();
      clearHold();
      card.classList.add("hidden");
      card.classList.remove("completed");
      currentSig = ""; phase = "idle"; lastFrame = null; lastWinSig = "";
      return;
    }

    const frame = mapPayloadToFrame(payload);
    const sig = sigOf(payload);

    if (sig !== currentSig && phase !== "LOCKED") {
      currentSig = sig;
      lastFrame = null;
      lastWinSig = "";
    }

    const stage = stageRank[frame.state] || 0;
    const lastStage = stageRank[phase] || 0;
    if (stage < lastStage && sig === currentSig) return;

    // ***** LÓGICA DE SONIDO *****
    // Guardamos el estado anterior para detectar el cambio
    const previousPhase = phase;
    phase = frame.state;

    // Comprobamos si el estado ha cambiado a uno de los que activan el sonido
    const shouldPlaySound = 
        (previousPhase !== 'ACTIVE' && phase === 'ACTIVE') ||
        (previousPhase !== 'COMPLETED' && phase === 'COMPLETED') ||
        (previousPhase !== 'RESOLVED' && phase === 'RESOLVED');

    if (shouldPlaySound) {
        playPollSound();
    }
    // ***** FIN LÓGICA DE SONIDO *****

    if (frame.state === 'COMPLETED') startHold(DONE_MS);
    else if (frame.state === 'RESOLVED') startHold(PREDICT_POST_MS);
    else if (frame.state === 'CANCELED') startHold(CANCEL_MS);
    else clearHold();

    // --- Actualización del DOM ---
    titleEl.textContent = frame.title || "—";
    
    const statusMap = { COMPLETED: "Terminada", RESOLVED: "Resultado", CANCELED: "Cancelada", LOCKED: "Cerrada", ACTIVE: "En curso" };
    statusEl.textContent = statusMap[frame.state] || "En curso";
    
    if (frame.kind === 'prediction') {
      totalEl.innerHTML = "";
      totalEl.appendChild(makeChip(`Puntos: ${fmtInt(frame.totalBetAmount)}`));
      totalEl.appendChild(makeChip(`Apuestas: ${fmtInt(frame.totalVotes)}`));
      totalEl.classList.add("footer-right");
    } else {
      totalEl.classList.remove("footer-right");
      totalEl.textContent = `${fmtInt(frame.totalVotes)} ${plural(frame.totalVotes, "voto", "votos")}`;
    }

    if (frame.state === 'ACTIVE' && frame.remainingMs > 0 && frame.durationMs > 0) {
      startCountdown(frame.remainingMs, frame.durationMs);
    } else {
      stopCountdown();
      timebar.classList.add("hidden");
    }
    
    rowsEl.innerHTML = "";
    frame.entries.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "row" + (e.isWinner ? " winner" : "");
      row.style.setProperty("--bar-color", COLORS[i % COLORS.length]);

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = e.title;

      const stat = document.createElement("div");
      stat.className = "stat";
      const p = e.percent || 0;
      
      if (frame.kind === 'prediction') {
        stat.textContent = `${pct(p)}%`;
      } else {
        stat.textContent = `${pct(p)}% (${fmtInt(e.votes)} ${plural(e.votes, "voto", "votos")})`;
      }
      
      if ((frame.state === 'COMPLETED' || frame.state === 'RESOLVED') && e.isWinner) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "GANADOR";
        stat.appendChild(badge);
      }

      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("div");
      fill.className = "fill";
      bar.appendChild(fill);
      
      row.appendChild(name);
      row.appendChild(stat);
      row.appendChild(bar);

      if (frame.kind === 'prediction') {
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.appendChild(makeChip(`Apuestas: ${fmtInt(e.betCount)}`));
        meta.appendChild(makeChip(`Puntos: ${fmtInt(e.betAmount)}`));
        meta.appendChild(makeChip(`Ratio: ${fmtRatio(e.returnRate)}`));
        row.appendChild(meta);
      }

      rowsEl.appendChild(row);
      requestAnimationFrame(() => {
        fill.style.width = `${Math.max(0, Math.min(100, p))}%`;
      });
    });
    
    if (frame.state === 'COMPLETED' || frame.state === 'RESOLVED') {
      card.classList.add("completed");
      const winner = frame.entries.find(e => e.isWinner);
      if (winner) {
        const sigWin = `${frame.kind}|${frame.title}|${winner.title}`;
        if (sigWin !== lastWinSig) {
          lastWinSig = sigWin;
          burstConfetti();
        }
      }
    } else {
      card.classList.remove("completed");
    }

    lastFrame = frame;
    card.classList.remove("hidden");
  }

  // --- Conexión SSE ---
  function connect() {
    const events = new EventSource("/api/events");
    renderFrame(null);

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        renderFrame(payload);
      } catch (e) { /* Ignorar errores */ }
    };

    events.onerror = () => {
      events.close();
      renderFrame(null);
      setTimeout(connect, 3000);
    };
  }

  connect();
});