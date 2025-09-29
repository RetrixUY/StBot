import { StreamerbotClient } from "@streamerbot/client";
import { Poll } from "../models/Poll.js";
import { Prediction } from "../models/Prediction.js";

export class Context {
  currentPoll: Poll | null = null;
  currentPrediction: Prediction | null = null;
  constructor(
    public client: StreamerbotClient | null
  ) { }
}