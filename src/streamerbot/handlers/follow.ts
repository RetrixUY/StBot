import { Context } from "../context.js";
import { FollowArgs } from "../../types.js";
import { Alerts } from "../../alerts.js";
import { logger } from "../../logger.js";

export function onFollow(_ctx: Context, args: FollowArgs) {
  logger.info(`[SB] (follow) Nuevo seguidor: ${args.user}`);
  Alerts.send({ type: "follow", payload: { user: args.user } });
}
