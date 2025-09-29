// src/streamerbot/client.ts
import { StreamerbotClient } from "@streamerbot/client";
import { dispatch } from "./registry.js";
import { Context } from "./context.js";
import { CodeEvent } from "../types.js";
import { logger } from "../logger.js"; // Use the global logger

const HOST = process.env.SB_HOST ?? "127.0.0.1";
const PORT = Number(process.env.SB_PORT ?? 8080);
const PASSWORD = process.env.SB_PASSWORD ?? "";
const RETRY_DELAY = 10000;

export function startStreamerBot() {
  const ctx = new Context(null);

  const connect = () => {
    logger.info(`[SB] Intentando conectar a ws://${HOST}:${PORT}/ ...`);

    const client = new StreamerbotClient({
      host: HOST,
      port: PORT,
      password: PASSWORD || undefined,
      endpoint: "/",
      subscribe: { Custom: ["CodeEvent"] },
      autoReconnect: false,
      logLevel: 'none',

      onConnect: () => {
        logger.info(`[SB] Conectado exitosamente a Streamer.bot.`);
        ctx.client = client;
      },
      
      onDisconnect: () => {
        logger.warn(`[SB] Conexión fallida o cerrada. Reintentando en ${RETRY_DELAY / 1000} segundos...`);
        ctx.client = null;
        setTimeout(connect, RETRY_DELAY);
      },

      onError: (error) => {
        // This callback is intentionally left empty to avoid duplicate log messages,
        // as onDisconnect will handle the logging.
      }
    });

    // **THE FIX IS HERE**
    // The event listener is moved out of onConnect and attached directly to the client.
    // This ensures it's only added ONCE per client instance.
    client.on("Custom.CodeEvent", ({ data }) => {
      const evt = data as CodeEvent;
      if ((evt as any).args?.eventSource !== "kick") return;
      dispatch(ctx, evt.eventName, evt.args);
    });
  };

  // Start the first connection attempt
  connect();
}