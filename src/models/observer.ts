import type { Camera } from "./camera";

export type CameraTopics = Record<string, string[]>;

export interface Observer {
	cameras: CameraTopics;
	topics: string[];
	name: string;
	handler: (
		camera: Camera,
		topic: string,
		timestamp: number,
		data: any,
	) => void;
}

export type TopicsMap = { [topicName: string]: Observer[] };

export interface ObserversRegister {
	cameras: { [cameraName: string]: TopicsMap };
	topics: TopicsMap;
}

// export const CameraTopicExample: CameraTopics = {
// 	"pushout": [
// 		"ptz",
// 		"heartbeat"
// 	],
// 	"pasture": [
// 		"all"
// 	],
// 	"crows": [
// 		"ptz"
// 	]
// }
