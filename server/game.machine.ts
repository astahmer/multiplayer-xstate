import {
	and,
	assertEvent,
	assign,
	enqueueActions,
	fromCallback,
	not,
	setup,
	stopChild,
} from "xstate";
import {
	type GameContext,
	type GameInitialInput,
	type Player,
	type Vote,
	gameDurationsInMs,
	getInitialContext,
	getPlayerId,
} from "./game.machine.context";
import { playerMachine } from "./player.machine";
import type { ServerOnlyEventInput } from "./lib/server-only-event.type";

type GameEvent =
	| { type: "Connect"; player: Pick<Player, "id" | "name"> }
	| { type: "Disconnect" }
	| { type: "Ready" }
	| { type: "CancelReady" }
	| { type: "DecrementTimer"; minus: number }
	| { type: "VotePause" }
	| { type: "VoteResume" };
type GameServerEvent = ServerOnlyEventInput & GameEvent;

const createVote = (opts: Vote) => opts;

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
					id: getPlayerId(opt.event.player.id) as never,
					syncSnapshot: true,
					input: {
						id: opt.event.player.id,
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
		//
		votePause: assign({
			currentVotes: (opt) => {
				assertEvent(opt.event, "VotePause");

				const pause = opt.context.currentVotes.find(
					(vote) =>
						vote.type === "pause" && vote.fromPlayerId === opt.event._userId,
				);

				// Cancel vote if already voted
				if (pause) {
					return opt.context.currentVotes.filter(
						(vote) =>
							vote.type === "pause" && vote.fromPlayerId === opt.event._userId,
					);
				}

				return [
					...opt.context.currentVotes,
					createVote({ type: "pause", fromPlayerId: opt.event._userId }),
				];
			},
		}),
		voteResume: assign({
			currentVotes: (opt) => {
				assertEvent(opt.event, "VoteResume");

				const resume = opt.context.currentVotes.find(
					(vote) =>
						vote.type === "resume" && vote.fromPlayerId === opt.event._userId,
				);
				// Cancel vote if already voted
				if (resume) {
					return opt.context.currentVotes.filter(
						(vote) =>
							vote.type === "resume" && vote.fromPlayerId === opt.event._userId,
					);
				}

				return [
					...opt.context.currentVotes,
					createVote({ type: "resume", fromPlayerId: opt.event._userId }),
				];
			},
		}),
		clearPauseVotes: assign({
			currentVotes: (opt) => {
				return opt.context.currentVotes.filter((vote) => vote.type !== "pause");
			},
		}),
		clearResumeVotes: assign({
			currentVotes: (opt) => {
				return opt.context.currentVotes.filter(
					(vote) => vote.type !== "resume",
				);
			},
		}),
		resetTimer: assign({
			timers: (
				opt,
				params: { key: keyof GameContext["timers"]; value: number },
			) => {
				return {
					...opt.context.timers,
					[params.key]: params.value,
				};
			},
		}),
		decrementTimer: assign({
			timers: (opt, params: { key: keyof GameContext["timers"] }) => {
				assertEvent(opt.event, "DecrementTimer");
				const current = opt.context.timers[params.key];
				return {
					...opt.context.timers,
					[params.key]: current != null ? current - opt.event.minus : null,
				};
			},
		}),
		clearTimer: assign({
			timers: (opt, params: { key: keyof GameContext["timers"] }) => {
				return {
					...opt.context.timers,
					[params.key]: null,
				};
			},
		}),
		stopQuestionTimer: stopChild("questionTimer"),
		//
		setAllPlayersIdle: enqueueActions(({ enqueue, context }) => {
			context.actorList.forEach((player) => {
				enqueue.sendTo(player, { type: "SetState", state: "idle" });
			});
		}),
		setAllPlayersReady: enqueueActions(({ enqueue, context }) => {
			context.actorList.forEach((player) => {
				enqueue.sendTo(player, { type: "SetState", state: "ready" });
			});
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
					return player.isConnected && player.state === "ready";
				})
			);
		},
		hasEveryoneConnectedVotedToResume: ({ context }) => {
			const votes = context.currentVotes.filter(
				(vote) => vote.type === "resume",
			);
			if (!votes.length) return false;

			const connectedPlayers = context.actorList.filter((ref) => {
				const playerCtx = ref.getSnapshot().context;
				return playerCtx.isConnected;
			});
			if (!connectedPlayers.length) return false;

			return votes.length === connectedPlayers.length;
		},
	},
	actors: {
		startTimer: fromCallback<
			{ type: "PauseTimer" } | { type: "ResumeTimer" },
			{ interval?: number; from: string }
		>((opt) => {
			const interval =
				opt.input?.interval ?? gameDurationsInMs.timerUpdateInterval;
			let paused = false;
			let isStopped = false;
			let timeoutId: ReturnType<typeof setTimeout>;

			const tick = () => {
				if (!paused) {
					// console.log("timer executing", { from: opt.input.from });
					opt.sendBack({
						type: "DecrementTimer",
						minus: interval,
						from: opt.input.from,
					});
				}

				if (isStopped) return;
				timeoutId = setTimeout(tick, interval);
			};

			timeoutId = setTimeout(tick, interval);

			opt.receive((event) => {
				if (event.type === "PauseTimer") {
					paused = true;
				} else if (event.type === "ResumeTimer") {
					paused = false;
				}
			});

			return () => {
				isStopped = true;
				clearTimeout(timeoutId);
				// console.log("Timer cleared", { from: opt.input.from });
			};
		}),
	},
	delays: {
		startingDuration: gameDurationsInMs.startingDuration,
		prepareDelay: gameDurationsInMs.preparingDuration,
	},
}).createMachine({
	id: "game",
	initial: "idle",
	context: ({ input }: { input: GameInitialInput }) => {
		return getInitialContext({ input });
	},
	states: {
		idle: {
			always: { target: "starting", guard: "isEveryoneReady" },
			on: {
				Ready: { actions: "setPlayerReady" },
				CancelReady: { actions: "setPlayerIdle" },
			},
		},
		starting: {
			entry: {
				type: "resetTimer",
				params: { key: "starting", value: gameDurationsInMs.startingDuration },
			},
			always: { target: "idle", guard: not("isEveryoneReady") },
			invoke: {
				src: "startTimer",
				input: {
					interval: gameDurationsInMs.timerUpdateInterval,
					from: "starting",
				},
			},
			after: {
				startingDuration: { target: "started" },
			},
			on: {
				Ready: { actions: "setPlayerReady" },
				CancelReady: { actions: "setPlayerIdle" },
				DecrementTimer: {
					actions: { type: "decrementTimer", params: { key: "starting" } },
				},
			},
			exit: [{ type: "clearTimer", params: { key: "starting" } }],
		},
		started: {
			id: "started",
			initial: "preparing",
			states: {
				preparing: {
					initial: "waiting",
					states: {
						paused: {
							tags: ["paused"],
							always: [
								{
									target: "waiting",
									guard: "isEveryoneReady",
									actions: ["setAllPlayersReady"],
								},
							],
						},
						waiting: {
							always: [
								{
									target: "paused",
									guard: not("isEveryoneReady"),
								},
							],
							entry: {
								type: "resetTimer",
								params: {
									key: "preparing",
									value: gameDurationsInMs.startingDuration,
								},
							},
							invoke: {
								src: "startTimer",
								input: {
									interval: gameDurationsInMs.timerUpdateInterval,
									from: "preparing.waiting",
								},
							},
							after: {
								prepareDelay: {
									target: "#started.game.init",
								},
							},
							on: {
								DecrementTimer: {
									actions: {
										type: "decrementTimer",
										params: { key: "preparing" },
									},
								},
							},
							exit: { type: "clearTimer", params: { key: "preparing" } },
						},
					},
					on: {
						Ready: { actions: "setPlayerReady" },
						CancelReady: { actions: "setPlayerIdle" },
					},
				},
				game: {
					initial: "playing",
					states: {
						init: {
							always: { target: "playing" },
						},
						playing: {
							invoke: {
								id: "questionTimer",
								src: "startTimer",
								input: {
									interval: gameDurationsInMs.timerUpdateInterval,
									from: "game.playing",
								},
							},
							on: {
								VotePause: {
									target: "paused",
									actions: ["votePause", "setPlayerIdle"],
								},
								Disconnect: {
									guard: "isConnected",
									target: "paused",
									actions: "disconnect",
								},
							},
							exit: ["clearPauseVotes"],
						},
						paused: {
							tags: ["paused"],
							always: [
								{
									target: "playing",
									guard: "hasEveryoneConnectedVotedToResume",
									actions: "setAllPlayersReady",
								},
							],
							on: {
								VoteResume: { actions: ["voteResume", "setPlayerReady"] },
							},
							exit: "clearResumeVotes",
						},
					},
				},
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
	},
});
