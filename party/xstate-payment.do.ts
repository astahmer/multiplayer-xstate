import { Hono } from "hono";
import {
	type ActorRefFrom,
	type EventFrom,
	type InputFrom,
	type SnapshotFrom,
	assertEvent,
	assign,
	createActor,
	fromCallback,
	fromPromise,
	setup,
} from "xstate";
import type { EnvBindings } from "./env.type";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PaymentActor implements DurableObject {
	static basePath = "/api/payment";

	state: DurableObjectState;
	app = new Hono().basePath(PaymentActor.basePath);
	initialPromise: Promise<void> | null;
	actor: ActorRefFrom<typeof paymentMachine> | null = null;

	constructor(state: DurableObjectState, _env: EnvBindings) {
		this.state = state;
		this.initialPromise = this.state.blockConcurrencyWhile(async () => {
			await this.restoreFromSnapshot();
			this.initialPromise = null;
		});

		this.app.post("/init", async (ctx) => {
			if (this.actor) {
				return ctx.json({ error: "already initialized" }, 400);
			}

			const name = ctx.req.query("name")!;
			const body = await ctx.req.json<{
				sender: string;
				recipient: string;
				amount: string;
			}>();

			const input: InputFrom<typeof paymentMachine> = {
				key: name,
				senderUserId: body.sender,
				recipientUserId: body.recipient,
				amount: parseInt(body.amount),
			};

			await this.state.storage.put("input", input);

			this.actor = createActor(paymentMachine, { input });
			this.actor.start();
			this.subscribeToSnapshot();

			return ctx.json({ paymentId: input.key });
		});

		this.app.get("/state", async (ctx) => {
			if (!this.actor) {
				return ctx.json({ error: "not initialized" }, 400);
			}

			return ctx.json({ snapshot: this.actor.getSnapshot() });
		});

		this.app.post("/send", async (ctx) => {
			if (!this.actor) {
				return ctx.json({ error: "not initialized" }, 400);
			}

			const event = await ctx.req.json<EventFrom<typeof paymentMachine>>();

			this.actor.send(event);

			return ctx.text("OK");
		});
	}

	private async restoreFromSnapshot() {
		if (this.actor) {
			throw new Error("actor already initialized");
		}

		const snapshot =
			await this.state.storage.get<SnapshotFrom<typeof paymentMachine>>(
				"snapshot",
			);

		if (snapshot) {
			const input =
				await this.state.storage.get<InputFrom<typeof paymentMachine>>("input");
			if (!input) {
				throw new Error("input not found");
			}

			this.actor = createActor(paymentMachine, { input, snapshot });
			this.actor.start();
			this.subscribeToSnapshot();
			return;
		}
	}

	private async subscribeToSnapshot() {
		if (!this.actor) {
			throw new Error("actor not initialized");
		}

		this.actor.subscribe(async (snapshot) => {
			await this.state.storage.put(
				"snapshot",
				this.actor!.getPersistedSnapshot(),
			);
		});
	}

	async fetch(request: Request) {
		// ensures the in memory state is always up to date
		this.initialPromise && (await this.initialPromise);
		return this.app.fetch(request);
	}
}

