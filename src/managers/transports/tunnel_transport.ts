import type { Hono } from "hono";
import { WebSocket } from "partysocket";

import { type ServerTunnel, connectAsServer } from "@/tunnel";
import OutboundBus from "../outbound_bus";

// How many outbound frames are held while the relay is unreachable. partysocket
// buffers sends made during a reconnect and flushes them on reopen; unbounded,
// a long outage would replay every camera movement since it began. A few dozen
// covers a blip and lets a real outage drop history, which for state events
// is the right thing -- a consumer wants where the camera is, not where it was.
const maxEnqueuedFrames = 32;

class TunnelTransport {
	#servers: Set<ServerTunnel>;
	#initialized: boolean = false;

	constructor() {
		this.#servers = new Set();
	}

	async setup(url: string, app: Hono<any>) {
		const websocket = new WebSocket(url, undefined, {
			maxEnqueuedMessages: maxEnqueuedFrames,
		});
		const server = await connectAsServer(websocket);
		server.serve(app);

		// Attached for the life of the process, and never detached on close. The
		// socket is a partysocket: it reconnects on its own, as the same object,
		// and `serve`'s listener survives that -- requests kept working across a
		// drop. This used to detach on `close`, which partysocket also fires for a
		// *failed* attempt, so starting before the relay was up (or any blip after)
		// silently removed the tunnel from the frame fan-out while requests carried
		// on answering. Nothing downstream could tell; the events just stopped.
		this.#attach(server);
	}

	#attach(server: ServerTunnel) {
		this.#ensureSubscribed();
		this.#servers.add(server);
	}

	#ensureSubscribed() {
		if (this.#initialized) return;
		OutboundBus.addEventListener("message", (event) => {
			const payload = (event as MessageEvent).data as string;
			this.#servers.forEach((server) => {
				server.emit("frame", payload);
			});
		});
		this.#initialized = true;
	}
}

export default new TunnelTransport();
