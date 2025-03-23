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

export interface GameContext {
	roomId: string;
	actorList: Array<ActorRefFrom<typeof playerMachine>>;
}

export const getInitialContext = ({
	input,
}: { input: GameInitialInput }): GameContext => {
	return {
		roomId: input.roomId,
		actorList: [],
	};
};

export const getPlayerId = (_userId: string) => `player-${_userId}`;

export const gameDurationsInMs = {
	timerUpdateInterval: 1_000,
	startingDuration: 5_000,
	preparingDuration: 5_000,
};
