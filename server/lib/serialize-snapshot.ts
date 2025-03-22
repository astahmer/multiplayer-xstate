import type { AnyMachineSnapshot } from "xstate";
import { pick } from "./pick";

export const serializeSnapshot = (snap: AnyMachineSnapshot) => {
	const context = snap.context;

	return {
		...pick(snap, ["value", "matches", "status", "children"]),
		context: pick(context, ["roomId", "actorList", "currentVotes", "timers"]),
		tags: Array.from(snap.tags),
		error: (snap.error && snap.error instanceof Error
			? {
					message: snap.error.message,
					stack: snap.error.stack,
					cause: (snap.error as any).cause,
				}
			: undefined) as undefined,
	};
};
