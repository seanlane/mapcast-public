# mapcast-worker

The workhouse of the project, responsible for getting claims and writing the values out to an R2 bucket. Tries to batch requests as much as possible, to reduce R2 API costs.

Default Cloudflare worker readme content is as follows.

---

Welcome to Cloudflare Workers! This is your first worker.

- Run `npm run dev` in your terminal to start a development server
- Open a browser tab at <http://localhost:8787/> to see your worker in action
- Run `npm run deploy` to publish your worker

Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
`Env` object can be regenerated with `npm run cf-typegen`.

Learn more at <https://developers.cloudflare.com/workers/>
