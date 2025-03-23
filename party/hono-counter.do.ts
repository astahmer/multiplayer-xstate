import { Hono } from "hono";

export class Counter {
	value: number = 0;
	state: DurableObjectState;
	app: Hono = new Hono().basePath("/api/counter");

	constructor(state: DurableObjectState) {
		this.state = state;
		this.state.blockConcurrencyWhile(async () => {
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
		return this.app.fetch(request);
	}
}
