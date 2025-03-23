import type { PartySocket } from "partysocket";
import {
	type AnyActorRef,
	type AnyStateMachine,
	type EventFrom,
	type EventFromLogic,
	type StateFrom,
	type StateValueFrom,
	type TagsFrom,
	matchesState,
} from "xstate";
import type { ServerOnlyEventInput } from "../server/lib/server-only-event.type";

export const createActorParty = <
	TLogic extends AnyStateMachine,
	TState extends StateFrom<TLogic> = StateFrom<TLogic>,
>(
	snapshot: TState,
	partyClient: PartySocket,
): ActorParty<TLogic> => ({
	...snapshot,
	_userId: partyClient.id,
	snapshot,
	hasTag: (tag) => snapshot.tags.has(tag),
	send: (event) => {
		partyClient.send(JSON.stringify(event));
	},
	sendTo: (selectorOrChild, event) => {
		if (snapshot.status !== "active") {
			console.warn("sendTo: snapshot not active", snapshot.status);
			return;
		}

		const actorId =
			typeof selectorOrChild === "function"
				? selectorOrChild(snapshot)?.id
				: selectorOrChild.id;
		if (!actorId) {
			console.warn("sendTo: no actorId found", selectorOrChild);
			return;
		}

		partyClient.send(
			JSON.stringify({
				type: "party.sendTo",
				actorId: actorId,
				event,
			}),
		);
	},
	matches: (state) => matchesState(state, snapshot?.value ?? {}),
	partySocket: partyClient,
});

interface SendTo<
	TLogic extends AnyStateMachine,
	TState extends StateFrom<TLogic> = StateFrom<TLogic>,
> {
	<TChild extends AnyActorRef, TEvent extends EventFrom<TChild>>(
		selector: (state: Pick<TState, "context" | "children">) => TChild,
		event: TEvent extends ServerOnlyEventInput
			? Omit<TEvent, keyof ServerOnlyEventInput>
			: TEvent,
	): void;
	<TChild extends AnyActorRef, TEvent extends EventFrom<TChild>>(
		child: TChild,
		event: TEvent extends ServerOnlyEventInput
			? Omit<TEvent, keyof ServerOnlyEventInput>
			: TEvent,
	): void;
}

export interface ActorParty<
	TLogic extends AnyStateMachine,
	TState extends StateFrom<TLogic> = StateFrom<TLogic>,
> {
	_userId: string;
	snapshot: Pick<
		TState,
		"context" | "value" | "matches" | "children" | "error" | "status" | "tags"
	>;
	send: <TEvent extends EventFromLogic<TLogic>>(
		event: TEvent extends ServerOnlyEventInput
			? Omit<TEvent, keyof ServerOnlyEventInput>
			: TEvent,
	) => void;
	sendTo: SendTo<TLogic, TState>;
	matches: (state: StateValueFrom<TLogic>) => boolean;
	hasTag: (tag: TagsFrom<TLogic>) => boolean;
	context: TState["context"];
	value: TState["value"];
	status: TState["status"];
	error: TState["error"];
	partySocket: PartySocket;
}
