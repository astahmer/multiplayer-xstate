import type { ActorRefFrom } from "xstate";
import type { playerMachine } from "./player.machine";

export interface GameInitialInput {
	roomId: string;
}

export interface Player {
	id: string;
	name: string;
	state: "idle" | "ready";
	isConnected: boolean;
}

interface VotePause {
	type: "pause";
	fromPlayerId: string;
}
interface VoteResume {
	type: "resume";
	fromPlayerId: string;
}

export type Vote = VotePause | VoteResume;

export interface GameContext {
	roomId: string;
	actorList: Array<ActorRefFrom<typeof playerMachine>>;
	currentVotes: Vote[];
	timers: {
		starting: number | null;
		preparing: number | null;
	};
}

export const getInitialContext = ({
	input,
}: { input: GameInitialInput }): GameContext => {
	return {
		roomId: input.roomId,
		actorList: [],
		currentVotes: [],
		timers: {
			starting: null,
			preparing: null,
		},
	};
};

export const getPlayerId = (_userId: string) => `player-${_userId}`;

export const gameDurationsInMs = {
	timerUpdateInterval: 1_000,
	startingDuration: 5_000,
	preparingDuration: 5_000,
};
