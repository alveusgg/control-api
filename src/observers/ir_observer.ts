import type { Camera, Observer, Message } from "@/models";
import { WebSocketManager } from "@/managers";

const IRObserver: Observer = {
	name: "ptz movement",
	cameras: {},
	topics: ["ir"],
	handler: async (
		camera: Camera,
		topic: string,
		timestamp: number,
		data: any,
	) => {
		let msg: Message = {
			camera: camera.name,
			timestamp: timestamp,
			event: topic,
			data: {
				status: data.day == 1 ? "disabled" : "enabled",
			},
		};

		WebSocketManager.sendMessageToClients(msg);
	},
};

export default IRObserver;
