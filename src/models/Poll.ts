import { PollCompletedArgs, PollCreatedArgs } from "../types.js";

export class Poll {
    title: string;
    choices: { title: string; votes: number }[];
    createdAt: Date;
    duration: number;
    durationRemaining: number;
    votes: number;

    //completed
    endedAt?: Date;
    winnerChoice?: number;
    winnerTitle?: string;
    winnerVotes?: number;
    
    constructor(public args: PollCreatedArgs | PollCompletedArgs) {
        this.title = args["poll.Title"];
        this.choices = [];
        const maxChoices = 7; // 0..6
        const count = Math.min(Number(args["poll.choices.count"]), maxChoices);
        for (let i = 0; i < count; i++) {
            this.choices.push({
                title: args[`poll.choice${i}.title` as Extract<keyof PollCreatedArgs, `poll.choice${number}.title`>],
                votes: args[`poll.choice${i}.votes` as Extract<keyof PollCreatedArgs, `poll.choice${number}.votes`>],
            });
        }
        this.createdAt = new Date(args["poll.StartedAt"]);
        this.duration = args["poll.Duration"];
        this.durationRemaining = args["poll.DurationRemaining"];
        this.votes = args["poll.votes"];

        if (args.hasOwnProperty("poll.EndedAt")) {
           this.endedAt = new Date((args as PollCompletedArgs)["poll.EndedAt"]);
           this.winnerChoice = (args as PollCompletedArgs)["poll.winningIndex"];
           this.winnerTitle = (args as PollCompletedArgs)["poll.winningChoice.title"];
           this.winnerVotes = (args as PollCompletedArgs)["poll.winningChoice.votes"];
        }
    }
}