import { Context } from "../context.js";
import { KickRewardRedeemedArgs } from "../../types.js";
import { handleSongRequestEvent, listSongRequests } from "../../spotify.js";
import { Redemption } from "../../models/Redemption.js";
import { cfg } from "../../config.js";
import { logger } from "../../logger.js";

export async function getRedemptionList(ctx: Context, rewardId?: string): Promise<Redemption[]> {
    let result = await ctx.client!.doAction(cfg.spotify.actions.getRedeems, {
        "rewardId": rewardId,
    }, { customEventResponse: true });
    let redemptions: Redemption[] = [];
    for (let i = 0; i < result.customEventResponseArgs!.redemptionsCount; i++) {
        redemptions.push({
            id: result.customEventResponseArgs![`redemption${i}Id` as string] as string,
            rewardId: result.customEventResponseArgs![`redemption${i}RewardId` as string] as string,
            rewardTitle: result.customEventResponseArgs![`redemption${i}RewardTitle` as string] as string,
            transactionId: result.customEventResponseArgs![`redemption${i}TransactionId` as string] as string,
            userId: result.customEventResponseArgs![`redemption${i}UserId` as string] as number,
            userName: result.customEventResponseArgs![`redemption${i}Username` as string] as string,
            userNameColor: result.customEventResponseArgs![`redemption${i}UsernameColor` as string] as string,
            status: result.customEventResponseArgs![`redemption${i}Status` as string] as string,
            channelId: result.customEventResponseArgs![`redemption${i}ChannelId` as string] as string,
        })
    }
    return redemptions;
}

export async function onSongRequest(ctx: Context, args: KickRewardRedeemedArgs) {
    logger.info(`[SB] (songRequest) ${args.user} canjeo cancion: ${args.rewardUserInput}`);
    let redemptions = await getRedemptionList(ctx, args.rewardId);
    let redemptionId = redemptions.filter((redemption) => redemption.userId === args.userId).map((redemption) => redemption.id).reverse()[0];
    handleSongRequestEvent({ user: args.user, query: args.rewardUserInput })
        .then(async (spotifyResult) => {
            logger.info(`[SB] (songRequest) ${args.user} cancion encontrada: ${spotifyResult.artists} - ${spotifyResult.name}`);
            let lista = listSongRequests()
            await ctx.client!.doAction(cfg.spotify.actions.sendMessage, { 'message': `@${args.user} solicitó la canción: ${spotifyResult.artists} - ${spotifyResult.name} - Posición: ${lista.length}` }, { customEventResponse: true })
            //await ctx.client!.doAction(cfg.spotify.actions.aceptRedemption, { 'redemptionId': redemptionId }, { customEventResponse: true })
        })
        .catch(async (error: any) => {
            logger.error(`[SB] (songRequest) ${args.user} cancion no encontrada: ${error}`);
            await ctx.client!.doAction(cfg.spotify.actions.sendMessage, { 'message': `@${args.user} ${error}` }, { customEventResponse: true })
            await ctx.client!.doAction(cfg.spotify.actions.rejectRedemption, { 'redemptionId': redemptionId }, { customEventResponse: true })
        })
}
