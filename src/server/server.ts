import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { Module } from '@/modules/module';
import * as constants from '@/constants';
import * as managers from '@/managers';


interface ServiceConfig {
	port: number;
	moduleMap: {[key: string]: boolean}
}


class Server {
	// public
	readonly app: Hono<{ Variables: constants.Variables }> = new Hono<{ Variables: constants.Variables }>();

	// private
	private readonly port: number;
	private modules: {[key: string]: Module} = {};

	constructor(port: number) {
		this.port = port;
	}

	registerModule(module: Module): void {
		this.modules[module.name] = module;
		this.app.route(module.basePath, module.Initialize({}));
	}

	async initializeManagers(): Promise<void> {
		await managers.ConfigManager.LoadAllConfigs();

		let allCamConfigs: any[] = managers.ConfigManager.GetAllCameraConfigs()
		// check that it's not empty

		for (const [k, v] of Object.entries(allCamConfigs)) {
			managers.CameraManager.LoadCamera(v)
		}

	}

	startServer(): void {
		serve({
			fetch: this.app.fetch,
			port: this.port
		}, (info) => {
			console.log(`Server is running on http://localhost:${info.port}`);
		})
	}
}

export default Server;