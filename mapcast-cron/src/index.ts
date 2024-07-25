/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const HOUR = 60*60;
const DAY = 24*HOUR;
const WEEK = 7*DAY;
const MONTH = 30*DAY;

const HOUR_LABEL = `hourly`;
const DAY_LABEL = `daily`;
const WEEK_LABEL = `weekly`;
const MONTH_LABEL = `monthly`;
const ALL_TIME_LABEL = `all-time`;

const STATE_KEY = 'mapcast-state.json';

const r2PutOptions = { httpMetadata: new Headers({ 'Cache-Control': 'max-age=300'}) };

// mapToObject(new Map([['a', 1], ['b', 2]])); // {a: 1, b: 2}
const mapToObject = (map: Map<string, any>) => Object.fromEntries(map.entries());

const uploadResults = async (env: Env, scores: Map<any, any[]>, key: string) => {
	const now = Math.floor(new Date().getTime() / 1000);
	const content = JSON.stringify({'now': now, 'scores': mapToObject(scores)});
	await env.R2.put(key, content, r2PutOptions);
}


const getState = async (env: Env) => {
	const state = await env.R2.get(STATE_KEY);
	if (state === null) {
		console.log('No state found, bootstrapping mapcast state');
		const sql = 'SELECT ip, name, colo, country, region, timestamp FROM claims ORDER BY timestamp DESC';
		const { results, success, meta } = await env.DB.prepare(sql).all();
		if (!success) {
			console.log(`Querying for all of mapcast state failed: ${meta}`)
			return
		}

		const latestClaim = results[0]['timestamp'];
		await env.R2.put(STATE_KEY, JSON.stringify({
			'latestClaim': latestClaim,
			'values': results
		}));

		return results
	} else {
		const stateJson = JSON.parse(await state.text());
		const values = stateJson['values'];
		let latestClaim: number = stateJson['latestClaim'];

		const sql = 'SELECT ip, name, colo, country, region, timestamp FROM claims WHERE timestamp > ? ORDER BY timestamp DESC';
		const { results, success, meta } = await env.DB.prepare(sql).bind(latestClaim).all();
		if (!success) {
			console.log(`Querying for latest portion of mapcast state failed: ${meta}`)
			return
		}

		if (results.length === 0) {
			console.log(`Querying for latest portion of mapcast state returned no new results`)
			return
		}

		let ipMap = new Map<any, boolean>();
		results.forEach(x => {
			ipMap.set(x['ip'], true)
			latestClaim = Math.max(latestClaim, x['timestamp'] as number);
		})

		let newValues = [...results, ...values.filter((x: { [x: string]: any; }) => !ipMap.has(x['ip']))];

		await env.R2.put(STATE_KEY, JSON.stringify({
			'latestClaim': latestClaim,
			'values': newValues
		}));
		
		return newValues;
	}
}

