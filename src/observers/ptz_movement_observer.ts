import type { Camera, Observer, Message } from "@/models";
import { WebSocketManager, VAPIXManager } from "@/managers";
import { formatPosition } from "@/utils";

const PTZObserver: Observer = {
	name: "ptz movement",
	cameras: {},
	// example so I don't forget
	// {
	// 	"pushpopoutdoor": [
	// 		"ptz"
	// 	]
	// },
	topics: ["ptz"],
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
			data: {},
		};

		let is_moving = false;
		let query = "position";

		if (data.is_moving == 1) {
			query = "speed";
			is_moving = true;
		}

		let url = VAPIXManager.URLBuilder("com/ptz", camera.host, {
			query: query,
		});

		let response = await VAPIXManager.makeAPICall(url, camera.client);
		let info = formatPosition(await response.text());
		msg.data = {
			is_moving: false,
			info,
		};

		WebSocketManager.sendMessageToClients(msg);
	},
};

export default PTZObserver;
