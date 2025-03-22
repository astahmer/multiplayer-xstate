import type { PartySocket, PartySocketOptions } from "partysocket";
import {
	type PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type AnyStateMachine,
	type ContextFrom,
	type StateFrom,
	type StateValueFrom,
} from "xstate";
import { applyPatch, type Operation } from "fast-json-patch";
import { type ActorParty, createActorParty } from "./create-actor-party";
import { produce } from "immer";
import { enableMapSet } from "immer";

enableMapSet();

export const createArctorPartyHooks = <TLogic extends AnyStateMachine>(
	partySocket: PartySocket,
	options?: {
		reviver?: (snapshot: StateFrom<TLogic>) => StateFrom<TLogic>;
	},
) => {
	interface UseActorProps {
		onConnect?: (actor: ActorParty<TLogic, PartySocket>) => void;
		initialContext?: ContextFrom<TLogic>;
		partySocketOptions?: Partial<PartySocketOptions>;
	}

	const useActor = (props?: UseActorProps) => {
		const [snapshot, setSnapshot] = useState<StateFrom<TLogic>>({
			context: props?.initialContext ?? {},
			status: "stopped",
			value: {},
		} as never);

		const actor = useMemo(
			() => createActorParty(snapshot, partySocket),
			[snapshot, partySocket],
		);

		// Initial connection / reconnect with new options (different roomId)
		useEffect(() => {
			if (!props?.partySocketOptions) return;

			partySocket.updateProperties(props?.partySocketOptions);
			partySocket.reconnect();
		}, [props?.partySocketOptions]);

		// Get initial snapshot on connection open
		useEffect(() => {
			const handler = () => {
				partySocket.send(JSON.stringify({ type: "party.snapshot.get" }));
			};
			partySocket.addEventListener("open", handler);

			return () => {
				partySocket.removeEventListener("open", handler);
			};
		}, []);

		const isFirstActiveSnapshot = useRef(true);
		// Update snapshot on each update
		useEffect(() => {
			const handler = (event: MessageEvent) => {
				const data = event.data;
				if (!data) return;

				const decoded = JSON.parse(event.data) as
					| {
							type: "party.snapshot.update";
							snapshot: StateFrom<TLogic>;
					  }
					| {
							type: "party.snapshot.patch";
							operations: Operation[];
					  };

				// Full state update
				if (decoded.type === "party.snapshot.update") {
					const update = options?.reviver
						? options.reviver(decoded.snapshot)
						: decoded.snapshot;
					if (update.tags) {
						update.tags = new Set(update.tags);
					}

					setSnapshot(update);

					if (isFirstActiveSnapshot.current && update.status === "active") {
						isFirstActiveSnapshot.current = false;
						props?.onConnect?.(createActorParty(update, partySocket));
					}
				}

				// Small patch
				if (decoded.type === "party.snapshot.patch") {
					setSnapshot((currentSnapshot) => {
						const patched = produce(currentSnapshot, (draft) => {
							applyPatch(draft, decoded.operations);
						});

						const update = options?.reviver
							? options.reviver(patched)
							: patched;
						if (update.tags) {
							update.tags = new Set(update.tags);
						}

						return update;
					});
					return;
				}
			};

			partySocket.addEventListener("message", handler);

			return () => {
				partySocket.removeEventListener("message", handler);
			};
		}, []);

		return actor;
	};

	const ActorContext = createContext<ActorParty<TLogic, PartySocket>>(
		{} as never,
	);

	const ActorProvider = ({ children }: PropsWithChildren) => {
		const client = useActor();
		return (
			<ActorContext.Provider value={client as ActorParty<TLogic, PartySocket>}>
				{children}
			</ActorContext.Provider>
		);
	};

	const useSelector = <TSelectedValue = never>(
		selector: (state: ActorParty<TLogic, PartySocket>) => TSelectedValue,
	) => {
		const ctx = useContext(ActorContext);
		if (!ctx) throw new Error("ClientSideMachineProvider not found");
		return useMemo(() => selector(ctx), [ctx, selector]);
	};

	const Matches = (
		props: PropsWithChildren<{
			value: StateValueFrom<TLogic> | Array<StateValueFrom<TLogic>>;
			or?: boolean;
			inversed?: boolean;
		}>,
	) => {
		const { children, value, inversed } = props;
		const ctx = useContext(ActorContext);
		if (!ctx) throw new Error("ClientSideMachineProvider not found");

		const isMatching = Array.isArray(value)
			? value.some((v) => ctx.matches(v))
			: ctx.matches(value);

		if (inversed) return !isMatching || Boolean(props.or) ? children : null;
		return isMatching || Boolean(props.or) ? children : null;
	};

	return {
		Context: ActorContext,
		Provider: ActorProvider,
		Matches: Matches,
		useActor: useActor,
		useContext: () => useContext(ActorContext),
		useSelector,
		_useActorPropsType: {} as UseActorProps,
	};
};
