import { readFile, readdir } from "fs/promises";
import { join } from "node:path";

import * as constants from "@/constants";

const ConfigManager = {
	// List functions that pull various configs
	configs: {} as Record<string, any>,

	async LoadAllConfigs(): Promise<void> {
		const configsDir = join(process.cwd(), "configs");
		const files = await readdir(configsDir);
		const jsonFiles = files.filter(f => f.endsWith(".json"));
		
		await Promise.all(jsonFiles.map(async (file) => {
			const configName = file.replace(/\.json$/, "");
			const raw = await readFile(join(configsDir, file), "utf-8");
			const obj = JSON.parse(raw);
			this.configs[configName] = obj;
		}));
	},

	GetCameraConfig(camera: string): any {
		return this.configs[constants.CameraConfigKey][camera];
	},

	GetAllCameraConfigs(): any[] {
		return this.configs[constants.CameraConfigKey];
	},
}

export default ConfigManager;