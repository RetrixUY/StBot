// src/http.ts
import http from "node:http";
import { cfg } from "./config.js";
import { handleSpotifyRoutes } from "./spotify.js";
import { Alerts } from "./alerts.js";
import { serveOverlayStatic } from "./overlay/static-server.js";
import { handleRoutes as handleOverlayRoutes } from "./overlay.js";
import { handleChatRoutes } from "./chat.js";
import { logger } from "./logger.js"; // <-- 1. Importa el logger

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const base = `http://localhost:${cfg.port}`;

    if (handleSpotifyRoutes(req, res, base)) return;
    if (Alerts.handleRoutes(req, res, base)) return;
    if (handleOverlayRoutes(req, res, base)) return;
    if (handleChatRoutes(req, res, base)) return;

    if (await serveOverlayStatic(req, res, base)) return;

    if (req.url === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, ts: Date.now() }));
      return;
    }

    res.statusCode = 404;
    res.end("Not Found");
  });

  server.listen(cfg.port, () => {
    // 2. Reemplaza console.log con logger.info
    logger.info(`[http] Servidor escuchando en http://localhost:${cfg.port}`);
    logger.info(`[http] API: /api/song, /api/song/events, /api/alerts/events, /api/events, /api/chat/events`);
    logger.info(`[http] Overlay static: /overlay (index.html, css, js…)`);
  });

  return server;
}