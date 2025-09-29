export interface Tokens {
  access_token: string | null;
  refresh_token: string | null;
  /** ms epoch */
  expires_at: number;
}

export interface CurrentSong {
  isPlaying: boolean;
  progressMs?: number;
  durationMs?: number;
  track: string;
  artists: string;
  album: string;
  url: string;
  image: string;
  explicit?: boolean;
  deviceName?: string;
  playingType?: string;
  /** ms epoch */
  ts: number;
}


export interface CodeEvent {
  eventName: string;
  useArgs: boolean;
  args: Object;
}

export interface PredictionCreatedArgs {
  "predictionId": string,
  "predictionTitle": string,
  "predictionState": string,
  "predictionCreatedAt": string,
  "predictionUpdatedAt": string,
  "predictionLockedAt": string,
  "predictionDuration": number,
  "predictionOutcomesCount": number,
  "predictionOutcome0Id": string,
  "predictionOutcome0Title": string,
  "predictionOutcome0TotalVoteAmount": number,
  "predictionOutcome0VoteCount": number,
  "predictionOutcome0ReturnRate": number,
  "predictionOutcome1Id": string,
  "predictionOutcome1Title": string
  "predictionOutcome1TotalVoteAmount": number,
  "predictionOutcome1VoteCount": number,
  "predictionOutcome1ReturnRate": number,
  "predictionWinningOutcomeId"?: string,
  "predictionWinningOutcomeIndex"?: number,
}

export interface PollCreatedArgs {
  "poll.StartedAt": string,
  "poll.Title": string,
  "poll.Duration": number,
  "poll.DurationRemaining": number,
  "poll.choices.count": number,
  "poll.choice0.title": string,
  "poll.choice0.votes": number,
  "poll.choice0.totalVotes": number,
  "poll.choice1.title": string,
  "poll.choice1.votes": number,
  "poll.choice1.totalVotes": number,
  "poll.choice2.title": string,
  "poll.choice2.votes": number,
  "poll.choice2.totalVotes": number,
  "poll.choice3.title": string,
  "poll.choice3.votes": number,
  "poll.choice3.totalVotes": number,
  "poll.choice4.title": string,
  "poll.choice4.votes": number,
  "poll.choice4.totalVotes": number,
  "poll.choice5.title": string,
  "poll.choice5.votes": number,
  "poll.choice5.totalVotes": number,
  "poll.choice6.title": string,
  "poll.choice6.votes": number,
  "poll.choice6.totalVotes": number,
  "poll.votes": number,
  "poll.totalVotes": number
}

export interface PollCompletedArgs extends PollCreatedArgs {
  "poll.EndedAt": string,
  "poll.winningIndex": number,
  "poll.winningChoice.id": number,
  "poll.winningChoice.title": string,
  "poll.winningChoice.votes": number,
  "poll.winningChoice.totalVotes": number
}


export interface FollowArgs {
  "user": string,
  "userName": string,
  "userId": number,
  "isSubscribed": boolean,
  "isModerator": boolean,
  "isVip": boolean,
}

export interface KicksGiftedArgs {
  amount: number,
  message: string,
  gift: string,
  giftType: string,
  giftTier: string,
  sender: string,
  senderId: string,
  senderColor: string,
}

export interface RaidArgs {
  user: string,
  viewers: number
}

export interface SubArgs {
  user: string,
  userName: string,
  userId: string,
  monthStreak?: number,
  cumulative?: number,
}

export interface SubGiftArgs {
  user: string,
  userName: string,
  userId: string,
  recipientUser: string,
  recipientUserName: string,
  recipientUserId: string,
}

export interface SubGiftMultipleArgs {
  user: string,
  userName: string,
  userId: string,
  gifts: number,
}

export interface KickRewardRedeemedArgs {
  user: string,
  userId: number,
  redeemId: string,
  rewardId: string,
  rewardTitle: string,
  rewardUserInput: string,
}


export enum KickRole {
  Viewer = 1,
  VIP = 2,
  Mods = 3,
  Broadcaster = 4,
}

export type ChatEventType = 'new_message' | 'delete_one' | 'clear';

export type ChatEventPayload = {
  type: ChatEventType;
  data: KickChatMessage | { msgId: string } | {}; // Los datos varían según el tipo
};
export interface KickChatMessage {
  user: string;
  userName: string;
  userId: string;
  isSubscribed: boolean;
  isModerator: boolean;
  isVip: boolean;
  msgId: string;
  chatroomId: number;
  role: KickRole;
  color: string;
  message: string;
  emoteCount: number;
  emotes: string;
  messageStripped: string;
  isReply: boolean;
  "reply.msgId"?: string;
  "reply.message"?: string;
  "reply.userId"?: string;
  "reply.userName"?: string;
  firstMessage: boolean;
  isCommand: boolean;
  pinnableMessage: string;
}

export interface KickChatMessageDeletedAll {

}

export interface KickChatMessageDeletedOne {
  user: string,
  userName: string,
  userId: number,
  isSubscribed: boolean,
  isModerator: boolean,
  isVip: boolean,
  isAiModerated: boolean,
  violatedRules: string,
  msgId: string,
  chatroomId: string,
  role: KickRole,
  color: string,
  message: string
}

export type KickChatMessageDeleted = KickChatMessageDeletedAll | KickChatMessageDeletedOne