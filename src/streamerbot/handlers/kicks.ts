import { Context } from "../context.js";
import { KicksGiftedArgs } from "../../types.js";
import { Alerts } from "../../alerts.js";
import { logger } from "../../logger.js";

export function onKicksGifted(_ctx: Context, args: KicksGiftedArgs) {
  logger.info(`[SB] (kicks) Kicks recibidos de ${args.sender} con un monto de ${args.amount} y un mensaje: ${args.message}`);
  Alerts.send({ type: "bits", payload: { user: args.sender, amount: args.amount, message: args.message } });
}
