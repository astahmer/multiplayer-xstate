import { Hono } from "hono";

export class Counter {
	static basePath = "/api/counter";

	state: DurableObjectState;
	app = new Hono().basePath(Counter.basePath);
	value = 0;
	initialPromise: Promise<void>;

	constructor(state: DurableObjectState) {
		this.state = state;
		this.initialPromise = this.state.blockConcurrencyWhile(async () => {
			const stored = await this.state.storage?.get<number>("value");
			this.value = stored || 0;
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
		await this.initialPromise;
		return this.app.fetch(request);
	}
}
