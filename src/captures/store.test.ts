import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
	CaptureError,
	CaptureStore,
	MAX_IMAGE_SIZE,
	type CaptureCamera,
	type Position,
} from "./store";
import { exportPresets } from "./export";

const jpeg = Buffer.from([255, 216, 255, 224, 0, 2, 255, 217]);
const position = { pan: 1, tilt: 2, zoom: 3, autofocus: "on" as const };
async function fixture(
	fn: (store: CaptureStore, path: string) => Promise<void>,
) {
	const path = await mkdtemp(join(tmpdir(), "capture-test-"));
	const store = new CaptureStore(path, () => 1000);
	await store.initialize();
	try {
		await fn(store, path);
	} finally {
		await rm(path, { recursive: true, force: true });
	}
}
function source(): CaptureCamera {
	return { position: async () => position, image: async () => jpeg };
}
function status(code: number) {
	return (error: unknown) =>
		error instanceof CaptureError && error.status === code;
}

test("capture persists exact bytes and replay survives restart and expired deadline", async () =>
	fixture(async (store, path) => {
		const id = randomUUID();
		const original = await store.create(id, "garden", 2000, source());
		assert.deepEqual(await store.image(id), jpeg);
		assert.equal(original.position.focus, undefined);
		const restarted = new CaptureStore(path, () => 999999);
		await restarted.initialize();
		const noReads = {
			position: async () => {
				throw Error("must not recapture");
			},
			image: async () => {
				throw Error("must not recapture");
			},
		};
		assert.deepEqual(
			await restarted.create(id, "garden", 2000, noReads),
			original,
		);
		await assert.rejects(
			restarted.create(id, "fox", 2000, noReads),
			status(409),
		);
	}));
test("new expired or unbounded deadline never reads camera", async () =>
	fixture(async (store) => {
		let reads = 0;
		const camera = {
			position: async () => {
				reads++;
				return position;
			},
			image: async () => jpeg,
		};
		await assert.rejects(
			store.create(randomUUID(), "garden", 1000, camera),
			status(410),
		);
		await assert.rejects(
			store.create(randomUUID(), "garden", 61001, camera),
			status(400),
		);
		assert.equal(reads, 0);
	}));
test("concurrent same ID reads camera once", async () =>
	fixture(async (store) => {
		let captures = 0;
		const camera = {
			position: async () => position,
			image: async () => {
				captures++;
				await new Promise((resolve) => setTimeout(resolve, 10));
				return jpeg;
			},
		};
		const id = randomUUID();
		const [a, b] = await Promise.all([
			store.create(id, "garden", 2000, camera),
			store.create(id, "garden", 2000, camera),
		]);
		assert.deepEqual(a, b);
		assert.equal(captures, 1);
	}));
test("different IDs on one camera serialize position-image-position", async () =>
	fixture(async (store) => {
		const calls: string[] = [];
		const camera = {
			position: async () => {
				calls.push("position");
				return position;
			},
			image: async () => {
				calls.push("image");
				await new Promise((resolve) => setTimeout(resolve, 5));
				return jpeg;
			},
		};
		await Promise.all([
			store.create(randomUUID(), "garden", 2000, camera),
			store.create(randomUUID(), "garden", 2000, camera),
		]);
		assert.deepEqual(calls, [
			"position",
			"image",
			"position",
			"position",
			"image",
			"position",
		]);
	}));
for (const field of [
	"pan",
	"tilt",
	"zoom",
	"focus",
	"brightness",
	"autofocus",
	"autoiris",
] as const) {
	test(`reject changed ${field} without publishing`, async () =>
		fixture(async (store) => {
			let reads = 0;
			const id = randomUUID();
			const camera = {
				position: async () => {
					reads++;
					return reads === 1
						? position
						: ({
								...position,
								[field]:
									field === "autofocus" || field === "autoiris" ? "off" : 55,
							} as Position);
				},
				image: async () => jpeg,
			};
			await assert.rejects(
				store.create(id, "garden", 2000, camera),
				status(409),
			);
			await assert.rejects(store.get(id), status(404));
		}));
}
test("receipt is hash-bound, idempotent and survives restart; bytes retained", async () =>
	fixture(async (store, path) => {
		const id = randomUUID(),
			capture = await store.create(id, "garden", 2000, source());
		await assert.rejects(store.receipt(id, "a".repeat(64)), status(409));
		const receipt = await store.receipt(id, capture.sha256);
		assert.deepEqual(await store.receipt(id, capture.sha256), receipt);
		const restarted = new CaptureStore(path);
		await restarted.initialize();
		assert.deepEqual(await restarted.receipt(id, capture.sha256), receipt);
		assert.deepEqual(await restarted.image(id), jpeg);
	}));
