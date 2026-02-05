import { Hono } from "hono";
import { serve } from "@hono/node-server";

import * as constants from "@/constants";
import * as managers from "@/managers";
import type { Module } from "@/modules/module";
import AuthorizationMiddleware from "@/server/middleware/authorization";

interface ServiceConfig {
	serverPort: number;
	websocketPort: number;
	moduleMap: { [key: string]: boolean };
}

class Server {
	// public
	readonly app: Hono<{ Variables: constants.Variables }>;

	// private
	#serviceConfig!: ServiceConfig;
	#modules: { [key: string]: Module } = {};

	constructor() {
		this.app = new Hono<{
			Variables: constants.Variables;
		}>();

		let sharedKey = process.env[constants.sharedKeyKey];
		if (!sharedKey) {
			throw new Error("sharedKey not found in environment");
		}

		this.app.use(AuthorizationMiddleware(sharedKey));
	}

	registerModule(module: Module) {
		if (this.#serviceConfig.moduleMap[module.name]) {
			this.#modules[module.name] = module;
			this.app.route(module.basePath, module.Initialize({}));
		}
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

		// Service setup is also done here even though it's not a manager because manager initialization is the first thing that happens
		let serviceConfig: ServiceConfig =
			managers.ConfigManager.getServiceConfig();
		if (!serviceConfig) {
			throw new Error("Service config not found");
		}

		this.#serviceConfig = serviceConfig;
	}

	async startServer() {
		managers.WebSocketManager.setupWebsocket(this.#serviceConfig.websocketPort);
		serve(
			{
				fetch: this.app.fetch,
				port: this.#serviceConfig.serverPort,
			},
			(info) => {
				console.log(`Server is running on http://localhost:${info.port}`);
			},
		);
	}
}

export default Server;
