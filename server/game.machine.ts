import { assertEvent, assign, enqueueActions, not, setup } from "xstate";
import {
	type GameContext,
	type GameInitialInput,
	type Player,
	getInitialContext,
	getPlayerId,
} from "./game.machine.context";
import type { ServerOnlyEventInput } from "./lib/server-only-event.type";
import { playerMachine } from "./player.machine";

type GameEvent =
	| { type: "Connect"; player: Pick<Player, "name"> }
	| { type: "Disconnect" }
	| { type: "Ready" }
	| { type: "CancelReady" };
type GameServerEvent = ServerOnlyEventInput & GameEvent;

const findCurrentPlayer = (context: GameContext, event: GameServerEvent) =>
	context.actorList.find((actor) => actor.id === getPlayerId(event._userId));

export const gameMachine = setup({
	types: {} as {
		context: GameContext;
		events: GameServerEvent;
		input: GameInitialInput;
		tags: "paused";
	},
	actions: {
		spawnPlayerActor: assign({
			actorList: (opt) => {
				assertEvent(opt.event, "Connect");

				const newPlayer = opt.spawn(playerMachine, {
					id: getPlayerId(opt.event._userId) as never,
					syncSnapshot: true,
					input: {
						id: opt.event._userId,
						name: opt.event.player.name,
					},
				});
				return opt.context.actorList.concat(newPlayer);
			},
		}),
		reconnect: enqueueActions(({ enqueue, context, event }) => {
			const player = findCurrentPlayer(context, event);
			if (!player) return;

			enqueue.sendTo(player, { type: "Reconnect" });
		}),
		disconnect: enqueueActions(({ enqueue, context, event }) => {
			const player = findCurrentPlayer(context, event);
			if (!player) return;

			enqueue.sendTo(player, { type: "Disconnect" });
		}),
		setPlayerReady: enqueueActions(({ enqueue, context, event }) => {
			const player = findCurrentPlayer(context, event);
			if (!player) return;

			enqueue.sendTo(player, { type: "SetState", state: "ready" });
		}),
		setPlayerIdle: enqueueActions(({ enqueue, context, event }) => {
			const player = findCurrentPlayer(context, event);
			if (!player) return;

			enqueue.sendTo(player, { type: "SetState", state: "idle" });
		}),
	},
	guards: {
		wasNeverConnected: (opt) => {
			const player = findCurrentPlayer(opt.context, opt.event);
			return !player;
		},
		isConnected: (opt) => {
			const player = findCurrentPlayer(opt.context, opt.event);
			if (!player) return false;

			return player.getSnapshot().context.isConnected;
		},
		isEveryoneReady: ({ context }) => {
			return (
				context.actorList.length >= 1 &&
				context.actorList.every((ref) => {
					const player = ref.getSnapshot().context;
					// Ignore players that are not connected
					return player.isConnected ? player.state === "ready" : true;
				})
			);
		},
	},
}).createMachine({
	id: "game",
	initial: "idle",
	context: ({ input }: { input: GameInitialInput }) => {
		return getInitialContext({ input });
	},
	states: {
		idle: {
			always: { target: "playing", guard: "isEveryoneReady" },
		},
		playing: {
			always: {
				target: "idle",
				guard: not("isEveryoneReady"),
			},
		},
		done: {},
	},
	on: {
		Connect: [
			{
				guard: "wasNeverConnected",
				actions: ["spawnPlayerActor"],
			},
			{
				guard: not("isConnected"),
				actions: "reconnect",
			},
		],
		Disconnect: { guard: "isConnected", actions: "disconnect" },
		//
		Ready: { actions: "setPlayerReady" },
		CancelReady: { actions: "setPlayerIdle" },
	},
});
