import 'dotenv/config';

import { modules } from '@/modules/module';
import Server from '@/server/server';

async function main(): Promise<void> {
	let server = new Server(3000);

	await server.initializeManagers();

	// Register modules
	modules.forEach((m) => {
		server.registerModule(m);
	});


	server.startServer();
}

main();