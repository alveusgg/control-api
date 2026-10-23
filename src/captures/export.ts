import { readFile } from "node:fs/promises";
import * as z from "zod";
import { positionSchema } from "./store";

export function exportPresets(value: unknown) {
	const root = z.record(z.string(), z.unknown()).parse(value);
	const cameras = [];
	const mergerFormat = Object.values(root).every(Array.isArray);
	for (const [camera, entry] of Object.entries(root)) {
		let rows: unknown[];
		if (mergerFormat && Array.isArray(entry)) rows = entry;
		else if (entry && typeof entry === "object" && "presets" in entry) {
			const presets = z.record(z.string(), z.unknown()).parse(entry.presets);
			rows = Object.entries(presets).map(([name, position]) => ({
				name,
				...positionSchema.parse(position),
			}));
		} else continue;
		const presets = rows.map((row) => {
			const parsed = z
				.object({ name: z.string().min(1), ...positionSchema.shape })
				.parse(row);
			const { name, ...position } = parsed;
			return { name, position };
		});
		if (new Set(presets.map((p) => p.name)).size !== presets.length)
			throw new Error("Duplicate preset names");
		cameras.push({ camera, presets });
	}
	return { version: 1 as const, cameras };
}
export async function readPresetExport(path = process.env.PRESETS_IMPORT_PATH) {
	if (!path) throw new Error("Preset bootstrap source is not configured");
	return exportPresets(JSON.parse(await readFile(path, "utf8")));
}
