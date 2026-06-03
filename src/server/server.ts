import { serve } from "@hono/node-server";
import { Hono } from "hono";

import * as constants from "@/constants";
import * as managers from "@/managers";
import type { Module } from "@/modules/module";
import { openAPIRouteHandler } from "hono-openapi";

interface ServiceConfig {
	serverPort: number;
	websocketPort: number;
	tunnelUrl?: string;
	moduleMap: { [key: string]: boolean };
}

class Server {
	// public
	readonly app = new Hono<{
		Variables: constants.Variables;
	}>();

	// private
	#serviceConfig!: ServiceConfig;
	#modules: { [key: string]: Module } = {};

	constructor() {}

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

		let allCamSpecs: any[] = managers.ConfigManager.getAllCameraSpecs();
		if (allCamSpecs.length == 0) {
			throw new Error();
		}

		for (const [k, v] of Object.entries(allCamConfigs)) {
			managers.CameraManager.loadCamera(v, allCamSpecs[v.name]);
		}

		// Service setup is also done here even though it's not a manager because manager initialization is the first thing that happens
		let serviceConfig: ServiceConfig =
			managers.ConfigManager.getServiceConfig();
		if (!serviceConfig) {
			throw new Error("Service config not found");
		}

		this.#serviceConfig = serviceConfig;
	}

	bootstrapOpenAPI() {
		this.app.get(
			"/openapi",
			openAPIRouteHandler(this.app, {
				documentation: {
					info: {
						title: "Control API",
						version: "1.0.0",
						description: "API for controlling cameras",
					},
				},
			}),
		);
	}

	async startServer() {
		managers.WsServerTransport.setup(this.#serviceConfig.websocketPort);
		managers.WebSocketManager.bootstrap();
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

	async startServerViaTunnel() {
		if (!this.#serviceConfig.tunnelUrl) return;
		managers.WebSocketManager.bootstrap();
		await managers.TunnelTransport.setup(
			this.#serviceConfig.tunnelUrl,
			this.app,
		);
		console.log(`Tunnel server started on ${this.#serviceConfig.tunnelUrl}`);
	}
}

export default Server;
