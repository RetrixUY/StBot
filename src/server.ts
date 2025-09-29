// src/server.ts
import "dotenv/config";
import { execSync } from "child_process"; // <-- 1. Importa el módulo necesario
import { startHttpServer } from "./http.js";
import { startSpotifyLoop } from "./spotify.js";
import { startStreamerBot } from "./streamerbot/client.js";
import { logger } from "./logger.js";

/**
 * Entry-point: inicia HTTP + Spotify + Streamer.bot
 * Todo corre en el mismo proceso.
 */
async function main() {
  // 2. Solución de código para arreglar la codificación en Windows
  try {
    if (process.platform === "win32") {
      execSync("chcp 65001");
      logger.info("[core] Página de códigos de Windows establecida a UTF-8.");
    }
  } catch (error) {
    logger.warn("[core] No se pudo establecer la página de códigos. Puede que los emojis no se vean bien.");
  }

  startHttpServer();
  void startSpotifyLoop();
  await startStreamerBot();

  logger.info("[core] todo iniciado ✅");
}

/** ==== Manejo de fallas globales / shutdown prolijo ==== */
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "[core] UnhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.error(err, "[core] UncaughtException");
});

// Cierre limpio
function shutdown(signal: string) {
  logger.warn(`\n[core] ${signal} recibido, cerrando...`);
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((e) => {
  logger.fatal(e, "[core] fatal error on startup");
  process.exit(1);
});