test("corrupt persisted JPEG fails initialization", async () =>
	fixture(async (store, path) => {
		const id = randomUUID();
		await store.create(id, "garden", 2000, source());
		await writeFile(join(path, id, "image.jpg"), Buffer.from("broken"));
		await assert.rejects(new CaptureStore(path).initialize());
	}));
test("invalid JPEG and oversized image never publish", async () =>
	fixture(async (store) => {
		for (const bytes of [
			Buffer.from("bad"),
			Buffer.alloc(MAX_IMAGE_SIZE + 1),
		]) {
			const id = randomUUID();
			await assert.rejects(
				store.create(id, "garden", 2000, {
					...source(),
					image: async () => bytes,
				}),
				status(502),
			);
			await assert.rejects(store.get(id), status(404));
		}
	}));
test("invalid/path traversal IDs cannot escape storage", async () =>
	fixture(async (store) => {
		for (const id of ["../outside", "not-an-id"]) {
			await assert.rejects(store.get(id), status(400));
		}
	}));
test("corrupt metadata fails initialization", async () =>
	fixture(async (store, path) => {
		const id = randomUUID();
		await store.create(id, "garden", 2000, source());
		const file = join(path, id, "metadata.json");
		const metadata = JSON.parse(await readFile(file, "utf8"));
		metadata.sha256 = "b".repeat(64);
		await writeFile(file, JSON.stringify(metadata));
		await assert.rejects(new CaptureStore(path).initialize());
	}));
test("export whitelists merger and bot formats without unrelated state", () => {
	const merger = exportPresets({
		garden: [{ name: "home", ...position, password: "SECRET" }],
	});
	const bot = exportPresets({
		garden: {
			presets: { home: { ...position, username: "SECRET" } },
			password: "SECRET",
		},
		blockedUsers: { alice: true },
		customcam: ["garden", "fox"],
		cloudServer: "space",
		layoutpresets: { example: { list: [] } },
	});
	assert.deepEqual(merger, bot);
	assert.equal(JSON.stringify(bot).includes("SECRET"), false);
	assert.deepEqual(bot.cameras[0].presets[0].position, position);
	assert.throws(() => exportPresets({ garden: [{ name: "broken", pan: 1 }] }));
});

test("missing committed metadata is corruption, never permission to recapture", async () =>
	fixture(async (store, path) => {
		const id = randomUUID();
		await store.create(id, "garden", 2000, source());
		await unlink(join(path, id, "metadata.json"));
		let reads = 0;
		await assert.rejects(
			store.create(id, "garden", 2000, {
				position: async () => {
					reads++;
					return position;
				},
				image: async () => jpeg,
			}),
		);
		assert.equal(reads, 0);
		await assert.rejects(new CaptureStore(path).initialize());
	}));
test("deadline is checked again after delayed position read before taking screenshot", async () => {
	const path = await mkdtemp(join(tmpdir(), "capture-deadline-test-"));
	let now = 1000,
		images = 0;
	const store = new CaptureStore(path, () => now);
	await store.initialize();
	try {
		await assert.rejects(
			store.create(randomUUID(), "garden", 2000, {
				position: async () => {
					now = 2001;
					return position;
				},
				image: async () => {
					images++;
					return jpeg;
				},
			}),
			status(410),
		);
		assert.equal(images, 0);
	} finally {
		await rm(path, { recursive: true, force: true });
	}
});

test("image read crossing the deadline cannot publish metadata rejected by site", async () => {
	const path = await mkdtemp(join(tmpdir(), "capture-late-image-"));
	let now = 1000;
	const store = new CaptureStore(path, () => now);
	await store.initialize();
	const id = randomUUID();
	try {
		await assert.rejects(
			store.create(id, "garden", 2000, {
				position: async () => position,
				image: async () => {
					now = 2001;
					return jpeg;
				},
			}),
			status(410),
		);
		await assert.rejects(store.get(id), status(404));
	} finally {
		await rm(path, { recursive: true, force: true });
	}
});
