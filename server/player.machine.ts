import { assertEvent, assign, setup } from "xstate";
import type { Player } from "./game.machine.context";

type PlayerEvent =
	| { type: "SetName"; name: string }
	| { type: "SetState"; state: "idle" | "ready" }
	| { type: "Reconnect" }
	| { type: "Disconnect" };

interface PlayerInput {
	id: string;
	name: string;
}

const createPlayer = (opts: { id: string; name: string }): Player => ({
	id: opts.id,
	name: opts.name,
	state: "idle",
	isConnected: true,
});

export const playerMachine = setup({
	types: {} as {
		context: Player;
		events: PlayerEvent;
		input: PlayerInput;
	},
	actions: {
		reconnect: assign(({ context }) => {
			return { ...context, isConnected: true };
		}),
		disconnect: assign(({ context }) => {
			return { ...context, isConnected: false, state: "idle" as const };
		}),
		setName: assign(({ context, event }) => {
			assertEvent(event, "SetName");
			return { ...context, name: event.name };
		}),
		setState: assign(({ context, event }) => {
			assertEvent(event, "SetState");
			return { ...context, state: event.state };
		}),
	},
}).createMachine({
	id: "player",
	context: ({ input }) => createPlayer(input),
	initial: "idle",
	states: {
		idle: {
			on: {
				SetName: { actions: "setName" },
				SetState: { actions: "setState" },
				Reconnect: { actions: "reconnect" },
				Disconnect: { actions: "disconnect" },
			},
		},
	},
});
