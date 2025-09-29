// Toast Alerts (solo alertas) — SSE + prioridad + reconexión

const root = document.getElementById("alerts");

const TOAST_H = 40;
const TOAST_G = 14;
const TOAST_MAX = 7;
const HOLD_DEFAULT = 3500;

const toasts = [];
const queue = [];

const TOAST_CFG = {
  follow: { priority: 10,  preemptible: true,  hold: 3000 },
  raid:   { priority: 80,  preemptible: false, hold: 7000 },
  sub:    { priority: 100, preemptible: false, hold: 7000 },
  subGift:{ priority: 100, preemptible: false, hold: 8000 },
  subGiftMultiple:{ priority: 120, preemptible: false, hold: 10000 },
  bits:   { priority: 80,  preemptible: false, hold: 7000 },
  custom: { priority: 50,  preemptible: true,  hold: 10000 },
  default:{ priority: 1,   preemptible: true,  hold: HOLD_DEFAULT },
};

// ***** NUEVA FUNCIÓN PARA REPRODUCIR SONIDOS *****
function playSound(type) {
  const sound = document.getElementById(`sfx-${type}`);
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.error("Error al reproducir sonido:", e.message));
  }
}
// *************************************************

function renderAlert(a){
  let text = "", message = "";
  switch(a?.type){
    case "follow": text = `[b]${a.payload.user}[/b] siguió`; break;
    case "raid":   text = `[b]${a.payload.raider}[/b] raideó con [b]${a.payload.viewers}[/b] viewers`; break;
    case "sub":    text = `[b]${a.payload.user}[/b] se suscribió${a.payload.months ? (' por [b]'+a.payload.months+' meses[/b]') : ''}`; break;
    case "subGift": text = `[b]${a.payload.user}[/b] regaló una sub a [b]${a.payload.recipient}[/b]`; break;
    case "subGiftMultiple": text = `[b]${a.payload.user}[/b] regaló [b]${a.payload.quantity}[/b] subs`; break;
    case "bits": text = `[b]${a.payload.user}[/b] envió [b]${a.payload.amount}[/b] kicks`; message = a.payload?.message ?? ""; break;
    case "custom": text = `Alerta: [b]${a.payload.name}[/b]`; message = a.payload?.message ?? ""; break;
    default: text = `Evento: ${JSON.stringify(a)}`;
  }
  return { text: text.trim(), message: (message && String(message).trim()) || undefined, type: a?.type || "default" };
}

function renderRichText(el, text){
  el.textContent = "";
  if (!text) return;
  let i = 0, open = "[b]", close = "[/b]";
  while (i < text.length){
    const s = text.indexOf(open, i);
    if (s === -1){ el.append(document.createTextNode(text.slice(i))); break; }
    if (s > i) el.append(document.createTextNode(text.slice(i, s)));
    const e = text.indexOf(close, s + open.length);
    if (e === -1){ el.append(document.createTextNode(text.slice(s))); break; }
    const strong = document.createElement("span"); strong.style.fontWeight = "900";
    strong.textContent = text.slice(s + open.length, e); el.append(strong);
    i = e + close.length;
  }
}

function createToastEl(text, type, message){
  const div = document.createElement("div"); div.className = `toast toast--${type || "default"}`;
  const title = document.createElement("div"); title.className = "toast__title"; renderRichText(title, text); div.appendChild(title);
  if (message && String(message).trim()){ const msg = document.createElement("div"); msg.className = "toast__message"; msg.textContent = String(message); div.appendChild(msg); div.classList.add("toast--hasmsg"); }
  return div;
}

function layout(){
  let y = 0;
  for (const t of toasts){
    t.el.style.top = `${y}px`;
    const h = t.el.offsetHeight || TOAST_H;
    y += h + TOAST_G;
  }
}

function leave(t){
  if (!t || t.leaving) return;
  t.leaving = true;
  t.el.classList.add("leave");
  t.el.addEventListener("animationend", () => {
    const i = toasts.indexOf(t);
    if (i >= 0) toasts.splice(i, 1);
    t.el.remove(); layout(); dequeue();
  }, { once:true });
}
function forceLeave(t){ if (!t || t.leaving) return; try{ clearTimeout(t.timer); }catch{}; leave(t); }

function pushToast({ text, type, message }){
  const cfg = TOAST_CFG[type] || TOAST_CFG.default;
  const el = createToastEl(text, type, message);
  root.prepend(el);
  const obj = { el, type: type||"default", priority: cfg.priority, preemptible: cfg.preemptible, timer: null, leaving: false };
  toasts.unshift(obj);
  
  // ***** CAMBIO AQUÍ: Reproducir el sonido al mostrar la alerta *****
  playSound(type);
  // **************************************************************

  layout();
  requestAnimationFrame(() => el.classList.add("enter"));
  obj.timer = setTimeout(() => leave(obj), cfg.hold ?? HOLD_DEFAULT);
}

function dequeue(){
  while (queue.length && toasts.length < TOAST_MAX) {
    pushToast(queue.shift());
  }
}

function showToast(text, type="default", message){
  const cfg = TOAST_CFG[type] || TOAST_CFG.default;
  if (toasts.length < TOAST_MAX) return pushToast({ text, type, message });
  for (let i = toasts.length - 1; i >= 0; i--){
    const t = toasts[i];
    if (t.preemptible && !t.leaving && cfg.priority > t.priority){
      forceLeave(t); return pushToast({ text, type, message });
    }
  }
  if (cfg.priority >= 100 && toasts.length){
    const oldest = toasts[toasts.length - 1];
    if (oldest && !oldest.leaving){ forceLeave(oldest); return pushToast({ text, type, message }); }
  }
  queue.push({ text, type, message });
}

/* SSE con reconexión */
function sseConnect(url, onMessage){
  let es=null, stopped=false, backoff=1000, max=5000;
  const connect=()=>{
    if (stopped) return;
    try{ es=new EventSource(url); }catch{ return schedule(true); }
    es.onopen=()=>{ backoff=1000; };
    es.onmessage=(ev)=>{ if (ev.data && ev.data!=="ping"){ try{ onMessage(JSON.parse(ev.data)); }catch{} } };
    es.onerror=()=>{ if (es && es.readyState===EventSource.CLOSED) schedule(true); };
  };
  function schedule(force=false){
    const d=Math.min(backoff,max)+Math.floor(Math.random()*400);
    backoff=Math.min(backoff*1.7,max);
    setTimeout(()=>{ if(force&&es)try{es.close();}catch{}; connect(); }, d);
  }
  connect();
  addEventListener("online", ()=>{ try{ es?.close?.(); }catch{}; backoff=1000; connect(); });
  return { stop(){ stopped=true; try{ es?.close?.(); }catch{} } };
}

sseConnect("/api/alerts/events", (a) => {
  if (a?.type === "hello" || a?.type === "ping") return;
  const r = renderAlert(a);
  showToast(r.text, r.type, r.message);
});