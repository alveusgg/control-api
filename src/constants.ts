import type { Camera } from "@/models/camera";

export const cameraHeader = "X-Camera-Name";
export const targetCameraKey = "targetCamera";
export const CameraConfigKey = "cameras";

// Hono context variables
export type Variables = {
	[targetCameraKey]: Camera;
};

export type Env = {
	Variables: Variables;
};
