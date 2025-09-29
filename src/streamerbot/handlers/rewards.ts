import { Context } from "../context.js";
import { KickRewardRedeemedArgs } from "../../types.js";
import { logger } from "../../logger.js";

export function onKickRewardRedeemed(_ctx: Context, args: KickRewardRedeemedArgs) {
    logger.info(`[SB] (reward) Nueva Recompensa Canjeada: ${args.user} canjeo ${args.rewardTitle}${args.rewardUserInput ? ' con input ' + args.rewardUserInput : ''}`);
}