/** @see https://github.com/restatedev/xstate/blob/311331a9a525186cecc50b6f407a4b41743ff4f7/examples/payment/app.ts */
const paymentMachine = setup({
	types: {
		context: {} as {
			paymentId: string;
			senderUserId: string;
			recipientUserId: string;
			amount: number;
			logs: string[];
			secondsLeftToApprove: number;
		},
		input: {} as {
			key: string; // the key the state machine was created against
			senderUserId: string;
			recipientUserId: string;
			amount: number;
		},
		events: {} as
			| { type: "start" }
			| { type: "timer.tick"; interval: number }
			| { type: "approved" }
			| { type: "rejected" },
	},
	actions: {
		addToLogs: assign({
			logs: (opt, params: { message: string }) =>
				opt.context.logs.concat(params.message),
		}),
		decrementSecondsLeftToApprove: assign({
			secondsLeftToApprove: (opt) => {
				const event = opt.event;
				assertEvent(event, "timer.tick");
				if (event.type === "timer.tick") {
					return opt.context.secondsLeftToApprove - event.interval / 1000;
				}
				return opt.context.secondsLeftToApprove;
			},
		}),
	},
	actors: {
		updateBalance: fromPromise(
			async ({ input }: { input: { userID: string; amount: number } }) => {
				console.log(
					`Attempting to add ${input.amount} to the balance of ${input.userID}`,
				);
				await wait(1000);
				if (Math.random() > 0.5) throw new Error("Random error");

				const res = await fetch("https://httpbin.org/get");
				return res.json();
			},
		),
		startTimer: fromCallback<
			{ type: "timer.pause" } | { type: "timer.resume" },
			{ interval: number }
		>((opt) => {
			const interval = opt.input.interval;
			let paused = false;
			let isStopped = false;
			let timeoutId: ReturnType<typeof setTimeout>;

			const tick = () => {
				if (!paused) {
					// console.log("timer executing", { from: opt.input.from });
					opt.sendBack({
						type: "timer.tick",
						interval: interval,
					});
				}

				if (isStopped) return;
				timeoutId = setTimeout(tick, interval);
			};

			timeoutId = setTimeout(tick, interval);

			opt.receive((event) => {
				if (event.type === "timer.pause") {
					paused = true;
				} else if (event.type === "timer.resume") {
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
}).createMachine({
	context: ({ input }) => ({
		senderUserId: input.senderUserId,
		recipientUserId: input.recipientUserId,
		amount: input.amount,
		paymentId: input.key,
		secondsLeftToApprove: 10,
		logs: [
			`Init payment request (${input.key}) from ${input.senderUserId} to ${input.recipientUserId} for ${input.amount}$`,
		],
	}),
	id: "Payment",
	initial: "Needs confirm",
	states: {
		"Needs confirm": {
			entry: {
				type: "addToLogs",
				params: (opt) => ({
					message: `Awaiting start (${opt.context.paymentId})`,
				}),
			},
			on: {
				start: {
					target: "Awaiting approval",
					actions: {
						type: "addToLogs",
						params: { message: "Payment workflow started" },
					},
				},
			},
		},
		"Awaiting approval": {
			entry: {
				type: "addToLogs",
				params: (opt) => ({
					message: `Requesting approval for ${opt.context.paymentId}`,
				}),
			},
			after: {
				10_000: {
					target: "Awaiting admin approval",
					actions: {
						type: "addToLogs",
						params: { message: "Timed out, needs admin approval" },
					},
				},
			},
			invoke: {
				src: "startTimer",
				input: { interval: 1000 },
				onDone: {
					target: "Awaiting admin approval",
					actions: {
						type: "addToLogs",
						params: { message: "Timed out, needs admin approval" },
					},
				},
				onError: {
					target: "Cancelled",
					actions: {
						type: "addToLogs",
						params: { message: "Unexpected error" },
					},
				},
			},
			on: {
				"timer.tick": {
					actions: "decrementSecondsLeftToApprove",
				},
				approved: {
					target: "Approved",
					actions: {
						type: "addToLogs",
						params: { message: "User approved payment" },
					},
				},
				rejected: {
					target: "Rejected",
					actions: {
						type: "addToLogs",
						params: { message: "User rejected payment" },
					},
				},
			},
		},
		Approved: {
			invoke: {
				src: "updateBalance",
				input: ({ context }) => ({
					userID: context.senderUserId,
					amount: context.amount,
				}),
				onDone: {
					target: "Debited",
					actions: {
						type: "addToLogs",
						params: { message: "Going to debit" },
					},
				},
				onError: {
					target: "Cancelled",
					actions: {
						type: "addToLogs",
						params: { message: "Approve failed" },
					},
				},
			},
		},
		"Awaiting admin approval": {
			entry: {
				type: "addToLogs",
				params: (opt) => ({
					message: `Sending email to ${opt.context.senderUserId}`,
				}),
			},
			on: {
				approved: {
					target: "Approved",
					actions: {
						type: "addToLogs",
						params: { message: "Admin approved payment" },
					},
				},
				rejected: {
					target: "Rejected",
					actions: {
						type: "addToLogs",
						params: { message: "Admin rejected payment" },
					},
				},
			},
		},
		Rejected: {
			tags: ["final"],
			entry: {
				type: "addToLogs",
				params: (opt) => ({
					message: `Payment rejected (${opt.context.paymentId})`,
				}),
			},
		},
		Cancelled: {
			tags: ["final"],
			entry: {
				type: "addToLogs",
				params: (opt) => ({
					message: `Payment cancelled (${opt.context.paymentId})`,
				}),
			},
		},
		Debited: {
			invoke: {
				src: "updateBalance",
				input: ({ context }) => ({
					userID: context.recipientUserId,
					amount: context.amount,
				}),
				onDone: {
					target: "Succeeded",
					actions: {
						type: "addToLogs",
						params: { message: "Debit succeeded" },
					},
				},
				onError: {
					target: "Refunding",
					actions: {
						type: "addToLogs",
						params: { message: "Debit failed" },
					},
				},
			},
		},
		Succeeded: {
			tags: ["final"],
			entry: {
				type: "addToLogs",
				params: (opt) => ({
					message: `Payment succeeded (${opt.context.paymentId})`,
				}),
			},
		},
		Refunding: {
			invoke: {
				src: "updateBalance",
				input: ({ context }) => ({
					userID: context.senderUserId,
					amount: context.amount,
				}),
				onDone: {
					target: "Cancelled",
					actions: {
						type: "addToLogs",
						params: { message: "Refund succeeded" },
					},
				},
			},
		},
	},
});

export type PaymentActorType = typeof paymentMachine;
