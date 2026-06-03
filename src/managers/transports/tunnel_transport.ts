import type { Hono } from "hono";
import { WebSocket } from "partysocket";

import { type ServerTunnel, connectAsServer } from "@/tunnel";
import OutboundBus from "../outbound_bus";

class TunnelTransport {
	#servers: Set<ServerTunnel>;
	#initialized: boolean = false;

	constructor() {
		this.#servers = new Set();
	}

	async setup(url: string, app: Hono<any>) {
		const websocket = new WebSocket(url);
		const server = await connectAsServer(websocket);
		server.serve(app);

		this.#attach(server);
		websocket.addEventListener("close", () => this.#detach(server));
	}

	#attach(server: ServerTunnel) {
		this.#ensureSubscribed();
		this.#servers.add(server);
	}

	#detach(server: ServerTunnel) {
		this.#servers.delete(server);
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
