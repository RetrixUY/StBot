import { Prediction } from "../../models/Prediction.js";
import { Context } from "../context.js";
import { PredictionCreatedArgs } from "../../types.js";
import { broadcast } from "../../overlay.js";
import { logger } from "../../logger.js";

function printOutcomes(pred: Prediction) {
  pred.outcomes.forEach((outcome, i) => {
    logger.info(`[SB] (predict) Opción ${i + 1}: ${outcome.title} - Apuestas: ${outcome.betCount} - Total: ${outcome.betTotal} - Ratio: ${outcome.betRatio}`);
  });
}

export function onPredictionCreated(ctx: Context, args: PredictionCreatedArgs) {
  const pred = new Prediction(args);
  ctx.currentPrediction = pred;
  logger.info(`[SB] (predict) Se creó una predicción: ${pred.title}`);
  printOutcomes(pred);
  // CORRECCIÓN: El estado debe ser 'ACTIVE'
  broadcast({ kind: 'prediction', state: 'ACTIVE', data: pred });
}

export function onPredictionUpdated(ctx: Context, args: PredictionCreatedArgs) {
  const pred = new Prediction(args);
  ctx.currentPrediction = pred;
  // Evitar spam si no cambió nada relevante
  const changed =
    !ctx.currentPrediction ||
    pred.state !== ctx.currentPrediction.state ||
    pred.totalBets !== ctx.currentPrediction.totalBets;

  if (changed) {
    logger.info(`[SB] (predict) Se actualizó la predicción: ${pred.title} - Estado: ${pred.state} - Total apuestas: ${pred.totalBets}`);
    printOutcomes(pred);
  }
  broadcast({ kind: 'prediction', state: pred.state, data: pred });
}

export function onPredictionLocked(ctx: Context, args: PredictionCreatedArgs) {
  const pred = new Prediction(args);
  ctx.currentPrediction = pred;
  logger.info(`[SB] (predict) Se cerró la predicción: ${pred.title}`);
  printOutcomes(pred);
  broadcast({ kind: 'prediction', state: 'LOCKED', data: pred });
}

export function onPredictionResolved(ctx: Context, args: PredictionCreatedArgs) {
  const pred = new Prediction(args);
  logger.info(`[SB] (predict) Se resolvió la predicción: ${pred.title}`);
  printOutcomes(pred);
  // CORRECCIÓN: El estado debe ser 'RESOLVED'
  broadcast({ kind: 'prediction', state: 'RESOLVED', data: pred });
  ctx.currentPrediction = null;
}

export function onPredictionCancelled(ctx: Context) {
  if (ctx.currentPrediction) {
    logger.info(`[SB] (predict) Se canceló la predicción: ${ctx.currentPrediction.title}`);
    broadcast({ kind: 'prediction', state: 'CANCELED', data: ctx.currentPrediction });
    ctx.currentPrediction = null;
  }
}