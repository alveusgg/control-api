import { createHash, randomUUID } from "node:crypto";
import {
	mkdir,
	open,
	readdir,
	readFile,
	rename,
	rm,
	stat,
} from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";

export const positionSchema = z.object({
	pan: z.number().finite(),
	tilt: z.number().finite(),
	zoom: z.number().finite(),
	focus: z.number().finite().optional(),
	brightness: z.number().finite().optional(),
	autofocus: z.enum(["on", "off"]).optional(),
	autoiris: z.enum(["on", "off"]).optional(),
});
export const metadataSchema = z.object({
	id: z.uuid(),
	camera: z.string().min(1),
	position: positionSchema,
	sha256: z.string().regex(/^[a-f0-9]{64}$/),
	size: z
		.number()
		.int()
		.positive()
		.max(10 * 1024 * 1024),
	contentType: z.literal("image/jpeg"),
	capturedAt: z.iso.datetime(),
});
export type Capture = z.infer<typeof metadataSchema>;
export type Position = z.infer<typeof positionSchema>;
export interface CaptureCamera {
	position(): Promise<Position>;
	image(): Promise<Uint8Array>;
}
export class CaptureError extends Error {
	status: 400 | 404 | 409 | 410 | 502;
	constructor(status: 400 | 404 | 409 | 410 | 502, message: string) {
		super(message);
		this.status = status;
	}
}
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export function imageHash(bytes: Uint8Array) {
	return createHash("sha256").update(bytes).digest("hex");
}
export function validateImage(bytes: Uint8Array) {
	if (
		bytes.length < 4 ||
		bytes.length > MAX_IMAGE_SIZE ||
		bytes[0] !== 255 ||
		bytes[1] !== 216 ||
		bytes[2] !== 255 ||
		bytes.at(-2) !== 255 ||
		bytes.at(-1) !== 217
	)
		throw new CaptureError(502, "Invalid or oversized JPEG");
}
async function syncDirectory(path: string) {
	const handle = await open(path, "r");
	try {
		await handle.sync();
	} finally {
		await handle.close();
	}
}
async function writeDurable(path: string, data: string | Uint8Array) {
	const handle = await open(path, "wx", 0o600);
	try {
		await handle.writeFile(data);
		await handle.sync();
	} finally {
		await handle.close();
	}
}
export class CaptureStore {
	private locks = new Map<string, Promise<unknown>>();
	readonly path: string;
	private now: () => number;
	constructor(path: string, now = Date.now) {
		this.path = path;
		this.now = now;
	}
	async initialize() {
		await mkdir(this.path, { recursive: true, mode: 0o700 });
		for (const entry of await readdir(this.path, { withFileTypes: true })) {
			// Unpublished staging directories are never served or reused.
			if (entry.name.startsWith(".pending-")) continue;
			if (!entry.isDirectory() || !z.uuid().safeParse(entry.name).success)
				throw new Error("Unexpected capture storage entry");
			await this.get(entry.name);
			await this.image(entry.name);
			const receipt = await this.readReceipt(entry.name);
			if (receipt && receipt.sha256 !== (await this.get(entry.name)).sha256)
				throw new Error("Corrupt capture receipt");
		}
	}
	private async serialized<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const previous = this.locks.get(key) ?? Promise.resolve();
		const next = previous.catch(() => {}).then(fn);
		this.locks.set(key, next);
		try {
			return await next;
		} finally {
			if (this.locks.get(key) === next) this.locks.delete(key);
		}
	}
	private checkedId(id: string) {
		if (!z.uuid().safeParse(id).success)
			throw new CaptureError(400, "Invalid capture ID");
		return id;
	}
	async get(id: string): Promise<Capture> {
		const path = join(this.path, this.checkedId(id), "metadata.json");
		let raw: string;
		try {
			raw = await readFile(path, "utf8");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") {
				try {
					await stat(join(this.path, id));
				} catch (missing) {
					if ((missing as NodeJS.ErrnoException).code === "ENOENT")
						throw new CaptureError(404, "Capture not found");
					throw missing;
				}
				throw new Error("Corrupt capture: missing metadata");
			}
			throw error;
		}
		const capture = metadataSchema.parse(JSON.parse(raw));
		if (capture.id !== id) throw new Error("Corrupt capture ID");
		return capture;
	}
	async image(id: string) {
		const capture = await this.get(id);
		const bytes = await readFile(join(this.path, id, "image.jpg"));
		validateImage(bytes);
		if (bytes.length !== capture.size || imageHash(bytes) !== capture.sha256)
			throw new Error("Corrupt capture image");
		return bytes;
	}
	async create(
		id: string,
		camera: string,
		expiresAt: number,
		source: CaptureCamera,
	): Promise<Capture> {
		this.checkedId(id);
		return this.serialized(id, async () => {
			try {
				const existing = await this.get(id);
				if (existing.camera !== camera)
					throw new CaptureError(409, "Capture belongs to another camera");
				await this.image(id);
				return existing;
			} catch (error) {
				if (!(error instanceof CaptureError && error.status === 404))
					throw error;
			}
			const remaining = expiresAt - this.now();
			if (!Number.isFinite(expiresAt) || remaining > 60000)
				throw new CaptureError(
					400,
					"Capture deadline must be within 60 seconds",
				);
			if (remaining <= 0)
				throw new CaptureError(410, "Capture deadline expired");
			return this.serialized(`camera:${camera}`, async () => {
				if (expiresAt <= this.now())
					throw new CaptureError(410, "Capture deadline expired");
				const before = positionSchema.parse(await source.position());
				if (expiresAt <= this.now())
					throw new CaptureError(410, "Capture deadline expired");
				const bytes = await source.image();
				validateImage(bytes);
				const capturedAtTime = this.now();
				// The website only accepts captures inside the original save window.
				if (capturedAtTime > expiresAt)
					throw new CaptureError(410, "Capture deadline expired");
				const capturedAt = new Date(capturedAtTime).toISOString();
				const after = positionSchema.parse(await source.position());
				if (
					Object.keys({ ...before, ...after }).some(
						(key) =>
							before[key as keyof Position] !== after[key as keyof Position],
					)
				)
					throw new CaptureError(409, "Camera changed during capture");
				const capture: Capture = {
					id,
					camera,
					position: before,
					sha256: imageHash(bytes),
					size: bytes.length,
					contentType: "image/jpeg",
					capturedAt,
				};
				const staging = join(this.path, `.pending-${randomUUID()}`);
				await mkdir(staging, { mode: 0o700 });
				try {
					await writeDurable(join(staging, "image.jpg"), bytes);
					await writeDurable(
						join(staging, "metadata.json"),
						JSON.stringify(capture),
					);
					await syncDirectory(staging);
					await rename(staging, join(this.path, id));
					await syncDirectory(this.path);
				} finally {
					await rm(staging, { recursive: true, force: true });
				}
				return capture;
			});
		});
	}
	private async readReceipt(
		id: string,
	): Promise<{ sha256: string } | undefined> {
		try {
			return z
				.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) })
				.parse(
					JSON.parse(
						await readFile(join(this.path, id, "receipt.json"), "utf8"),
					),
				);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
			throw error;
		}
	}
	async receipt(id: string, sha256: string) {
		this.checkedId(id);
		return this.serialized(id, async () => {
			const capture = await this.get(id);
			if (capture.sha256 !== sha256)
				throw new CaptureError(409, "Capture hash mismatch");
			if (await this.readReceipt(id)) return { id, sha256, delivered: true };
			const directory = join(this.path, id),
				temporary = join(directory, `.receipt-${randomUUID()}`);
			try {
				await writeDurable(temporary, JSON.stringify({ sha256 }));
				await rename(temporary, join(directory, "receipt.json"));
				await syncDirectory(directory);
			} finally {
				await rm(temporary, { force: true });
			}
			return { id, sha256, delivered: true };
		});
	}
}
