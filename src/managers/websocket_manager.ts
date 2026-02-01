import { WebSocket, WebSocketServer } from "ws";

import type {
	Camera,
	Message,
	Observer,
	ObserversRegister,
	RawMessage,
	TopicsMap,
} from "@/models";
import { CameraManager } from ".";
import { PTZObserver, IRObserver } from "@/observers";
import { topicMap } from "@/constants";
import { mapTopicToFriendlyName } from "@/utils";

const observers: Observer[] = [PTZObserver, IRObserver];

class WebSocketManager {
	wss: InstanceType<typeof WebSocketServer> = new WebSocketServer({
		port: 43278,
	}); // Gets immediately overwritten at runtime with the real server config

	#observers: ObserversRegister;
	#topicCache: Map<string, string>;

	constructor() {
		this.#topicCache = new Map<string, string>();
		this.#observers = {
			cameras: {},
			topics: {},
		};
	}

	setupWebsocket(port: number) {
		this.wss = new WebSocketServer({ port: port });

		this.wss.on("connection", (ws) => {
			console.log("Client connected");

			ws.send("Successfully connected to websocket");
		});

		setupTopics(this.#observers.topics);
		Object.values(CameraManager.getCameras()).forEach((m) => {
			this.#observers.cameras[m.name] = {};
			setupTopics(this.#observers.cameras[m.name]);
		});

		observers.forEach((o) => {
			this.registerObserver(o);
		});
	}

	sendMessageToClients(msg: Message) {
		this.wss.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(msg));
			}
		});
	}

	registerObserver(observer: Observer) {
		Object.entries(observer.cameras).forEach(([camera, topics]) => {
			topics.forEach((topic) => {
				if (this.#observers.cameras[camera][topic] == undefined) {
					this.#observers.cameras[camera][topic] = [];
				}

				this.#observers.cameras[camera][topic].push(observer);
			});
		});
		observer.topics.forEach((topic) => {
			this.#observers.topics[topic].push(observer);
		});
	}

	processMessage(camera: Camera, message: RawMessage) {
		// console.log(message)
		let topic = this.#topicCache.get(message.topic);
		if (!topic) {
			topic = mapTopicToFriendlyName(message.topic);
			if (!topic) {
				throw new Error("topic does not exist");
			} else {
				this.#topicCache.set(message.topic, topic);
			}
		}

		const observerGroups = [
			this.#observers.topics["all"],
			this.#observers.topics[topic],
			this.#observers.cameras[camera.name]["all"],
			this.#observers.cameras[camera.name][topic],
		];

		observerGroups
			.flat()
			.forEach((o) =>
				o.handler(camera, topic, message.timestamp, message.message.data),
			);
	}
}

export default new WebSocketManager();

function setupTopics(topics: TopicsMap) {
	topics["all"] = [];
	for (const [key, value] of topicMap) {
		topics[value] = [];
	}
}
