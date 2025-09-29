import { Context } from "./context.js";
import { onPredictionCancelled, onPredictionCreated, onPredictionLocked, onPredictionResolved, onPredictionUpdated } from "./handlers/predictions.js";
import { onPollCancelled, onPollCompleted, onPollCreated, onPollUpdated } from "./handlers/polls.js";
import { onFollow } from "./handlers/follow.js";
import { onKicksGifted } from "./handlers/kicks.js";
import { onRaid } from "./handlers/raids.js";
import { onSub, onSubGift, onSubGiftMultiple } from "./handlers/subs.js";
import { onSongRequest } from "./handlers/songRequest.js";
import { onKickRewardRedeemed } from "./handlers/rewards.js";
import { onKickChatMessage, onKickChatMessageDeleted } from "./handlers/messages.js";
import { logger } from "../logger.js";
import { cfg } from "../config.js";

// Tip genérico de handler
export type Handler = (ctx: Context, args: any) => void;

// Registry: nombreEvento → handler
export const registry: Record<string, Handler> = {
  // Predictions
  "kickPredictionCreated": onPredictionCreated,
  "kickPredictionUpdated": onPredictionUpdated,
  "kickPredictionLocked": onPredictionLocked,
  "kickPredictionResolved": onPredictionResolved,
  "kickPredictionCancelled": onPredictionCancelled,

  // Polls
  "kickPollCreated": onPollCreated,
  "kickPollUpdated": onPollUpdated,
  "kickPollCancelled": onPollCancelled,
  "kickPollCompleted": onPollCompleted,

  // Follow
  "kickFollow": onFollow,

  //Kicks
  "kickKicksGifted": onKicksGifted,

  //Raid
  "kickIncomingRaid": onRaid,

  //Subs
  "kickSub": onSub,
  "kickGift": onSubGift,
  "kickGifts": onSubGiftMultiple,

  //DefaultReward
  "kickRewardRedeemed": onKickRewardRedeemed,

  //SongRequest
  [`kickRewardRedeemed.${cfg.spotify.redemptionId}`]: onSongRequest,
  
  //Mensaje destacado
  [`kickRewardRedeemed.01K52SGEN9T6F0GF9W9TPBAVJN`]: () => { /* ignore */},

  "kickChatMessage": onKickChatMessage,

  "kickChatMessageDeleted": onKickChatMessageDeleted

};

// Fallback si no hay handler específico
export function defaultHandler(ctx: Context, eventName: string, args: unknown) {
  const time = new Date().toLocaleString();
  logger.info(`[${time}] ${eventName} ${JSON.stringify(args, null, 2)}`);
}

// Dispatcher principal
export function dispatch(ctx: Context, eventName: string, args: any) {
  const handler = registry[eventName];
  if (handler) return handler(ctx, args);
  return defaultHandler(ctx, eventName, args);
}
