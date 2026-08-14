import DigestClient from "digest-fetch";
import WebSocket from "ws";

import type { Camera, Specs } from "@/models";
import * as constants from "@/constants";
import { EventDispatcher } from "@/managers";

const usernameKey = "_USERNAME";
const passwordKey = "_PASSWORD";

interface cameraConfig {
	name: string;
	host: string;
	capabilities: string[];
	topics: string[];
}

class CameraManager {
	#cameras: Record<string, Camera>;

	constructor() {
		this.#cameras = {};
	}

	loadCamera(newCamera: cameraConfig, specs: Specs): void {
		let username = process.env[newCamera.name.toUpperCase() + usernameKey];
		if (!username) {
			console.log(`Unable to get username for ${newCamera.name} cam`);
			return;
		}

		let password = process.env[newCamera.name.toUpperCase() + passwordKey];
		if (!password) {
			console.log(`Unable to get password for ${newCamera.name} cam`);
			return;
		}

		let camera: Camera = {
			name: newCamera.name,
			host: newCamera.host,
			client: new DigestClient(username, password),
			capabilities: new Set(newCamera.capabilities),
			specs: specs,
		};

		this.#cameras[newCamera.name] = camera;

		if (newCamera.topics.length != 0) {
			// Deliberately not awaited: this now runs for the life of the process,
			// reconnecting on its own. It never rejects -- the loop catches -- so
			// there is no floating rejection to handle.
			void connectWebsocket(camera, newCamera.topics);
		}
	}

	getCamera(camera: string): Camera | undefined {
		return this.#cameras[camera];
	}

	getCameras(): Record<string, Camera> {
		return this.#cameras;
	}
}

export default new CameraManager();

// Reconnect backoff for a camera's event stream. Grows to the cap so a camera
// that is switched off doesn't get hammered, and a brief blip recovers quickly.
const reconnectMinMs = 1_000;
const reconnectMaxMs = 30_000;

// A connection that survived this long is treated as having worked, so the next
// failure starts from the short delay again. Without it, a stream that drops
// once an hour would creep up to the cap and stay there.
const healthyMs = 60_000;

// unref'd so a pending reconnect never holds the process open on shutdown. The
// HTTP and WebSocket servers are what keep cams4 alive; this loop should not.
const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms).unref());

/**
 * Keep a camera's event stream connected, for the life of the process.
 *
 * This loop is the whole point. A camera reboot -- or an expired session token,
 * or any network blip -- closes the socket, and until this existed nothing ever
 * dialled back: `close` logged a line and the events for that camera were gone
 * until cams4 itself was restarted. Nothing downstream can detect that, because
 * a camera that stopped reporting looks exactly like a camera that stopped
 * moving. It cost a live debugging session to find, so it must stay.
 */
async function connectWebsocket(camera: Camera, topics: string[]) {
	let backoff = reconnectMinMs;

	for (;;) {
		const startedAt = Date.now();
		try {
			await runEventStream(camera, topics);
		} catch (error) {
			console.error(`[${camera.name}] event stream failed:`, error);
		}

		if (Date.now() - startedAt >= healthyMs) {
			backoff = reconnectMinMs;
		}

		console.log(`[${camera.name}] event stream reconnecting in ${backoff}ms`);
		await sleep(backoff);
		backoff = Math.min(backoff * 2, reconnectMaxMs);
	}
}

/** One connection attempt. Resolves when the socket closes, throws if it can't open. */
async function runEventStream(camera: Camera, topics: string[]): Promise<void> {
	// Fetched fresh on every attempt: a wssession token belongs to one session,
	// so a reconnect that reuses the old one is rejected and would retry forever.
	const response = await camera.client.fetch(
		`http://${camera.host}/axis-cgi/wssession.cgi`,
	);
	if (!response.ok) {
		throw new Error(
			`failed to obtain session token: ${response.status} ${response.statusText}`,
		);
	}

	const token = (await response.text()).trim();
	const wsUrl = `ws://${camera.host}/vapix/ws-data-stream?wssession=${token}&sources=events`;
	const ws = new WebSocket(wsUrl);

	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			if (error) reject(error);
			else resolve();
		};

		ws.on("open", () => {
			const filters = buildEventFilters(camera, topics);
			if (filters.length === 0) {
				// Subscribing to nothing yields a socket that stays open and
				// silent forever, which is indistinguishable from a working one.
				finish(new Error(`no known topics in [${topics.join(", ")}]`));
				ws.close();
				return;
			}

			console.log(
				`[${camera.name}] event stream connected, subscribing to ` +
					filters.map((f) => f.topicFilter).join(", "),
			);

			ws.send(
				JSON.stringify({
					apiVersion: "1.0",
					context: "ptz-events",
					method: "events:configure",
					params: { eventFilterList: filters },
				}),
			);
		});

		ws.on("message", (data: Buffer | string) => {
			const messageStr = typeof data === "string" ? data : data.toString();
			let message;
			try {
				message = JSON.parse(messageStr);
			} catch {
				console.warn(
					`[${camera.name}] non-JSON event frame: ${messageStr.slice(0, 200)}`,
				);
				return;
			}

			if (message.method === "events:notify") {
				try {
					EventDispatcher.dispatch(camera, message.params.notification);
				} catch (error) {
					// One unroutable topic must not take the stream down with it.
					console.error(`[${camera.name}] dispatch failed:`, error);
				}
			} else if (message.method === "events:configure") {
				if (message.error) {
					console.error(
						`[${camera.name}] subscription rejected:`,
						JSON.stringify(message.error),
					);
				}
			} else {
				console.log(
					`[${camera.name}] unexpected event frame:`,
					JSON.stringify(message),
				);
			}
		});

		ws.on("error", (error: Error) => {
			console.error(`[${camera.name}] event stream error:`, error.message);
			finish(error);
		});

		ws.on("close", (code: number, reason: Buffer) => {
			const why = reason?.length ? `: ${reason.toString()}` : "";
			console.log(`[${camera.name}] event stream closed (${code}${why})`);
			finish();
		});
	});
}

function buildEventFilters(camera: Camera, topics: string[]) {
	const filters: { topicFilter: string }[] = [];
	topics.forEach((t) => {
		const mapped = constants.reverseTopicMap.get(t);
		if (!mapped) {
			// Previously this produced the literal filter "undefined//.", which the
			// camera accepts and then never matches -- a silent subscription to
			// nothing.
			console.warn(`[${camera.name}] unknown topic "${t}", ignoring`);
			return;
		}
		filters.push({ topicFilter: `${mapped}//.` });
	});
	return filters;
}
