import { routePartykitRequest } from "partyserver";
import Machine from "./machine.party";
import { Counter } from "./hono-counter.do";
import type { Env } from "./env.type";
import { Hono } from "hono";

export { Machine };
export { Counter };

const app = new Hono<{ Bindings: Env }>();
app.get(`${Counter.basePath}/*`, async (ctx) => {
	const name = ctx.req.query("name");
	if (!name) {
		return ctx.text(
			"Missing Durable Object `name` URL query string parameter, for example, ?name=abc",
		);
	}

	const id = ctx.env.Counter.idFromName(name);
	const obj = ctx.env.Counter.get(id);
	return obj.fetch(ctx.req.raw);
});

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/parties/")) {
			return (
				(await routePartykitRequest(request, env)) ||
				new Response("Not Found", { status: 404 })
			);
		}

		if (url.pathname.startsWith("/api")) {
			return app.fetch(request, env);
		}

		return env.ASSETS.fetch(request as never);
	},
};
