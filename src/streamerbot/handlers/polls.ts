import { Poll } from "../../models/Poll.js";
import { Context } from "../context.js";
import { PollCreatedArgs, PollCompletedArgs } from "../../types.js";
import { broadcast } from "../../overlay.js";
import { logger } from "../../logger.js";

function printChoices(poll: Poll) {
  poll.choices.forEach((choice, i) => {
    logger.info(`[SB] (poll) Opción ${i + 1}: ${choice.title}${typeof choice.votes === "number" ? ` - Votos: ${choice.votes}` : ""}`);
  });
}

export function onPollCreated(ctx: Context, args: PollCreatedArgs) {
  const poll = new Poll(args);
  ctx.currentPoll = poll;
  logger.info(`[SB] (poll) Se creó una encuesta: ${poll.title} con ${poll.choices.length} opciones.`);
  printChoices(poll);
  broadcast({ kind: 'poll', state: 'ACTIVE', data: poll });
}

export function onPollUpdated(ctx: Context, args: PollCreatedArgs) {
  const poll = new Poll(args);
  const changed = !ctx.currentPoll || poll.votes !== ctx.currentPoll.votes;

  if (changed) {
    logger.info(`[SB] (poll) Se actualizó la encuesta: ${poll.title}`);
    printChoices(poll);
  }
  ctx.currentPoll = poll;
  broadcast({ kind: 'poll', state: 'ACTIVE', data: poll });
}

export function onPollCancelled(ctx: Context) {
  if (ctx.currentPoll) {
    logger.info(`[SB] (poll) Se canceló la encuesta: ${ctx.currentPoll.title}`);
    broadcast({ kind: 'poll', state: 'CANCELED', data: ctx.currentPoll });
    ctx.currentPoll = null;
  }
}

export function onPollCompleted(ctx: Context, args: PollCompletedArgs) {
  const poll = new Poll(args);
  logger.info(`[SB] (poll) Finalizó la encuesta: ${poll.title}`);
  printChoices(poll);
  logger.info(`[SB] (poll) Total votos: ${poll.votes}`);
  logger.info(`[SB] (poll) Ganadora: ${poll.winnerTitle} con ${poll.winnerVotes} votos.`);
  broadcast({ kind: 'poll', state: 'COMPLETED', data: poll });
  ctx.currentPoll = null;
}