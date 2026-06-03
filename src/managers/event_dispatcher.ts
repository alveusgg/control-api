import type { Camera, RawMessage } from "@/models";
import { mapTopicToFriendlyName } from "@/utils";
import ObserverRegistry from "./observer_registry";

class EventDispatcher {
	#topicCache: Map<string, string>;

	constructor() {
		this.#topicCache = new Map<string, string>();
	}

	dispatch(camera: Camera, message: RawMessage) {
		let topic = this.#topicCache.get(message.topic);
		if (!topic) {
			const resolved = mapTopicToFriendlyName(message.topic);
			if (!resolved) {
				throw new Error("topic does not exist");
			}
			topic = resolved;
			this.#topicCache.set(message.topic, topic);
		}

		ObserverRegistry.resolve(camera.name, topic).forEach((o) =>
			o.handler(camera, topic, message.timestamp, message.message.data),
		);
	}
}

export default new EventDispatcher();
