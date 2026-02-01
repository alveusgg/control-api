import type { Camera } from "@/models";

export const cameraHeader = "X-Camera-Name";
export const targetCameraKey = "targetCamera";
export const CameraConfigKey = "cameras";

export const allCameraTopicKey = "all";

// prettier-ignore
export const topicMap = new Map([
	["tns1:PTZController/tnsaxis:Move", "ptz"],
	["tns1:VideoSource/tnsaxis:DayNightVision", "ir"],
	["tns1:Device/tnsaxis:Monitor/Heartbeat", "heartbeat"],
]);

// Hono context variables
export type Variables = {
	[targetCameraKey]: Camera;
};

export type Env = {
	Variables: Variables;
};
