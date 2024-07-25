import { AutoRouter, RequestHandler, IRequest, cors } from 'itty-router';
import { IPv6, Validator, collapseIPv6Number} from "ip-num";
import { ulidFactory } from "ulid-workers";
import { Mutex } from 'async-mutex';
import parseUrl from "parse-url";

type CFArgs = [Env, ExecutionContext];

interface Claim {
	asn: number;
	asOrg?: string;
	colo: string;
	country: string | null;
	city: string | null;
	metro: string | null;
	regionName?: string | null;
	region: string | null;
	postalCode?: string;
	continent?: string;
	originalIp: string;
	recordedIp: string;
	headerCountry?: string | null;
	name: string;
	time_ms: number;
}

interface ClaimSubmission {
	ip: string,
	name: string, 
	asn: number,
	colo: string,
	country: string | null,
	region: string | null,
	metro: string | null,
	city: string | null,
	time_ms: number
}

const getClaimSubmission = (claim: Claim) : ClaimSubmission =>  {
	return {
		ip: claim.recordedIp,
		name: claim.name,
		asn: claim.asn,
		colo: claim.colo,
		country: claim.country,
		region: claim.region,
		metro: claim.metro,
		city: claim.city,
		time_ms: claim.time_ms
	}
}


const ulid = ulidFactory();
const validName = (name: string, env: Env): Boolean => {
	if (name.length < 1 || name.length > env.NAME_MAX_LEN) {
		return false;
	}

	const validChars = /^[a-zA-Z0-9@:.^+!/\-_\*]+$/;
	return validChars.test(name);
}

const getIPv6StartAddress = (ipStr: string, prefix: number): string => {
	let ip = IPv6.fromString(ipStr);
	let networkBinary = ip.toBinaryString().slice(0, 48).padEnd(128, '0');
	// Convert the binary string back to 8 groups of 16-bit hexadecimal numbers
    let newGroups = [];
	for (let i = 0; i < 8; i++) {
        let binSegment = networkBinary.slice(i * 16, (i + 1) * 16);
        newGroups.push(parseInt(binSegment, 2).toString(16).padStart(4, '0'));
    }

    // Join the groups with ':' to form the final IPv6 address
    return collapseIPv6Number(newGroups.join(':'));
}

const BATCH_INTERVAL_MS = 2000;
const MAX_REQUESTS_PER_BATCH = 100
let workerId : string | undefined = undefined;
let workerTimestamp: number | undefined = undefined;
let claimBatch: Array<ClaimSubmission> = [];
let claimBatchMutex = new Mutex();

const postBatch = async (env : Env, batchInFlight: Array<ClaimSubmission>) => {
	try {
		await env.R2.put(`${ulid()}.json`, JSON.stringify({ batch: batchInFlight, workerTimestamp: workerTimestamp, workerId: workerId }));
	} catch (err) {
		console.error(err);
	}
	return true
}

const scheduleBatch = async (env: Env, ctx: ExecutionContext) => {
	await sleep(BATCH_INTERVAL_MS)
	const release = await claimBatchMutex.acquire()
	try {
		if (claimBatch.length > 0) {
			const batchInFlight = claimBatch
			claimBatch = []
			ctx.waitUntil(postBatch(env, batchInFlight))
		}
	} finally {
		release()
		return true
	}
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const createGifBinaryData = (): ArrayBuffer => {
	// Create a simple 1x1 transparent GIF image
	return new Uint8Array([
	  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
	  0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00,
	  0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
	  0x00, 0x02, 0x02, 0x4C, 0x01, 0x00, 0x3B
	]).buffer;
}

const handleResponse = async (request: Request, msg: any, status: number): Promise<Response> => {
	const pathName = parseUrl(request.url).pathname;
	if (pathName === '/claim.gif') {
		return new Response(createGifBinaryData(), {status: status, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'max-age=3600' }});
	}

	const acceptHeader = request.headers.get('Accept');
	if (acceptHeader === null) { return new Response(null, {status: 204});}

	if (acceptHeader.includes('image/gif') || acceptHeader.includes('image/*')) {
		return new Response(createGifBinaryData(), {status: status, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'max-age=3600' }});
	} else {
		return new Response(JSON.stringify(msg, null, 2), {status: status});
	}
}

