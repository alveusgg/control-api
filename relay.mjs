import { WebSocketServer } from "ws";

const PORT = 1230;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
	console.log(`Client connected (total: ${wss.clients.size})`);

	ws.on("message", (data) => {
		const payload = data.toString();
		wss.clients.forEach((client) => {
			if (client !== ws && client.readyState === 1 /* OPEN */) {
				client.send(payload);
			}
		});
	});

	ws.on("close", () => {
		console.log(`Client disconnected (total: ${wss.clients.size})`);
	});
});

console.log(`Relay listening on ws://localhost:${PORT}`);
