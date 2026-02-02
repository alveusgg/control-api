import { Hono } from "hono";
import { serve } from "@hono/node-server";

import * as constants from "@/constants";
import * as managers from "@/managers";
import type { Module } from "@/modules/module";

interface ServiceConfig {
	port: number;
	moduleMap: { [key: string]: boolean };
}

class Server {
	// public
	readonly app: Hono<{ Variables: constants.Variables }> = new Hono<{
		Variables: constants.Variables;
	}>();

	// private
	readonly #serverPort: number;
	readonly #websocketPort: number;
	#modules: { [key: string]: Module } = {};

	constructor(serverPort: number, websocketPort: number) {
		this.#serverPort = serverPort;
		this.#websocketPort = websocketPort;
	}

	registerModule(module: Module) {
		this.#modules[module.name] = module;
		this.app.route(module.basePath, module.Initialize({}));
	}

	async initializeManagers() {
		await managers.ConfigManager.loadAllConfigs();

		let allCamConfigs: any[] = managers.ConfigManager.getAllCameraConfigs();
		if (allCamConfigs.length == 0) {
			throw new Error();
		}

		for (const [k, v] of Object.entries(allCamConfigs)) {
			managers.CameraManager.loadCamera(v);
		}

		managers.WebSocketManager.setupWebsocket(this.#websocketPort);
	}

	async startServer() {
		serve(
			{
				fetch: this.app.fetch,
				port: this.#serverPort,
			},
			(info) => {
				console.log(`Server is running on http://localhost:${info.port}`);
			},
		);
	}
}

export default Server;