const getTerritoryMap = (df: any) => {
	let territoryMap = new Map<string, Map<string, Map<[string, string], [number, number]>>>();

	territoryMap.set('colo', new Map<string, Map<[string, string], [number, number]>>());
	territoryMap.set('country', new Map<string, Map<[string, string], [number, number]>>());
	territoryMap.set('region', new Map<string, Map<[string, string], [number, number]>>());

	territoryMap.get('colo')?.set(HOUR_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('colo')?.set(DAY_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('colo')?.set(WEEK_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('colo')?.set(MONTH_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('colo')?.set(ALL_TIME_LABEL, new Map<[string, string], [number, number]>());

	territoryMap.get('country')?.set(HOUR_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('country')?.set(DAY_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('country')?.set(WEEK_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('country')?.set(MONTH_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('country')?.set(ALL_TIME_LABEL, new Map<[string, string], [number, number]>());

	territoryMap.get('region')?.set(HOUR_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('region')?.set(DAY_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('region')?.set(WEEK_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('region')?.set(MONTH_LABEL, new Map<[string, string], [number, number]>());
	territoryMap.get('region')?.set(ALL_TIME_LABEL, new Map<[string, string], [number, number]>());

	const now = Math.floor(new Date().getTime() / 1000);
	df.forEach((x: { [x: string]: any; }) => {

		// All Time
		let time_label = ALL_TIME_LABEL;
		['colo', 'country', 'region'].forEach((territoryLabel) => {
			if (territoryMap.get(territoryLabel)?.get(time_label)?.has([x['name'], x[territoryLabel]])) {
				const value = territoryMap.get(territoryLabel)?.get(time_label)?.get([x['name'], x[territoryLabel]])
				if (value === undefined) {
					return
				}
				const [pastCount, pastTimestamp] = value
				const newCount = pastCount + 1
				const newTimestamp = Math.max(pastTimestamp, x['timestamp']) 

				territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [newCount, newTimestamp])
			} else {
				territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [1, x['timestamp']])
			}
		})
		
		// Monthly
		if (x['timestamp'] > (now - MONTH)) {
			let time_label = MONTH_LABEL;
			
			['colo', 'country', 'region'].forEach((territoryLabel) => {
				if (territoryMap.get(territoryLabel)?.get(time_label)?.has([x['name'], x[territoryLabel]])) {
					const value = territoryMap.get(territoryLabel)?.get(time_label)?.get([x['name'], x[territoryLabel]])
					if (value === undefined) {
						return
					}
					const [pastCount, pastTimestamp] = value
					const newCount = pastCount + 1
					const newTimestamp = Math.max(pastTimestamp, x['timestamp']) 

					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [newCount, newTimestamp])
				} else {
					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [1, x['timestamp']])
				}
			});
		} else {
			return
		}
		
		// Weekly
		if (x['timestamp'] > (now - WEEK)) {
			let time_label = WEEK_LABEL;
			
			['colo', 'country', 'region'].forEach((territoryLabel) => {
				if (territoryMap.get(territoryLabel)?.get(time_label)?.has([x['name'], x[territoryLabel]])) {
					const value = territoryMap.get(territoryLabel)?.get(time_label)?.get([x['name'], x[territoryLabel]])
					if (value === undefined) {
						return
					}
					const [pastCount, pastTimestamp] = value
					const newCount = pastCount + 1
					const newTimestamp = Math.max(pastTimestamp, x['timestamp']) 

					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [newCount, newTimestamp])
				} else {
					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [1, x['timestamp']])
				}
			});
		} else {
			return
		}

		// Daily
		if (x['timestamp'] > (now - DAY)) {
			let time_label = DAY_LABEL;
			
			['colo', 'country', 'region'].forEach((territoryLabel) => {
				if (territoryMap.get(territoryLabel)?.get(time_label)?.has([x['name'], x[territoryLabel]])) {
					const value = territoryMap.get(territoryLabel)?.get(time_label)?.get([x['name'], x[territoryLabel]])
					if (value === undefined) {
						return
					}
					const [pastCount, pastTimestamp] = value
					const newCount = pastCount + 1
					const newTimestamp = Math.max(pastTimestamp, x['timestamp']) 

					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [newCount, newTimestamp])
				} else {
					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [1, x['timestamp']])
				}
			});
		} else {
			return
		}

		// Hourly
		if (x['timestamp'] > (now - HOUR)) {
			let time_label = HOUR_LABEL;

			['colo', 'country', 'region'].forEach((territoryLabel) => {
				if (territoryMap.get(territoryLabel)?.get(time_label)?.has([x['name'], x[territoryLabel]])) {
					const value = territoryMap.get(territoryLabel)?.get(time_label)?.get([x['name'], x[territoryLabel]])
					if (value === undefined) {
						return
					}
					const [pastCount, pastTimestamp] = value
					const newCount = pastCount + 1
					const newTimestamp = Math.max(pastTimestamp, x['timestamp']) 

					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [newCount, newTimestamp])
				} else {
					territoryMap.get(territoryLabel)?.get(time_label)?.set([x['name'], x[territoryLabel]], [1, x['timestamp']])
				}
			});
		}
	})
	       
	return territoryMap
}

const updateTerritory = async (env: Env, territoryMap: Map<[string, string], [number, number]>, territoryLabel: string, timeLabel: string) => {
	let finalTerritoryMap: Map<any, any[]> = new Map<any, any[]>();

	territoryMap.forEach((value, key) => {
		const name = key[0];
		const territory = key[1];
		const count  = value[0];
		const timestamp = value[1];

		if (finalTerritoryMap.has(name)) {
			finalTerritoryMap.get(name)?.push([territory, count, timestamp]);
		} else {
			finalTerritoryMap.set(name, [[territory, count, timestamp]]);
		}
	});

	await uploadResults(env, finalTerritoryMap, `${territoryLabel}-${timeLabel}.json`);
}

const updateTerritories = async (env: Env, territoryMap: any, timeLabel: string) => {
	// console.log(`Running ${timeLabel}`);
	await updateTerritory(env, territoryMap.get('colo')?.get(timeLabel), 'colo', timeLabel);
	await updateTerritory(env, territoryMap.get('country')?.get(timeLabel), 'country', timeLabel);
	await updateTerritory(env, territoryMap.get('region')?.get(timeLabel), 'region', timeLabel);
}

const runUpdate = async (env: Env) => {
	const stateValues = await getState(env);
	if (stateValues === undefined) {
		console.log('State was undefined, exiting');
		return
	}

	const territoryMap = getTerritoryMap(stateValues);

	await updateTerritories(env, territoryMap, HOUR_LABEL);
	await updateTerritories(env, territoryMap, DAY_LABEL);
	await updateTerritories(env, territoryMap, WEEK_LABEL);
	await updateTerritories(env, territoryMap, MONTH_LABEL);
	await updateTerritories(env, territoryMap, ALL_TIME_LABEL);

	console.log('Update complete');
}

export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		// A Cron Trigger can make requests to other endpoints on the Internet,
		// publish to a Queue, query a D1 Database, and much more.
		console.log(`Event triggered: ${event.cron}`);
		await runUpdate(env);
	},
};
