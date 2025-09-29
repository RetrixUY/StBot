import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// 👉 PUBLICA la carpeta *dentro de src*: src/overlay/
const PUBLIC_DIR = path.resolve(__dirname); // este archivo YA está en src/overlay

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

export async function serveOverlayStatic(req: any, res: any, baseUrl: string): Promise<boolean> {
  const u = new URL(req.url ?? "/", baseUrl);

  // Publicamos la carpeta “/overlay/*”
  if (!u.pathname.startsWith("/overlay")) return false;

  let rel = u.pathname.replace(/^\/overlay\/?/, "");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const filePath = path.resolve(PUBLIC_DIR, rel);

  // Anti path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] ?? "application/octet-stream");
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not Found");
  }
  return true;
}
