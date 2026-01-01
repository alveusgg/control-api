import type { Camera } from '@/models/camera';

interface cameraConfig {
	name: string;
	address: string;
	username: string;
	password: string;
	capabilities: string[];
}

var CameraManager = {
	cameras: {} as Record<string, Camera>,

	// Login will be pulled from a .env instead of just being in the JSON
	LoadCamera(newCamera: cameraConfig): void {
		this.cameras[newCamera.name] = {
			name: newCamera.name,
			address: newCamera.address,
			login: btoa(`${newCamera.username}:${newCamera.password}`),
			capabilities: new Set(newCamera.capabilities)
		}
	},

	GetCamera(camera: string): Camera {
		return this.cameras[camera]
	},
}

export default CameraManager;