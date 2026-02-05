import { readFile, readdir } from "fs/promises";
import { join } from "node:path";

import * as constants from "@/constants";

class ConfigManager {
	// List functions that pull various configs
	#configs: Record<string, any>;

	constructor() {
		this.#configs = {};
	}

	async loadAllConfigs(): Promise<void> {
		const configsDir = join(process.cwd(), "configs");
		const files = await readdir(configsDir);
		const jsonFiles = files.filter((f) => f.endsWith(".json"));

		await Promise.all(
			jsonFiles.map(async (file) => {
				const configName = file.replace(/\.json$/, "");
				const raw = await readFile(join(configsDir, file), "utf-8");
				const obj = JSON.parse(raw);
				this.#configs[configName] = obj;
			}),
		);
	}

	getCameraConfig(camera: string): any {
		return this.#configs[constants.CameraConfigKey][camera];
	}

	getAllCameraConfigs(): any[] {
		return this.#configs[constants.CameraConfigKey];
	}

	getServiceConfig(): any {
		return this.#configs[constants.ServiceConfigKey];
	}
}

export default new ConfigManager();
