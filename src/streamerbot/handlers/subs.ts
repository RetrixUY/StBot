import { Context } from "../context.js";
import { SubArgs, SubGiftArgs, SubGiftMultipleArgs } from "../../types.js";
import { Alerts } from "../../alerts.js";
import { logger } from "../../logger.js";

export function onSub(_ctx: Context, args: SubArgs) {
  logger.info(`[SB] (sub) Nuevo subscriptor: ${args.user}`);
  Alerts.send({ type: "sub", payload: { user: args.user, months: args.cumulative } });
}

export function onSubGift(_ctx: Context, args: SubGiftArgs) {
  logger.info(`[SB] (sub) Nueva sub regalada: ${args.user} a ${args.recipientUser}`);
  Alerts.send({ type: "subGift", payload: { user: args.user, recipient: args.recipientUser } });
}

export function onSubGiftMultiple(_ctx: Context, args: SubGiftMultipleArgs) {
  logger.info(`[SB] (sub) Nuevas subs regaladas: ${args.user} regalo ${args.gifts}`);
  Alerts.send({ type: "subGiftMultiple", payload: { user: args.user, quantity: args.gifts } });
}