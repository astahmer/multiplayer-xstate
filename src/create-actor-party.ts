import type { PartySocket } from "partysocket";
import { type AnyStateMachine, type StateFrom } from "xstate";
import { createActorFacade, type ActorFacade } from "./create-actor-facade";

export const createActorParty = <
	TLogic extends AnyStateMachine,
	TState extends StateFrom<TLogic> = StateFrom<TLogic>,
>(
	snapshot: TState,
	partySocket: PartySocket,
): ActorParty<TLogic> => ({
	...createActorFacade(
		{
			...snapshot,
			partySocket: partySocket,
		},
		{
			id: partySocket.id,
			send: (event) => partySocket.send(JSON.stringify(event)),
		},
	),
	partySocket,
});

export interface ActorParty<
	TLogic extends AnyStateMachine,
	TState extends StateFrom<TLogic> = StateFrom<TLogic>,
> extends ActorFacade<TLogic, TState> {
	partySocket: PartySocket;
}
