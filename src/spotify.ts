import fs from "node:fs/promises";
import http from "node:http";
import { Buffer } from "node:buffer";
import { cfg } from "./config.js";
import { logger } from "./logger.js"; // <-- 1. Importa el logger

/* =========================
 *         Tipos
 * ========================= */
export interface Tokens {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number; // ms epoch
}

export interface CurrentSong {
  isPlaying: boolean;
  progressMs?: number;
  durationMs?: number;
  track: string;
  artists: string;
  album: string;
  url: string;
  image: string;
  explicit?: boolean;
  deviceName?: string;
  playingType?: string;
  uri?: string;
  ts: number; // ms epoch
}

/* Song Requests */
export type SongRequestInput = {
  input: string;          // texto a buscar, URL https, o spotify:track:...
  requester?: string;
  note?: string;
};
export type SongRequest = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  durationMs: number;
  explicit: boolean;
  requestedBy?: string;
  note?: string;
  ts: number;
  status: "queued" | "enqueued" | "rejected" | "played" | "skipped";
  reason?: string;
};

/* =========================
 *     Constantes/Utils
 * ========================= */
const TOKENS_FILE = "./.spotify-token.json";
/** Scopes: agregamos user-modify-playback-state para encolar/saltar */
const SCOPE =
  "user-read-currently-playing user-read-playback-state user-modify-playback-state";

const b64 = (s: string) => Buffer.from(s).toString("base64");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* =========================
 *  Estado de canción + SSE
 * ========================= */
let current: CurrentSong = {
  isPlaying: false,
  track: "",
  artists: "",
  album: "",
  url: "",
  image: "",
  ts: 0,
};

const sseClients = new Set<http.ServerResponse>();
let seq = 0;

export const SpotifyState = {
  get: () => current,
  addClient: (res: http.ServerResponse) => sseClients.add(res),
  removeClient: (res: http.ServerResponse) => sseClients.delete(res),
  broadcast: (obj: unknown) => {
    const id = ++seq + "-" + Date.now();
    const line = `id: ${id}\nevent: message\ndata: ${JSON.stringify(obj)}\n\n`;
    for (const res of sseClients) {
      try {
        res.write(line);
      } catch { }
    }
  },
};

/* =========================
 *       Token handling
 * ========================= */
async function loadTokens(): Promise<Tokens> {
  try {
    return JSON.parse(await fs.readFile(TOKENS_FILE, "utf8")) as Tokens;
  } catch {
    return { access_token: null, refresh_token: null, expires_at: 0 };
  }
}

async function saveTokens(t: Tokens) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(t, null, 2), "utf8");
}

async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.spotify.redirectUri,
  }).toString();

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${b64(`${cfg.spotify.clientId}:${cfg.spotify.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshAccessToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
  }).toString();

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${b64(`${cfg.spotify.clientId}:${cfg.spotify.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  return res.json();
}

async function getValidAccessToken(): Promise<string> {
  let t = await loadTokens();
  const now = Date.now();

  if (!t.access_token || now >= t.expires_at) {
    if (!t.refresh_token) throw new Error("No refresh_token. Ir a /auth primero.");
    const r = await refreshAccessToken(t.refresh_token);
    t.access_token = r.access_token;
    if (r.refresh_token) t.refresh_token = r.refresh_token;
    t.expires_at = now + (Number(r.expires_in ?? 3600) - 30) * 1000;
    await saveTokens(t);
  }

  return t.access_token!;
}

/* =========================
 *   Helper: Spotify API
 *   (robusto para no-JSON)
 * ========================= */
async function spotifyApi(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  opts: { query?: Record<string, string>; body?: any } = {}
) {
  const token = await getValidAccessToken();
  const url = new URL("https://api.spotify.com" + path);
  if (opts.query) for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const { status, ok } = res;
  const ct = res.headers.get("content-type") || "";

  // Respuestas sin cuerpo (cola/next suelen devolver 204)
  if (status === 204 || status === 202 || status === 205) return null;

  let body: any = null;
  if (ct.includes("application/json")) {
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => "");
    }
  } else {
    body = await res.text().catch(() => "");
  }

  if (!ok) {
    const snippet = typeof body === "string" ? body.slice(0, 300) : JSON.stringify(body);
    throw new Error(`Spotify ${status}: ${snippet || res.statusText}`);
  }

  return (body === "" || body == null) ? null : body;
}

