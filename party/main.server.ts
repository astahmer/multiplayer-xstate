import { routePartykitRequest } from "partyserver";
import Machine from "./machine.party";
import { Counter } from "./hono-counter.do";
import type { EnvBindings } from "./env.type";
import { Hono } from "hono";
import { TodoList } from "./hono-ssr-mpa-react-todolist.do";
import { PaymentActor } from "./xstate-payment.do";

export { Machine, Counter, TodoList, PaymentActor };

const app = new Hono<{ Bindings: EnvBindings }>();
app.use(`${Counter.basePath}/*`, async (ctx) => {
	const name = ctx.req.query("name");
	if (!name) {
		return ctx.text(
			"Missing Durable Object `name` URL query string parameter, for example, ?name=abc",
			400,
		);
	}

	const id = ctx.env.Counter.idFromName(name);
	const obj = ctx.env.Counter.get(id);
	return obj.fetch(ctx.req.raw);
});

app.use(`${TodoList.basePath}/*`, async (ctx) => {
	const name = ctx.req.query("name");
	if (!name) {
		return ctx.text(
			"Missing Durable Object `name` URL query string parameter, for example, ?name=abc",
			400,
		);
	}

	const id = ctx.env.TodoList.idFromName(name);
	const obj = ctx.env.TodoList.get(id);
	return obj.fetch(ctx.req.raw);
});

app.use(`${PaymentActor.basePath}/*`, async (ctx) => {
	const name = ctx.req.query("name");
	if (!name) {
		return ctx.text(
			"Missing Durable Object `name` URL query string parameter, for example, ?name=abc",
			400,
		);
	}

	const id = ctx.env.PaymentActor.idFromName(name);
	const obj = ctx.env.PaymentActor.get(id);
	return obj.fetch(ctx.req.raw);
});

export default {
	async fetch(request: Request, env: EnvBindings) {
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
