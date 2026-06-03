import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

import * as constants from "@/constants";
import OutboundBus from "../outbound_bus";

class WsServerTransport {
	wss!: WebSocketServer;
	#initialized: boolean = false;

	setup(port: number) {
		if (this.#initialized) return;
		const sharedKey = process.env[constants.sharedKeyKey] ?? "";
		if (!sharedKey) {
			throw new Error("sharedKey not found in environment");
		}
		const sharedKeyBuffer = Buffer.from(sharedKey, "utf8");

		this.wss = new WebSocketServer({ port: port });
		this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
			this.#handleConnection(ws, req, sharedKeyBuffer);
		});

		OutboundBus.addEventListener("message", (event) => {
			const payload = (event as MessageEvent).data as string;
			this.wss.clients.forEach((client) => {
				if (client.readyState === WebSocket.OPEN) {
					client.send(payload);
				}
			});
		});

		this.#initialized = true;
	}

	#handleConnection(ws: WebSocket, req: IncomingMessage, expected: Buffer) {
		const url = new URL(req.url ?? "", `http://${req.headers.host}`);
		const authParam = url.searchParams.get("authorization");
		const [type, key] = authParam?.split(" ") ?? [];
		const keyBuffer = Buffer.from(key ?? "", "utf8");

		if (
			type !== "ApiKey" ||
			keyBuffer.length !== expected.length ||
			!timingSafeEqual(keyBuffer, expected)
		) {
			ws.close(4401, "Unauthorized");
			return;
		}

		console.log("Client connected");
		ws.send("Successfully connected to websocket");
	}
}

export default new WsServerTransport();