async function getActiveDeviceId(): Promise<string | null> {
  const j = await spotifyApi("GET", "/v1/me/player/devices");
  const active = j?.devices?.find((d: any) => d.is_active) || j?.devices?.[0];
  return active?.id ?? null;
}

/* =========================
 *  Currently Playing fetch
 * ========================= */
async function fetchCurrentlyPlaying(access_token: string): Promise<CurrentSong> {
  const res = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing?market=from_token",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (res.status === 204) {
    return {
      isPlaying: false,
      track: "",
      artists: "",
      album: "",
      url: "",
      image: "",
      ts: Date.now(),
    };
  }

  if (res.status === 200) {
    // Defensa por si devuelve no-JSON corrupto
    let j: any;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { j = await res.json(); }
      catch { j = null; }
    } else {
      j = null;
    }
    if (!j || !j.item) {
      return {
        isPlaying: false,
        track: "",
        artists: "",
        album: "",
        url: "",
        image: "",
        ts: Date.now(),
      };
    }

    const t = j.item;
    const artists = (t?.artists ?? []).map((a: any) => a.name).join(", ");

    return {
      isPlaying: !!j.is_playing,
      progressMs: j.progress_ms ?? 0,
      durationMs: t?.duration_ms ?? 0,
      track: t?.name ?? "",
      artists,
      album: t?.album?.name ?? "",
      url: t?.external_urls?.spotify ?? "",
      image: t?.album?.images?.[0]?.url ?? "",
      explicit: !!t?.explicit,
      deviceName: j?.device?.name ?? "",
      playingType: j?.currently_playing_type ?? "",
      uri: t?.uri ?? undefined,
      ts: Date.now(),
    };
  }

  throw new Error(`Spotify ${res.status}: ${await res.text()}`);
}

/* =========================
 *  SONG REQUESTS (cola)
 * ========================= */
const SR_CONFIG = {
  MAX_QUEUE: 50,
  MAX_HISTORY: 200,
  MAX_DUPLICATES_WINDOW_MS: 60 * 60 * 1000, // 1h
  PER_USER_COOLDOWN_MS: 0 * 1000,          // 60s
  MAX_DURATION_MS: 10 * 60 * 1000,          // 10m
  ALLOW_EXPLICIT: true,
};

const srPending: SongRequest[] = [];
const srHistory: SongRequest[] = [];
const srLastByUser = new Map<string, number>();
const srLastPlayedByUri = new Map<string, number>();

let srSeq = 0;
const makeSrId = () => `${Date.now().toString(36)}-${(++srSeq).toString(36)}`;

/* SSE para cola de SR (opcional para paneles) */
const srSseClients = new Set<http.ServerResponse>();
function srBroadcast(obj: unknown) {
  const id = (++srSeq) + "-" + Date.now();
  const frame = `id: ${id}\nevent: message\ndata: ${JSON.stringify(obj)}\n\n`;
  for (const r of srSseClients) { try { r.write(frame); } catch { } }
}
function srSnapshot() {
  return { queue: listSongRequests(), history: listSongHistory(), ts: Date.now() };
}

function parseTrackIdFromUrlOrUri(input: string): string | null {
  input = input.trim();
  if (input.startsWith("spotify:track:")) return input.split(":")[2] || null;
  try {
    const u = new URL(input);
    if (u.hostname.includes("open.spotify.com") && u.pathname.startsWith("/track/")) {
      const id = u.pathname.split("/")[2];
      return id || null;
    }
  } catch { }
  return null;
}

