import type { SnapshotFrom, ActorRefFrom } from "xstate";
import type { gameMachine } from "./game.machine";
import {
	getPlayerId,
	type GameContext,
	type Player,
} from "./game.machine.context";
import type { OverrideStateMachineContext } from "./lib/override-state-machine-context";
import type { playerMachine } from "./player.machine";
import { pick } from "./lib/pick";
import { serializeSnapshot } from "./lib/serialize-snapshot";

type GameMachineType = typeof gameMachine;
export interface GamePublicContext
	extends Pick<
		GameContext,
		"roomId" | "actorList" | "timers" | "currentVotes"
	> {
	// TODO custom computed field
	// TODO redacted stuff
}

export type GameMachineClientSide = OverrideStateMachineContext<
	GameMachineType,
	GamePublicContext
>;

export const serializeGameSnapshot = (
	snap: SnapshotFrom<GameMachineType>,
	_userId: string,
) => {
	const context = snap.context;
	const serialized = serializeSnapshot(snap);

	return {
		...serialized,
		children: Object.fromEntries(
			Object.entries(serialized.children)
				.filter(([key, child]) => key.startsWith(getPlayerId("")) && child)
				.map(([key, child]) => {
					const playerActor = child as unknown as ActorRefFrom<
						typeof playerMachine
					>;
					const playerSnap = playerActor.getSnapshot();

					return [
						key,
						{
							...pick(playerSnap, ["value", "status"]),
							context: {
								...pick(playerSnap.context, [
									"id",
									"name",
									"state",
									"isConnected",
								]),
							} satisfies Player,
						},
					];
				}),
		),
		context: {
			...(snap.matches("done")
				? context
				: pick(context, ["roomId", "actorList", "currentVotes", "timers"])),
		} satisfies GamePublicContext,
	};
};
