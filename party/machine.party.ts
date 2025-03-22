import * as Party from "partyserver";
import { createActor, type AnyActorRef, type AnyMachineSnapshot } from "xstate";
import murmurHash2 from "../server/lib/murmur-hash2";
import { nanoid } from "nanoid";
import { gameMachine } from "../server/game.machine";
import { serializeGameSnapshot } from "../server/game.machine.serialize";
import type { Env } from "./env.type";
import { compare } from "fast-json-patch";
import { decode, encode } from "../server/lib/encode-decode";

const withDebug = false;

export default class MachinePartyServer extends Party.Server {
	roomId = nanoid();
	lastUpdateMap = new WeakMap<
		Party.Connection,
		{ snapshot: Record<string, unknown>; hash: string }
	>();

	actor = createActor(gameMachine, {
		input: {
			roomId: this.roomId,
		},
		inspect: withDebug
			? (inspectionEvent) => {
					if (inspectionEvent.type === "@xstate.event") {
						const event = inspectionEvent.event;

						// Only listen for events sent to the root actor
						if (inspectionEvent.actorRef !== this.actor) {
							return;
						}

						if (event.type.startsWith("xstate.")) {
							console.log("[xstate:inspect]", event.type);
							return;
						}

						console.log("[xstate:event]", event);
					}
				}
			: undefined,
	});

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		console.log("init room:", this.roomId);
		this.actor.start();
		this.subscribeToSnapshot();
	}

	subscribeToSnapshot() {
		// TODO send update every 10s ?

		this.actor.subscribe({
			next: (snapshot) => {
				for (const ws of this.getConnections()) {
					const serialized = serializeGameSnapshot(snapshot, ws.id);
					const hash = murmurHash2(JSON.stringify(serialized));
					const previousUpdate = this.lastUpdateMap.get(ws);

					if (previousUpdate?.hash === hash) continue;

					this.lastUpdateMap.set(ws, { snapshot: serialized, hash });

					if (!previousUpdate) {
						ws.send(
							encode({
								type: "party.snapshot.update",
								snapshot: serialized,
							}),
						);
						continue;
					}

					const operations = compare(previousUpdate.snapshot, serialized);
					if (operations.length === 0) continue;

					ws.send(
						encode({
							type: "party.snapshot.patch",
							operations,
						}),
					);
				}
			},
			error: (err) => {
				console.log("actor subscribe error", err);
			},
			complete: () => {
				console.log("actor subscribe complete");
			},
		});
	}

	onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
		console.log(
			`Connected:
			conn.id: ${conn.id}
			room: ${this.roomId}
			url: ${new URL(ctx.request.url).pathname}`,
		);
	}

	onMessage(
		sender: Party.Connection,
		message: Party.WSMessage,
	): void | Promise<void> {
		const decoded = decode<Record<string, unknown>>(message);
		if (!decoded) {
			console.warn("message is not decodable", message);
			return;
		}

		console.log(
			`connection ${sender.id} sent message: ${JSON.stringify(decoded)}`,
		);

		const eventType = decoded.type;
		const isEvent = eventType && typeof eventType === "string";
		if (!isEvent) {
			console.warn("message is not an event", decoded);
			return;
		}

		if (eventType.startsWith("party.")) {
			const events = {
				"party.snapshot.get": {
					onMessage: () => {
						const snapshot = serializeGameSnapshot(
							this.actor.getSnapshot(),
							sender.id,
						);
						sender.send(encode({ type: "party.snapshot.update", snapshot }));
					},
				},
				"party.sendTo": {
					onMessage: () => {
						const snapshot = this.actor.getSnapshot();
						const childActorRef = (
							snapshot.children as Record<string, AnyActorRef>
						)[decoded["actorId"] as string];
						if (!childActorRef) return;

						childActorRef.send(decoded["event"]);
					},
				},
			};

			const keys = Object.keys(events);
			if (!keys.includes(eventType)) {
				console.warn("message is not a party event", decoded);
				return;
			}

			events[eventType as keyof typeof events].onMessage?.();
		}

		this.actor.send({ ...decoded, _userId: sender.id } as never);
	}

	// Whenever a connection closes (or errors),
	// we'll broadcast a message to all other connections to remove the player
	onCloseOrError(
		connection: Party.Connection<unknown>,
		from: "close" | "error",
		error?: Error,
	) {
		console.log(
			"onCloseOrError",
			{ from, id: connection.id, error },
			connection.id,
		);
		this.actor.send({ type: "Disconnect", _userId: connection.id });
	}

	onClose(connection: Party.Connection<unknown>): void | Promise<void> {
		this.onCloseOrError(connection, "close");
	}

	onError(
		connection: Party.Connection<unknown>,
		error: Error,
	): void | Promise<void> {
		this.onCloseOrError(connection, "error", error);
	}
}