function normalizeTrack(item: any) {
  const artists = Array.isArray(item?.artists) ? item.artists.map((a: any) => a.name).join(", ") : "";
  return {
    id: item?.id as string,
    uri: item?.uri as string,
    name: item?.name as string,
    artists,
    durationMs: Number(item?.duration_ms ?? 0),
    explicit: Boolean(item?.explicit),
  };
}

async function searchTrack(q: string) {
  const json = await spotifyApi("GET", "/v1/search", { query: { q, type: "track", limit: "1" } });
  const item = json?.tracks?.items?.[0];
  if (!item) return null;
  return normalizeTrack(item);
}

async function resolveInputToTrack(input: string) {
  const directId = parseTrackIdFromUrlOrUri(input);
  if (directId) {
    const t = await spotifyApi("GET", `/v1/tracks/${directId}`);
    if (!t?.id) throw new Error("No se encontró el track por ID.");
    return normalizeTrack(t);
  }
  const found = await searchTrack(input);
  if (!found) throw new Error("No se encontró ningún track para esa búsqueda.");
  return found;
}

function validateTrackForQueue(
  t: ReturnType<typeof normalizeTrack>,
  requester?: string
) {
  if (!SR_CONFIG.ALLOW_EXPLICIT && t.explicit) throw new Error("El tema es explícito y no está permitido.");
  if (t.durationMs > SR_CONFIG.MAX_DURATION_MS) throw new Error("El tema excede la duración máxima permitida.");

  const lastTs = srLastPlayedByUri.get(t.uri);
  if (lastTs && Date.now() - lastTs < SR_CONFIG.MAX_DUPLICATES_WINDOW_MS) {
    throw new Error("Ese tema ya sonó recientemente.");
  }
  if (requester) {
    const last = srLastByUser.get(requester);
    if (last && Date.now() - last < SR_CONFIG.PER_USER_COOLDOWN_MS) {
      const rest = Math.ceil((SR_CONFIG.PER_USER_COOLDOWN_MS - (Date.now() - last)) / 1000);
      throw new Error(`Cooldown activo. Podés pedir otro tema en ${rest}s.`);
    }
  }
  if (srPending.length >= SR_CONFIG.MAX_QUEUE) throw new Error("La cola está llena en este momento.");
}

async function enqueueInSpotify(uri: string) {
  const deviceId = await getActiveDeviceId();
  if (!deviceId) throw new Error("No hay ningún dispositivo activo de Spotify.");
  await spotifyApi("POST", "/v1/me/player/queue", { query: { uri, device_id: deviceId } });
}

