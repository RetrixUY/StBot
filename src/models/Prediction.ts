import { PollCompletedArgs, PollCreatedArgs, PredictionCreatedArgs } from "../types.js";
export class Prediction {
    id: string;
    title: string;
    duration: number;
    createdAt: Date;
    updatedAt?: Date;
    lockedAt?: Date;
    state: 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED';
    outcomes: { id: string, title: string; betCount: number, betTotal: number, betRatio: number }[];
    winnerOutcomeId?: string;
    winnerOutcomeIndex?: number;
    
    constructor(public args: PredictionCreatedArgs) {
        this.id = args["predictionId"];
        this.title = args["predictionTitle"];
        this.outcomes = [];
        this.state = args["predictionState"] as 'ACTIVE' | 'LOCKED' | 'RESOLVED' | 'CANCELED';
        //const maxChoices = 2; // 0..6
        const count = 2; //Math.min(Number(args["poll.choices.count"]), maxChoices); // always 2 for predictions
        for (let i = 0; i < count; i++) {
            this.outcomes.push({
                id: args[`predictionOutcome${i}Id` as Extract<keyof PredictionCreatedArgs, `predictionOutcome${number}Id`>],
                title: args[`predictionOutcome${i}Title` as Extract<keyof PredictionCreatedArgs, `predictionOutcome${number}Title`>],
                betCount: args[`predictionOutcome${i}VoteCount` as Extract<keyof PredictionCreatedArgs, `predictionOutcome${number}VoteCount`>],
                betTotal: args[`predictionOutcome${i}TotalVoteAmount` as Extract<keyof PredictionCreatedArgs, `predictionOutcome${number}TotalVoteAmount`>],
                betRatio: args[`predictionOutcome${i}ReturnRate` as Extract<keyof PredictionCreatedArgs, `predictionOutcome${number}ReturnRate`>],
            });
        }
        this.createdAt = new Date(args["predictionCreatedAt"]);
        this.duration = args["predictionDuration"];

        if (args.hasOwnProperty("predictionLockedAt")) {
            this.lockedAt = new Date(args["predictionLockedAt"]);
        }
        if (args.hasOwnProperty("predictionUpdatedAt")) {
            this.updatedAt = new Date((args["predictionUpdatedAt"]));
        }
        if (args.hasOwnProperty("predictionWinningOutcomeIndex")) {
            this.winnerOutcomeIndex = args["predictionWinningOutcomeIndex"];
            this.winnerOutcomeId = args["predictionWinningOutcomeId"];
        }
        if (this.state === 'RESOLVED' && (!this.winnerOutcomeId || this.winnerOutcomeIndex === undefined)) {
            //this.winnerOutcomeId = this.outcomes.reduce((prev, current) => (prev.betCount > current.betCount) ? prev : current).id;
            //this.winnerOutcomeIndex = this.outcomes.findIndex(o => o.id === this.winnerOutcomeId);
        }
    }

    get totalBets() {
        return this.outcomes.reduce((sum, outcome) => sum + outcome.betCount, 0);
    }
}