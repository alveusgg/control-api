import DigestClient from "digest-fetch";
import WebSocket from "ws";

import type { Camera } from "@/models";
import * as constants from "@/constants";
import { WebSocketManager } from "@/managers";

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

	loadCamera(newCamera: cameraConfig): void {
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
		};

		this.#cameras[newCamera.name] = camera;

		if (newCamera.topics.length != 0) {
			connectWebsocket(camera, newCamera.topics);
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

async function connectWebsocket(camera: Camera, topics: string[]) {
	try {
		const response = await camera.client.fetch(
			`http://${camera.host}/axis-cgi/wssession.cgi`,
		);
		if (!response.ok) {
			throw new Error(`Failed to obtain session token: ${response.statusText}`);
		}

		const token = await response.text();
		const wsUrl = `ws://${camera.host}/vapix/ws-data-stream?wssession=${token.trim()}&sources=events`;

		let ws = new WebSocket(wsUrl);

		ws.on("open", () => {
			console.log("WebSocket connected to camera");

			let subscribeMessage = {
				apiVersion: "1.0",
				context: "ptz-events",
				method: "events:configure",
				params: {
					eventFilterList: [] as { topicFilter: string }[],
				},
			};

			topics.forEach((t) => {
				subscribeMessage.params.eventFilterList.push({
					topicFilter: t,
				});
			});

			ws.send(JSON.stringify(subscribeMessage));
		});

		ws.on("message", async (data: Buffer | string) => {
			const messageStr = typeof data === "string" ? data : data.toString();
			const message = JSON.parse(messageStr);

			if (message.method === "events:notify") {
				WebSocketManager.processMessage(camera, message.params.notification);
			} else if (message.method === "events:configure") {
				console.log("Configured websocket:", JSON.stringify(message, null, 2));
			} else {
				console.log("Unexpected Message:", JSON.stringify(message, null, 2));
			}
		});

		ws.on("error", (error: Error) => {
			console.error("WebSocket error:", error);
		});

		ws.on("close", () => {
			console.log("WebSocket closed");
		});
	} catch (error) {
		console.error("Error:", error);
	}
}