const claim: RequestHandler<IRequest, CFArgs> = async (request, env, ctx): Promise<Response> => {
	if (!workerTimestamp) {
		workerTimestamp = new Date().getTime();
	}

	if (!workerId) {
		workerId = ulid();
	}

	const { searchParams } = new URL(request.url);
	let name = searchParams.get('name');
	if (name === null || !validName(name, env)) {
		return handleResponse(request, {error: "invalid name provided"}, 400);
	}

	let claim: Claim = {
		asn: request.cf?.asn as number,
		asOrg: request.cf?.asOrganization as string,
		colo: request.cf?.colo as string,
		country: request.cf?.country as string || null,
		city: request.cf?.city as string || null,
		metro: request.cf?.metroCode as string || null,
		regionName: request.cf?.region as string || null,
		region: (request.cf?.country && request.cf?.regionCode) ? `${request.cf?.country}-${request.cf?.regionCode}` : null,
		postalCode: request.cf?.postalCode as string,
		continent: request.cf?.continent as string,
		originalIp: request.headers.get('CF-Connecting-IP') || "",
		recordedIp: "",
		headerCountry: request.headers.get('CF-IPCountry'),
		name: name,
		time_ms: new Date().getTime(),
	}

	if (claim.originalIp === "") {
		return handleResponse(request, {error: "could not get IP address"}, 500);
	}

	if (Validator.isValidIPv4String(claim.originalIp)[0]) {
		claim.recordedIp = claim.originalIp
	} else if (Validator.isValidIPv6String(claim.originalIp)[0]) {
		claim.recordedIp = getIPv6StartAddress(claim.originalIp, 48);
	} else {
		return handleResponse(request, Object.assign(claim, {error: "could not get IP address"}), 500);
	}

	// Restrict requests by IP and name
	const { success } = await env.MAPCAST_WORKER_NAME_LIMITER.limit({ key: `${claim.recordedIp}-${name}` })
    if (!success) {
		return handleResponse(request, Object.assign(claim, {error: "name rate limit exceeded"}), 429);
    }

	// Restrict requests by IP
	const { success: successByIp } = await env.MAPCAST_WORKER_IP_LIMITER.limit({ key: claim.recordedIp })
	if (!successByIp) {
		return handleResponse(request, Object.assign(claim, {error: "IP rate limit exceeded"}), 429);
	}

	let batchIsolate = false
	const release = await claimBatchMutex.acquire()
	try {
		if (claimBatch.length === 0) {
			console.log(`Claim batch started for ${name} at ${claim.recordedIp}`)
			batchIsolate = true
		}
		claimBatch.push(getClaimSubmission(claim));

		if (claimBatch.length >= MAX_REQUESTS_PER_BATCH) {
			const batchInFlight = claimBatch
			claimBatch = []
			ctx.waitUntil(postBatch(env, batchInFlight))
			batchIsolate = false
		}
	} finally {
		release()
	}

	if (batchIsolate) {
		ctx.waitUntil(scheduleBatch(env, ctx))
	}

	return handleResponse(request, claim, 200);
};

const index = () => {
	return new Response(
		`<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>API Documentation</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					margin: 20px;
				}
				h1 {
					color: #333;
				}
				h2 {
					color: #555;
				}
				p {
					color: #666;
				}
				code {
					background-color: #f4f4f4;
					padding: 2px 4px;
					border-radius: 4px;
				}
				.endpoint {
					margin-bottom: 20px;
				}
			</style>
		</head>
		<body>
			<h1>API Documentation</h1>
			
			<div class="endpoint">
				<h2>Endpoint: <code>/</code></h2>
				<p><strong>Method:</strong> GET</p>
				<p>Returns this basic HTML page.</p>
			</div>
		
			<div class="endpoint">
				<h2>Endpoint: <code>/claim?name=example</code></h2>
				<p><strong>Method:</strong> GET</p>
				<p>Claims the IP address on behalf of the provided name.</p>
				<p><strong>Query Parameters:</strong></p>
				<ul>
					<li><code>name</code> (string): The name to claim the IP address. Must be alphanumeric or one of the following characters: <code>@/:.^+!-_*</code>.</li>
				</ul>
				<p><strong>Validation Rules:</strong></p>
				<ul>
					<li>The <code>name</code> parameter is required.</li>
					<li>The <code>name</code> value must not be empty.</li>
					<li>The <code>name</code> value must not exceed 40 characters.</li>
					<li>The <code>name</code> value must only contain alphanumeric characters or the following special characters: <code>@/:.^+!-_*</code>.</li>
				</ul>
				<p>If the validation rules are not met, the data point will not be submitted.</p>
			</div>
		</body>
		</html>`,
		{headers: {'Content-Type': 'text/html; charset=utf-8'}}
	);
}

const notFound = () => {
	return new Response(
		`<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>404 Not Found</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					text-align: center;
					margin: 50px;
					color: #333;
				}
				h1 {
					font-size: 3em;
					margin-bottom: 10px;
				}
				p {
					font-size: 1.2em;
					color: #666;
				}
				a {
					color: #007BFF;
					text-decoration: none;
				}
				a:hover {
					text-decoration: underline;
				}
			</style>
		</head>
		<body>
			<h1>404 Not Found</h1>
			<p>The page you are looking for does not exist.</p>
			<p>Go back to the <a href="/">home page</a>.</p>
		</body>
		</html>`,
		{status: 404, headers: {'Content-Type': 'text/html; charset=utf-8'}}
	)
}

// get preflight and corsify pair
const { preflight, corsify } = cors({origin: ['https://mapcast.xyz', 'http://localhost:3000']})

const router = AutoRouter({
	before: [preflight],  // add preflight upstream
	finally: [corsify],   // and corsify downstream
  });

router
	.get('/', index)
	.get('/claim', claim)
	.get('/claim.gif', claim)
	.all('*', notFound);

// https://github.com/cloudflare/workers-sdk/issues/5420
// https://github.com/cloudflare/workers-sdk/pull/5906
export default { ...router };