import http from "node:http";

/**
 * Strongly-typed map of alert payloads by event type.
 * Extend this map to add new alert types.
 */
type AlertPayloads = {
  follow: { user: string };
  raid: { raider: string; viewers: number };
  sub: { user: string, months?: number };
  subGift: { user: string, recipient: string };
  subGiftMultiple: { user: string, quantity: number };
  bits: { user: string, amount: number, message?: string };
  hello: Record<string, never>; // no payload content, but keeps consistent envelope
};

/**
 * Discriminated union for known alerts: always { type, payload }.
 * - Additions should be made in AlertPayloads.
 * - "custom" remains flexible and carries a top-level name plus optional payload.
 */
export type AlertEvent =
  | {
      [K in keyof AlertPayloads]: {
        type: K;
        payload: AlertPayloads[K];
      };
    }[keyof AlertPayloads]
  | { type: "custom"; name: string; payload?: any };

// Conjunto de clientes SSE conectados
const clients = new Set<http.ServerResponse>();
// Heartbeats para cada conexión (para limpiar al cerrar)
const heartbeats = new Map<http.ServerResponse, NodeJS.Timeout>();

// Secuencia para IDs de eventos (ayuda a evitar bucles de reconexión)
let seq = 0;

function safeWrite(res: http.ServerResponse, chunk: string) {
  try {
    res.write(chunk);
  } catch {
    // Si escribir falla, el "close" limpiará el cliente.
  }
}

export const Alerts = {
  /** Envía un evento a TODOS los clientes conectados (follow/raid/sub/custom/hello). */
  send(event: AlertEvent) {
    const id = `${++seq}-${Date.now()}`;
    const frame =
      `id: ${id}\n` + // ID del evento (permite Last-Event-ID del lado cliente)
      // `event: message\n` +    // (opcional) por defecto ya es "message"
      `data: ${JSON.stringify(event)}\n\n`;

    for (const res of clients) {
      safeWrite(res, frame);
    }
  },

  /** Maneja la ruta SSE de alertas: /api/alerts/events */
  handleRoutes(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    baseUrl: string
  ): boolean {
    const u = new URL(req.url ?? "/", baseUrl);

    if (u.pathname === "/api/alerts/events") {
      // Cabeceras SSE
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        // Sugerencia útil si hay Nginx/Cloudflare delante
        "X-Accel-Buffering": "no",
      });

      // Sugerencia de backoff de reconexión para EventSource (ms)
      safeWrite(res, "retry: 2000\n");

      // Registrar cliente
      clients.add(res);

      // Saludo inicial (para que el front sepa que está "ready")
      const hello: AlertEvent = { type: "hello", payload: {} };
      const helloId = `${++seq}-${Date.now()}`;
      safeWrite(res, `id: ${helloId}\n` + `data: ${JSON.stringify(hello)}\n\n`);

      // Heartbeat cada 15s (comentario SSE, no llega a onmessage)
      const hb = setInterval(() => {
        safeWrite(res, `: ping ${Date.now()}\n\n`);
      }, 15000);
      heartbeats.set(res, hb);

      // Limpieza al cerrar
      req.on("close", () => {
        clearInterval(hb);
        heartbeats.delete(res);
        clients.delete(res);
      });

      return true;
    }

    return false;
  },
};