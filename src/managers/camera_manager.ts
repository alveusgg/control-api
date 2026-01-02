import * as z from "zod";

import type { Camera } from '@/models/camera'; 

const usernameKey = "_USERNAME";
const passwordKey = "_PASSWORD";


interface cameraConfig {
	name: string;
	address: string;
	capabilities: string[];
}

const panAdapter = z.object({ 
	degrees: z.number().min(-180.0)
	.and(z.number().max(180.0)),
});

var CameraManager = {
	cameras: {} as Record<string, Camera>,

	LoadCamera(newCamera: cameraConfig): void {
		let username = process.env[newCamera.name.toUpperCase() + usernameKey];
		if (!username) {
			console.log(`Unable to get username for ${newCamera.name} cam`);
			return;
		}

		let password = process.env[newCamera.name.toUpperCase() + passwordKey];
		if (!password) {
			console.log(`Unable to get password for ${newCamera.name} cam`);
			return;
		}

		this.cameras[newCamera.name] = {
			name: newCamera.name,
			address: newCamera.address,
			login: btoa(`${username}:${password}`),
			capabilities: new Set(newCamera.capabilities)
		};
	},

	GetCamera(camera: string): Camera | undefined {
		return this.cameras[camera];
	},
}

export default CameraManager;