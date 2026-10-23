import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { CaptureStore } from "./store";

test("HTTP routes authenticate reads and receipt; binary response preserves bytes", async () => {
	process.env.SHARED_KEY = "mock";
	const { captureRoutes } = await import("../modules/captures/index");
	const path = await mkdtemp(join(tmpdir(), "capture-route-test-"));
	try {
		const store = new CaptureStore(path);
		await store.initialize();
		const id = randomUUID(),
			jpeg = Buffer.from([255, 216, 255, 224, 0, 2, 255, 217]);
		const metadata = await store.create(id, "garden", Date.now() + 30000, {
			position: async () => ({ pan: 1, tilt: 2, zoom: 3 }),
			image: async () => jpeg,
		});
		const app = captureRoutes(store),
			headers = { Authorization: "ApiKey mock" };
		assert.equal((await app.request(`/${id}`)).status, 401);
		assert.equal((await app.request(`/${id}/image`)).status, 401);
		assert.equal(
			(await app.request(`/${id}/receipt`, { method: "POST" })).status,
			401,
		);
		assert.deepEqual(
			await (await app.request(`/${id}`, { headers })).json(),
			metadata,
		);
		const image = await app.request(`/${id}/image`, { headers });
		assert.equal(image.headers.get("Content-Type"), "image/jpeg");
		assert.deepEqual(Buffer.from(await image.arrayBuffer()), jpeg);
		const receipt = await app.request(`/${id}/receipt`, {
			method: "POST",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ sha256: metadata.sha256 }),
		});
		assert.equal(receipt.status, 200);
		assert.deepEqual(await receipt.json(), {
			id,
			sha256: metadata.sha256,
			delivered: true,
		});
		assert.equal((await app.request(`/not-uuid`, { headers })).status, 400);
		const malformed = await app.request(`/${id}/receipt`, {
			method: "POST",
			headers,
			body: "{",
		});
		assert.equal(malformed.status, 400);
	} finally {
		await rm(path, { recursive: true, force: true });
	}
});

test("PTZ load forwards only PTZ/focus/autofocus with no implicit optical defaults", async () => {
	process.env.SHARED_KEY = "mock";
	const { Hono } = await import("hono");
	const { default: handler } = await import("../modules/ptz/ptz_handler");
	const { targetCameraKey } = await import("../constants");
	const calls: URL[] = [];
	const camera = {
		name: "fake",
		host: "mock-only.invalid",
		client: {
			fetch: async (url: string) => {
				calls.push(new URL(url));
				return new Response("");
			},
		},
	};
	const app = new Hono<any>();
	app.use("*", async (ctx, next) => {
		ctx.set(targetCameraKey, camera);
		await next();
	});
	app.post("/load", ...handler.handle());
	const response = await app.request("/load", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			pan: 1,
			focus: 2,
			autofocus: "off",
			brightness: 999,
			autoiris: "off",
		}),
	});
	assert.equal(response.status, 200);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].hostname, "mock-only.invalid");
	assert.equal(calls[0].searchParams.get("autofocus"), "off");
	assert.equal(calls[0].searchParams.get("focus"), "2");
	assert.equal(calls[0].searchParams.has("brightness"), false);
	assert.equal(calls[0].searchParams.has("autoiris"), false);
	const minimal = await app.request("/load", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ pan: 3 }),
	});
	assert.equal(minimal.status, 200);
	assert.equal(calls[1].searchParams.has("autofocus"), false);
	assert.equal(calls[1].searchParams.has("focus"), false);
});

test("bootstrap export authenticates without a camera header and strips unrelated bot fields", async () => {
	process.env.SHARED_KEY = "mock";
	const path = await mkdtemp(join(tmpdir(), "preset-export-route-"));
	const previous = process.env.PRESETS_IMPORT_PATH;
	try {
		process.env.PRESETS_IMPORT_PATH = join(path, "input.json");
		await writeFile(
			process.env.PRESETS_IMPORT_PATH,
			JSON.stringify({
				garden: {
					presets: { home: { pan: 1, tilt: 2, zoom: 3, password: "secret" } },
					password: "secret",
				},
				customcam: ["garden"],
			}),
		);
		const { default: module } = await import("../modules/presets/index");
		const app = module.Initialize();
		assert.equal((await app.request("/export")).status, 401);
		const response = await app.request("/export", {
			headers: { Authorization: "ApiKey mock" },
		});
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), {
			version: 1,
			cameras: [
				{
					camera: "garden",
					presets: [{ name: "home", position: { pan: 1, tilt: 2, zoom: 3 } }],
				},
			],
		});
	} finally {
		if (previous === undefined) delete process.env.PRESETS_IMPORT_PATH;
		else process.env.PRESETS_IMPORT_PATH = previous;
		await rm(path, { recursive: true, force: true });
	}
});

test("bootstrap export fails closed without a configured external source", async () => {
	process.env.SHARED_KEY = "mock";
	const previous = process.env.PRESETS_IMPORT_PATH;
	try {
		delete process.env.PRESETS_IMPORT_PATH;
		const { default: module } = await import("../modules/presets/index");
		const response = await module.Initialize().request("/export", {
			headers: { Authorization: "ApiKey mock" },
		});
		assert.equal(response.status, 500);
		assert.deepEqual(await response.json(), {
			error: "Unable to read preset bootstrap source",
		});
	} finally {
		if (previous === undefined) delete process.env.PRESETS_IMPORT_PATH;
		else process.env.PRESETS_IMPORT_PATH = previous;
	}
});
