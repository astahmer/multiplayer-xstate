import { nanoid } from "nanoid";
import PartySocket from "partysocket";
import type { GameMachineClientSide } from "../../server/game.machine.serialize";
import { createArctorPartyHooks } from "../create-actor-party.hooks";
import { EnvConfig } from "../env.config";

const id = localStorage.getItem("id") || nanoid();
localStorage.setItem("id", id); // this makes reconnection easy

const partySocket = new PartySocket({
	id,
	host: EnvConfig.Host,
	party: "machine",
	startClosed: true,
});
partySocket.binaryType = "arraybuffer";

export const GameClient = createArctorPartyHooks<GameMachineClientSide>(
	partySocket,
	{
		reviver: (snapshot) => ({
			...snapshot,
			context: {
				...snapshot.context,
				actorList: snapshot.context.actorList.map((actor) => ({
					...actor,
					getSnapshot: () =>
						(snapshot.children as Record<string, any>)[actor.id]! as any,
				})),
			},
		}),
	},
);
