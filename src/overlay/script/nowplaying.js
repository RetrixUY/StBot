// Now Playing (solo música) — SSE robusto, marquee y progreso

const root = document.getElementById("nowplaying");
const trackBox = document.getElementById("track");
const artistsEl = document.getElementById("artists");
const coverEl = document.getElementById("cover");
const barFill = document.getElementById("barFill");
const elapsedEl = document.getElementById("elapsed");
const totalEl = document.getElementById("total");

/* Marquee scaffolding */
const trackMain = document.createElement("span");
trackMain.className = "m-text";
const trackClone = document.createElement("span");
trackClone.className = "m-text m-clone";
trackBox.textContent = "";
trackBox.append(trackMain, trackClone);

let baseProgress = 0, durationMs = 0, isPlaying = false, lastUpdateTs = Date.now(), lastSongKey = "";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
};

function updateMarquee(){
  const contentW = trackMain.scrollWidth;
  const containerW = trackBox.clientWidth;
  const needs = contentW > containerW + 2;
  trackBox.classList.toggle("marquee", needs);
  if (needs){
    const GAP = 48, SPEED = 90;
    const loopWidth = contentW + GAP;
    trackBox.style.setProperty("--marquee-content-width", `${contentW}px`);
    trackBox.style.setProperty("--marquee-gap", `${GAP}px`);
    trackBox.style.setProperty("--marquee-duration", `${loopWidth / SPEED}s`);
  }
}
function setTrackText(text){
  const t = (text && String(text).trim()) || "—";
  trackMain.textContent = t; trackClone.textContent = t;
  requestAnimationFrame(() => { updateMarquee(); setTimeout(updateMarquee, 200); });
}
function setNowPlayingVisible(v){ v ? root.classList.add("np-active") : root.classList.remove("np-active"); }

/* Progreso */
function tick(){
  const now = Date.now();
  let prog = baseProgress;
  if (isPlaying) prog += (now - lastUpdateTs);

  if (!Number.isFinite(durationMs) || durationMs <= 0){
    barFill.style.width = "0%"; elapsedEl.textContent = "0:00"; totalEl.textContent = "0:00";
  }else{
    const clamped = Math.max(0, Math.min(prog, durationMs));
    barFill.style.width = `${(clamped / durationMs) * 100}%`;
    elapsedEl.textContent = fmt(clamped);
    totalEl.textContent = fmt(durationMs);
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* SSE con autoreconexión/backoff */
function sseConnect(url, onMessage){
  let es = null, stopped = false, backoff = 1000, max = 5000;
  const connect = () => {
    if (stopped) return;
    try { es = new EventSource(url); } catch { return schedule(true); }
    es.onopen = () => { backoff = 1000; };
    es.onmessage = (ev) => {
      if (ev.data && ev.data !== "ping"){
        try { onMessage(JSON.parse(ev.data), ev); } catch {}
      }
    };
    es.onerror = () => {
      if (es && es.readyState === EventSource.CLOSED) schedule(true);
    };
  };
  function schedule(force=false){
    const d = Math.min(backoff, max) + Math.floor(Math.random()*400);
    backoff = Math.min(backoff*1.7, max);
    setTimeout(() => { if (force && es) try{ es.close(); }catch{}; connect(); }, d);
  }
  connect();
  addEventListener("online", () => { try{ es?.close?.(); }catch{}; backoff = 1000; connect(); });
  return { stop(){ stopped = true; try{ es?.close?.(); }catch{} } };
}

/* Conexión a /api/song/events */
sseConnect("/api/song/events", (s) => {
  const playing = Boolean(s?.isPlaying) && Boolean(s?.track);

  if (!s || !s.track){
    setTrackText(playing ? "Reproduciendo…" : "");
    artistsEl.textContent = ""; coverEl.src = "";
  } else {
    setTrackText(s.track);
    artistsEl.textContent = s.artists || "";
    coverEl.src = s.image || "";
  }

  baseProgress = Number(s?.progressMs ?? 0);
  durationMs   = Number(s?.durationMs ?? 0);
  isPlaying    = Boolean(s?.isPlaying);
  lastUpdateTs = Date.now();

  setNowPlayingVisible(playing);

  const key = (s?.url && s.url.length) ? s.url : `${s?.track||""}|${s?.artists||""}|${s?.durationMs||0}`;
  if (playing && key && key !== lastSongKey){
    root.classList.remove("pulse"); void root.offsetWidth;
    root.classList.add("pulse");
    lastSongKey = key;
  }
});

/* Recalcular marquee al redimensionar la fuente en OBS */
let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(updateMarquee, 120); });
