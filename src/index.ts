import { Hono } from 'hono'
import Server from '@/server/server.js';



function main(): void {
	let server = new Server(3000);

	server.app.get('/', (c) => {
		return c.text('Hello Hono!')
	})
}

main();