export function extractTrackId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();

  // URI
  const mUri = s.match(/^spotify:track:([A-Za-z0-9]{22})$/i);
  if (mUri) return mUri[1];

  // URL
  try {
    const u = new URL(s);
    // /intl-xx/ o /embed/ pueden estar presentes
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0]?.toLowerCase().startsWith("intl-")) parts.shift();
    if (parts[0]?.toLowerCase() === "embed") parts.shift();
    const ix = parts.findIndex((p) => p.toLowerCase() === "track");
    if (ix >= 0 && parts[ix + 1]) {
      const id = parts[ix + 1].replace(/[?#].*$/, "");
      if (/^[A-Za-z0-9]{22}$/.test(id)) return id;
    }
  } catch {
    // no es URL válida → seguimos abajo
  }

  // Fallback regex por si viene embebida en un string más grande
  const m = s.match(/(?:^|\/)(?:embed\/)?track\/([A-Za-z0-9]{22})(?:[/?#]|$)/i);
  return m ? m[1] : null;
}

/** Resuelve shortlinks (spotify.link) y luego reintenta extractTrackId. */
export async function resolveAndExtractTrackId(input: string): Promise<string | null> {
  if (!input) return null;
  const s = input.trim();

  // Si ya podemos extraer, listo
  const direct = extractTrackId(s);
  if (direct) return direct;

  // Si es shortlink, seguimos redirección
  try {
    const u = new URL(s);
    if (/(^|\.)spotify\.link$/i.test(u.hostname)) {
      const r = await fetch(s, { method: "GET", redirect: "follow" });
      return extractTrackId(r.url || s);
    }
  } catch {
    /* ignoramos, no era URL */
  }

  return null;
}

export async function addSongRequest(payload: SongRequestInput): Promise<SongRequest> {
  if (!payload?.input || !payload.input.trim()) throw new Error("Falta el `input` (uri/URL o texto).");
  const track = await resolveInputToTrack(payload.input);
  validateTrackForQueue(track, payload.requester);

  const req: SongRequest = {
    id: makeSrId(),
    uri: track.uri,
    name: track.name,
    artists: track.artists,
    durationMs: track.durationMs,
    explicit: track.explicit,
    requestedBy: payload.requester,
    note: payload.note,
    ts: Date.now(),
    status: "queued",
  };

  // Encola en Spotify (queda después del track actual)
  await enqueueInSpotify(req.uri);
  req.status = "enqueued";

  srPending.push(req);
  srLastByUser.set(payload.requester || "anon", Date.now());
  if (srPending.length > SR_CONFIG.MAX_QUEUE) srPending.shift();

  // Aviso SSE para paneles
  srBroadcast({ type: "enqueued", request: req, snapshot: srSnapshot() });

  return req;
}

export function listSongRequests(): SongRequest[] {
  return [...srPending];
}
export function listSongHistory(): SongRequest[] {
  return [...srHistory].slice(-SR_CONFIG.MAX_HISTORY);
}

export async function skipCurrent() {
  await spotifyApi("POST", "/v1/me/player/next");
  srBroadcast({ type: "skip" });
}

export async function handleSongRequestEvent(ev: { query: string; user?: string; note?: string }) {
  const id = await resolveAndExtractTrackId(ev.query);
  if (id) return addSongRequest({ input: 'spotify:track:' + id, requester: ev.user, note: ev.note });

  // 2) No era URL/URI → tomar como query
  const q = ev.query.trim();
  if (!q) throw Error('Falta el `input` (uri/URL o texto).');
  return addSongRequest({ input: q, requester: ev.user, note: ev.note });
}

/* =========================
 *        Loop Spotify
 * ========================= */
export async function startSpotifyLoop() {
  // 2. Reemplaza console.log
  logger.info("[spotify] /auth → autoriza tu cuenta (una vez)");
  let lastId = "";
  let lastLogUrl = "";
  let lastUri: string | undefined;

  while (true) {
    try {
      const token = await getValidAccessToken();
      const now = await fetchCurrentlyPlaying(token);

      const id = now.url
        ? `${now.url}:${Math.floor((now.progressMs ?? 0) / 10000)}:${now.isPlaying}`
        : `stop:${now.isPlaying}`;

      if (id !== lastId) {
        if (lastUri && lastUri !== now.uri) {
          srLastPlayedByUri.set(lastUri, Date.now());
          const idx = srPending.findIndex(r =>
            r.uri === lastUri && (r.status === "enqueued" || r.status === "queued")
          );
          if (idx >= 0) {
            const played = srPending.splice(idx, 1)[0];
            played.status = "played";
            played.ts = Date.now();
            srHistory.push(played);
            if (srHistory.length > SR_CONFIG.MAX_HISTORY) srHistory.shift();
            srBroadcast({ type: "played", request: played, snapshot: srSnapshot() });
          } else {
            srBroadcast({ type: "played_external", uri: lastUri, snapshot: srSnapshot() });
          }
        }

        lastId = id;
        lastUri = now.uri;
        current = now;
        SpotifyState.broadcast(current);

        if (now.url && now.url !== lastLogUrl) {
          lastLogUrl = now.url;
          // 3. Reemplaza console.log
          logger.info(`[spotify] ${now.artists} — ${now.track}`);
        }
      }
    } catch (e: any) {
      // 4. Reemplaza console.error
      logger.error(`[spotify] error: ${e?.message ?? e}`);
      lastId = ""; // fuerza envío al recuperarse
    }
    await sleep(cfg.spotify.pollMs);
  }
}

/* =========================
 *          Rutas
 * ========================= */
export function handleSpotifyRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  baseUrl: string
): boolean {
  const u = new URL(req.url ?? "/", baseUrl);

  /* --- OAuth --- */
  if (u.pathname === "/auth") {
    const auth = new URL("https://accounts.spotify.com/authorize");
    auth.searchParams.set("client_id", cfg.spotify.clientId);
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("redirect_uri", cfg.spotify.redirectUri);
    auth.searchParams.set("scope", SCOPE);
    res.statusCode = 302;
    res.setHeader("Location", auth.toString());
    res.end();
    return true;
  }

  if (u.pathname === "/callback") {
    const code = u.searchParams.get("code");
    if (!code) {
      res.statusCode = 400;
      res.end("Missing code");
      return true;
    }
    exchangeCodeForTokens(code)
      .then(async (tokenRes) => {
        const tokens: Tokens = {
          access_token: tokenRes.access_token,
          refresh_token: tokenRes.refresh_token,
          expires_at: Date.now() + (Number(tokenRes.expires_in ?? 3600) - 30) * 1000,
        };
        await saveTokens(tokens);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end("<h3>¡Listo! Ya podés cerrar esta pestaña.</h3>");
      })
      .catch((e) => {
        res.statusCode = 500;
        res.end(`Auth error: ${e?.message ?? "unknown"}`);
      });
    return true;
  }

  /* --- Estado actual (JSON) --- */
  if (u.pathname === "/api/song" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(SpotifyState.get()));
    return true;
  }

  /* --- Estado actual (SSE) --- */
  if (u.pathname === "/api/song/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    res.write("retry: 2000\n"); // sugerencia de backoff
    SpotifyState.addClient(res);

    // Estado inicial
    const init = SpotifyState.get();
    res.write(`id: ${init.ts || Date.now()}\n`);
    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify(init)}\n\n`);

    // Heartbeat
    const hb = setInterval(() => {
      try { res.write(`: hb ${Date.now()}\n\n`); } catch { }
    }, 15000);

    req.on("close", () => {
      clearInterval(hb);
      SpotifyState.removeClient(res);
    });
    return true;
  }

  /* --- SONG REQUESTS: CORS preflight simple --- */
  if (u.pathname.startsWith("/api/song-requests") && req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return true;
  }

  /* --- SONG REQUESTS: encolar --- */
  if (u.pathname === "/api/song-requests" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const json = JSON.parse(body || "{}");
        const created = await addSongRequest({
          input: String(json.input ?? ""),
          requester: json.requester ? String(json.requester) : undefined,
          note: json.note ? String(json.note) : undefined,
        });
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: true, request: created }));
      } catch (e: any) {
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: false, error: e?.message || "Bad Request" }));
      }
    });
    return true;
  }

  /* --- SONG REQUESTS: listar --- */
  if (u.pathname === "/api/song-requests" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ ok: true, queue: listSongRequests(), history: listSongHistory() }));
    return true;
  }

  /* --- SONG REQUESTS: skip --- */
  if (u.pathname === "/api/song-requests/skip" && req.method === "POST") {
    skipCurrent()
      .then(() => {
        res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
        res.end();
      })
      .catch((e) => {
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ ok: false, error: e?.message || "No se pudo saltar" }));
      });
    return true;
  }

  /* --- SONG REQUESTS: SSE (panel/overlay) --- */
  if (u.pathname === "/api/song-requests/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });
    res.write("retry: 2000\n");

    srSseClients.add(res);

    // snapshot inicial
    res.write(`id: ${Date.now()}\n`);
    res.write(`data: ${JSON.stringify({ type: "snapshot", ...srSnapshot() })}\n\n`);

    const hb = setInterval(() => {
      try { res.write(`: ping ${Date.now()}\n\n`); } catch { }
    }, 15000);

    req.on("close", () => {
      clearInterval(hb);
      srSseClients.delete(res);
    });
    return true;
  }

  return false;
}
