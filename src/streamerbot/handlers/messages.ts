import { Alerts } from "../../alerts.js";
import { broadcastChatMessage, broadcastClearChat, broadcastDeleteOne } from "../../chat.js";
import { logger } from "../../logger.js";
import { KickChatMessage, KickChatMessageDeleted, KickChatMessageDeletedOne } from "../../types.js";
import { Context } from "../context.js";
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function onKickChatMessage(_ctx: Context, args: KickChatMessage) {
  // Simplemente reenviamos los datos del mensaje al overlay de chat
  if (args.user != 'RetrixBOT') logger.info(`[SB] (chat) mensaje de ${args.user}: ${args.message}`);
  Alerts.send({ type: 'follow', payload: { user: 'RetrixUY 1' } })
    await delay(2000);
    Alerts.send({ type: 'bits', payload: { user: 'RetrixUY', amount: 100, message: 'Hola' } });
    await delay(2000);
    Alerts.send({ type: "raid", payload: { raider: 'xQc', viewers: 7500 } });
    await delay(2000);
    Alerts.send({ type: "sub", payload: { user: 'RetrixUY' } });
    await delay(2000);
    Alerts.send({ type: "sub", payload: { user: 'RetrixUY', months: 2 } });
    await delay(2000);
    Alerts.send({ type: "subGift", payload: { user: 'RetrixUY', recipient: 'josuerte' } });
    await delay(2000);
    Alerts.send({ type: "subGiftMultiple", payload: { user: 'RetrixUY', quantity: 10 } });
    await delay(2000);
  broadcastChatMessage(args);
}

export function onKickChatMessageDeleted(_ctx: Context, args: KickChatMessageDeleted) {
  // Comprobamos si el objeto 'args' tiene la propiedad 'msgId'.
  // Según tu 'types.ts', solo KickChatMessageDeletedOne tiene msgId.
  if ('msgId' in args) {
    const event = args as KickChatMessageDeletedOne;
    logger.info(`[SB] (chat) Mensaje Borrado con Id: ${event.msgId} de: ${event.user} con contenido ${event.message}`);
    // Enviamos solo el ID del mensaje que se debe borrar.
    broadcastDeleteOne(event.msgId);
  } else {
    // Si no tiene msgId, es un evento para limpiar todo el chat.
    logger.warn(`[SB] (chat) Chat borrado`);
    broadcastClearChat();
  }
}