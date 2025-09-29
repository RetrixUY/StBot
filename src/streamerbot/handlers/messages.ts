import { broadcastChatMessage, broadcastClearChat, broadcastDeleteOne } from "../../chat.js";
import { logger } from "../../logger.js";
import { KickChatMessage, KickChatMessageDeleted, KickChatMessageDeletedOne } from "../../types.js";
import { Context } from "../context.js";

export async function onKickChatMessage(_ctx: Context, args: KickChatMessage) {
  // Simplemente reenviamos los datos del mensaje al overlay de chat
  if (args.user != 'RetrixBOT') logger.info(`[SB] (chat) mensaje de ${args.user}: ${args.message}`);
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