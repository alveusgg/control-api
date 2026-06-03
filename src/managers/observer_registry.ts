import * as constants from "@/constants";
import type { Observer, ObserversRegister, TopicsMap } from "@/models";

class ObserverRegistry {
	#observers: ObserversRegister;

	constructor() {
		this.#observers = {
			cameras: {},
			topics: {},
		};
	}

	bootstrap(cameraNames: string[]) {
		setupTopics(this.#observers.topics);
		cameraNames.forEach((name) => {
			this.#observers.cameras[name] = {};
			setupTopics(this.#observers.cameras[name]);
		});
	}

	register(observer: Observer) {
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

	resolve(cameraName: string, topic: string): Observer[] {
		return [
			this.#observers.topics["all"],
			this.#observers.topics[topic],
			this.#observers.cameras[cameraName]?.["all"],
			this.#observers.cameras[cameraName]?.[topic],
		]
			.flat()
			.filter((o): o is Observer => o != undefined);
	}
}

export default new ObserverRegistry();

function setupTopics(topics: TopicsMap) {
	topics["all"] = [];
	for (const [, value] of constants.topicMap) {
		topics[value] = [];
	}
}
