https://www.astahmer.dev/posts/multiplayer-state-machine-with-durable-objects

---

Start the app with `pnpm dev`

There are multiple examples of using Cloudflare Durable Objects:
- [a very simple counter using hono](./party/hono-counter.do.ts): available at http://localhost:5173/sandbox
- [a simple SSR-only todo list with persistence using hono](./party/hono-ssr-mpa-react-todolist.do.tsx): available at http://localhost:5173/api/todos?name=example
- [a payment state machine with persistence (restarting the actor based on stored snapshot) using hono + xstate](./party/xstate-payment.do.ts): available at http://localhost:5173/payment
- [a realtime multiplayer state machine using partyserver + xstate with public/private context based on playerId/current state](./party/machine.party.ts) available at http://localhost:5173

## Relevant links
- https://developers.cloudflare.com/durable-objects/
- https://github.com/threepointone/partyserver
- https://docs.partykit.io/reference/partysocket-api
- https://stately.ai/docs/states
- https://hono.dev/

## Deployment

register on Cloudflare, add a `VITE_API_HOST` env variable like `VITE_API_HOST=your-app-name.astahmer.workers.dev`

put it in a `.env.production` file and run `pnpm run deploy`

---

Initiated from https://github.com/threepointone/partyvite
