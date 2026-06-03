import type { Camera, Observer, Message } from "@/models";
import { OutboundBus, VAPIXManager } from "@/managers";
import { formatQueryResponse, getFOV } from "@/utils";

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

		let is_moving: boolean;
		let info: Record<string, any>;

		if (data.is_moving == 1) {
			let param = "PTZ.Various.V1.MaxProportionalSpeed";
			let url = VAPIXManager.URLBuilder(camera.host, "com/ptz", {
				query: "speed",
			});

			let response;
			try {
				response = await VAPIXManager.makeAPICall(camera.client, url);
			} catch (error) {
				msg.data = error;
				OutboundBus.broadcast(msg);
				return;
			}

			if (!response.ok) {
				msg.data = await response.text();
				OutboundBus.broadcast(msg);
				return;
			}

			info = formatQueryResponse(await response.text());

			url = VAPIXManager.URLBuilder(camera.host, "param", {
				action: "list",
				group: param,
			});

			try {
				response = await VAPIXManager.makeAPICall(camera.client, url);
			} catch (error) {
				msg.data = error;
				OutboundBus.broadcast(msg);
				return;
			}

			if (!response.ok) {
				msg.data = await response.text();
				OutboundBus.broadcast(msg);
				return;
			}

			const proportionalSpeed = formatQueryResponse(await response.text());
			info.proportional_speed = proportionalSpeed[param];
			is_moving = true;
		} else {
			let url = VAPIXManager.URLBuilder(camera.host, "com/ptz", {
				query: "position",
			});

			let response;
			try {
				response = await VAPIXManager.makeAPICall(camera.client, url);
			} catch (error) {
				msg.data = error;
				OutboundBus.broadcast(msg);
				return;
			}

			if (!response.ok) {
				msg.data = await response.text();
				OutboundBus.broadcast(msg);
				return;
			}

			info = formatQueryResponse(await response.text());
			info.fov = getFOV(info.pan, info.tilt, info.zoom, camera);

			is_moving = false;
		}

		msg.data = {
			is_moving: is_moving,
			info,
		};

		OutboundBus.broadcast(msg);
	},
};

export default PTZObserver;
