# mapcast-cron

Mapcast initially used a cron worker to regularly query a D1 database to which claims were submitted to then compute aggregate scores. I grew worried of going over the limits for the number of row reads allotted per month, so I switched to using a Python script in `mapcast-query` that retrieves claims from R2 and then stores them on a server. 

Ergo, this worker is no longer used, but here for future reference.

Default Cloudflare worker readme content is as follows.

---

Welcome to Cloudflare Workers! This is your first worker.

- Run `npm run dev` in your terminal to start a development server
- Open a browser tab at <http://localhost:8787/> to see your worker in action
- Run `npm run deploy` to publish your worker

Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
`Env` object can be regenerated with `npm run cf-typegen`.

Learn more at <https://developers.cloudflare.com/workers/>