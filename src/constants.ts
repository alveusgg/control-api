import type { Camera } from "@/models";

export const cameraHeader = "X-Camera-Name";
export const targetCameraKey = "targetCamera";
export const CameraConfigKey = "cameras";
export const ServiceConfigKey = "service";

export const allCameraTopicKey = "all";
export const sharedKeyKey = "SHARED_KEY";

// prettier-ignore
export const topicMap = new Map([
	["tns1:PTZController/tnsaxis:Move", "ptz"],
	["tns1:VideoSource/tnsaxis:DayNightVision", "ir"],
	["tns1:Device/tnsaxis:Monitor/Heartbeat", "heartbeat"],
]);

// Extremely lazy way to do this until I do something better
// prettier-ignore
export const reverseTopicMap = new Map([
	["ptz", "tns1:PTZController/tnsaxis:Move"],
	["ir", "tns1:VideoSource/tnsaxis:DayNightVision"],
	["heartbeat", "tns1:Device/tnsaxis:Monitor/Heartbeat"],
]);

// Hono context variables
export type Variables = {
	[targetCameraKey]: Camera;
};

export type Env = {
	Variables: Variables;
};
