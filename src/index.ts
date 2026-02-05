import "dotenv/config";

import { modules } from "@/modules/module";
import Server from "@/server/server";
import { ConfigManager } from "./managers";

async function main(): Promise<void> {
	let server = new Server();

	await server.initializeManagers();

	// Register modules
	modules.forEach((m) => {
		server.registerModule(m);
	});

	server.startServer();
}

main();
