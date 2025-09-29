import http from "node:http";
import { ChatEventPayload, KickChatMessage } from "./types.js";

const clients = new Set<http.ServerResponse>();

function sseWrite(res: http.ServerResponse, obj: unknown) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

/** Emite un evento genérico a todos los clientes del chat. */
function broadcast(payload: ChatEventPayload) {
  for (const res of clients) {
    try {
      sseWrite(res, payload);
    } catch {
      // El cliente se desconectó
    }
  }
}

/** Emite un nuevo mensaje de chat. */
export function broadcastChatMessage(data: KickChatMessage) {
  broadcast({ type: 'new_message', data });
}

/** Emite un evento para borrar un solo mensaje. */
export function broadcastDeleteOne(msgId: string) {
  broadcast({ type: 'delete_one', data: { msgId } });
}

/** Emite un evento para limpiar todo el chat. */
export function broadcastClearChat() {
  broadcast({ type: 'clear', data: {} });
}

/** Maneja las rutas necesarias para el overlay de chat. */
export function handleChatRoutes(req: http.IncomingMessage, res: http.ServerResponse, baseUrl: string): boolean {
    const u = new URL(req.url ?? "/", baseUrl);

    if (u.pathname === "/api/chat/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });

      clients.add(res);

      const hb = setInterval(() => {
        try { res.write(`: ping ${Date.now()}\n\n`); } catch {}
      }, 15000);

      req.on("close", () => {
        clearInterval(hb);
        clients.delete(res);
      });
      return true;
    }

    return false;
}