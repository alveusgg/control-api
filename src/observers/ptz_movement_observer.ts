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
			data: {
				is_moving: true,
			},
		};

		let status = data.is_moving;
		if (status == 0) {
			let url = VAPIXManager.URLBuilder("com/ptz", camera.host, {
				query: "position",
			});

			let response = await VAPIXManager.makeAPICall(url, camera.client);
			let position = formatPosition(await response.text());
			msg.data = {
				is_moving: false,
				position,
			};
		}

		WebSocketManager.sendMessageToClients(msg);
	},
};

export default PTZObserver;
