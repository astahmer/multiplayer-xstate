import { Hono } from "hono";
import type { EnvBindings } from "./env.type";

export class Counter {
	static basePath = "/api/counter";

	state: DurableObjectState;
	app = new Hono().basePath(Counter.basePath);
	value = 0;
	initialPromise: Promise<void> | null;

	constructor(state: DurableObjectState, _env: EnvBindings) {
		this.state = state;
		this.initialPromise = this.state.blockConcurrencyWhile(async () => {
			const stored = await this.state.storage?.get<number>("value");
			this.value = stored || 0;
			this.initialPromise = null;
		});

		this.app.get("/increment", async (c) => {
			const currentValue = ++this.value;
			await this.state.storage?.put("value", this.value);
			return c.json({ current: currentValue });
		});

		this.app.get("/decrement", async (c) => {
			const currentValue = --this.value;
			await this.state.storage?.put("value", this.value);
			return c.json({ current: currentValue });
		});

		this.app.get("/current", async (c) => {
			return c.json({ current: this.value });
		});
	}

	async fetch(request: Request) {
		// ensures the in memory state is always up to date
		this.initialPromise && (await this.initialPromise);
		return this.app.fetch(request);
	}
}
