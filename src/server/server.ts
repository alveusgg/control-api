import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { Module, ModuleServer } from '@/modules/module.js';

class Server {
	// public
	readonly app: Hono = new Hono();

	// private
	private readonly port: number;
	private modules: {[key: string]: Module} = {};

	constructor(port: number) {
		this.port = port;
	}

	registerModule(module: Module): void {
		this.modules[module.name] = module;
		const moduleServer: ModuleServer = {};
		this.app.route(module.basePath, module.Initialize(moduleServer, {}));
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