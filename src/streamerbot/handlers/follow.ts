import { Context } from "../context.js";
import { FollowArgs } from "../../types.js";
import { Alerts } from "../../alerts.js";
import { logger } from "../../logger.js";
import { cfg } from "../../config.js";
import { printFollowerTicket } from "../../printer/index.js";

export function onFollow(_ctx: Context, args: FollowArgs) {
  logger.info(`[SB] (follow) Nuevo seguidor: ${args.user}`);
  Alerts.send({ type: "follow", payload: { user: args.user } });

  if (cfg.printer.enabled) {
    printFollowerTicket(args.user).catch(err => {
      logger.error(err, "[Printer] (follow) Falló al intentar imprimir ticket de seguidor.");
    });
  }
}
