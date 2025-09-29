// src/printer/utils.ts
import { logger } from '../logger.js';

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const fmtDateTime = () => new Date().toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });

export async function getKickAvatar(username: string): Promise<string | null> {
  if (!username) return null;
  const u = String(username).trim().toLowerCase();
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(u)}`);
    if (res.ok) {
      const data = await res.json();
      return data?.user?.profile_pic ?? null;
    }
  } catch (error) {
    logger.error(error, `[Printer] (util) Falló al obtener el avatar de Kick para ${username}`);
  }
  return null;
}