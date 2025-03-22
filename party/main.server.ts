import { routePartykitRequest } from "partyserver";
import Machine from "./machine.party";
import type { Env } from "./env.type";

export { Machine };

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/parties/")) {
			return (
				(await routePartykitRequest(request, env)) ||
				new Response("Not Found", { status: 404 })
			);
		}

		return env.ASSETS.fetch(request as never);
	},
};
