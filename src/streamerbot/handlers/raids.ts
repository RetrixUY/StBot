import { Context } from "../context.js";
import { RaidArgs } from "../../types.js";
import { Alerts } from "../../alerts.js";
import { logger } from "../../logger.js";

export function onRaid(_ctx: Context, args: RaidArgs) {
  logger.info(`[SB] (raid) Nuevo raid recibido: ${args.user}`);
  Alerts.send({ type: "raid", payload: { raider: args.user, viewers: args.viewers } });
}
