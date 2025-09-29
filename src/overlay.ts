import http from "node:http";
import { Poll } from "./models/Poll.js";
import { Prediction } from "./models/Prediction.js";

// El tipo de dato que se enviará al frontend
export type OverlayPayload = {
  kind: 'poll' | 'prediction';
  state: 'COMPLETED' | 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED';
  data: Poll | Prediction;
  ts: number;
};

/* =========================
 * SSE básico
 * ========================= */
const clients = new Set<http.ServerResponse>();
let latestPayload: OverlayPayload | null = null;

function sseWrite(res: http.ServerResponse, obj: unknown) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

/** Emite un nuevo payload a todos los clientes del overlay conectados. */
export function broadcast(payload: Omit<OverlayPayload, 'ts'>) {
  const fullPayload: OverlayPayload = { ...payload, ts: Date.now() };
  latestPayload = fullPayload;

  for (const res of clients) {
    try {
      sseWrite(res, fullPayload);
    } catch {
      // El cliente se desconectó
    }
  }
}

/* =========================
 * Rutas HTTP
 * ========================= */
/** Maneja las rutas necesarias para el overlay SSE. */
export function handleRoutes(req: http.IncomingMessage, res: http.ServerResponse, baseUrl: string): boolean {
    const u = new URL(req.url ?? "/", baseUrl);

    if (u.pathname === "/api/events") { // URL simplificada
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });

      clients.add(res);

      // Enviar estado actual al conectar, solo si no está terminado
      if (latestPayload && latestPayload.state !== 'COMPLETED' && latestPayload.state !== 'RESOLVED' && latestPayload.state !== 'CANCELED') {
        sseWrite(res, latestPayload);
      } else {
        // Si el último estado era finalizado, no enviar nada para un inicio limpio.
        latestPayload = null;
      }

      const hb = setInterval(() => {
        try { res.write(`: ping ${Date.now()}\n\n`); } catch {}
      }, 15000);

      req.on("close", () => {
        clearInterval(hb);
        clients.delete(res);

        // ***** CORRECCIÓN AQUÍ *****
        // Si no quedan clientes conectados, limpiar el último payload.
        // Esto previene que una fuente refrescada reciba un estado antiguo.
        if (clients.size === 0) {
          latestPayload = null;
        }
        // ***** FIN DE LA CORRECCIÓN *****
      });
      return true;
    }

    return false;
}