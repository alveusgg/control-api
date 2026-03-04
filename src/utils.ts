import type { Context } from "hono";
import { type StatusCode } from "hono/utils/http-status";
import * as z from "zod";
import _ from "lodash";
import * as d3 from "d3-quadtree";

import * as constants from "@/constants";
import type { Camera, FOV, Preset, PixelPreset } from "./models";

interface APIError {
	code: number;
	details: string;
}

export const PositionValueSchema = z.union([z.number(), z.string()]);
export const PositionMapSchema = z.record(z.string(), PositionValueSchema);
export type PositionMap = z.infer<typeof PositionMapSchema>;

export function APIErrorResponse(
	ctx: Context<constants.Env>,
	status: number,
	code: number,
	error: unknown,
): Response {
	let err = error instanceof Error ? error : new Error(String(error));

	let details = err.message;
	if (err.cause) {
		details += `: ${err.cause}`;
	}

	let newAPIError: APIError = {
		code: code,
		details: details,
	};

	ctx.status(status as StatusCode);

	return ctx.json(newAPIError);
}

export function formatQueryResponse(position: string): Record<string, any> {
	let o: any = {};
	position
		.replaceAll("\r", "")
		.split("\n")
		.forEach((p) => {
			let j = p.split("=");
			if (j[0] != "") {
				let v = j[1].trim();
				o[j[0].trim().replaceAll(" ", "_")] = !Number.isNaN(Number(v))
					? Number(v)
					: v;
			}
		});

	return o;
}

export function formatPosition(position: string): PositionMap {
	return PositionMapSchema.parse(formatQueryResponse(position));
}

export function mapTopicToFriendlyName(topic: string): string | undefined {
	for (const [key, value] of constants.topicMap) {
		if (topic.startsWith(key)) {
			return value;
		}
	}
	return undefined;
}

export function getFOV(
	pan: number,
	tilt: number,
	zoom: number,
	camera: Camera,
): FOV {
	const zoomSteps = camera.specs.zoomSteps;
	const lastStep = zoomSteps[zoomSteps.length - 1];
	zoom = Math.max(1, Math.min(zoom, lastStep[1]));

	let multiplier = zoomSteps[0][0];
	let found = false;

	for (let i = zoomSteps.length - 1; i >= 0; i--) {
		const step = zoomSteps[i];
		if (zoom >= step[1]) {
			if (i === zoomSteps.length - 1) {
				multiplier = step[0];
			} else {
				const nextStep = zoomSteps[i + 1];
				const range = nextStep[1] - step[1];
				const distance = zoom - step[1];
				const increment = nextStep[0] - step[0];
				multiplier = step[0] + _.round((distance / range) * increment, 2);
			}
			found = true;
			break;
		}
	}

	const focalLength = camera.specs.focalLength.min * multiplier;
	const sensorWidth = camera.specs.sensorWidth;
	const sensorHeight = camera.specs.sensorHeight;
	const hFoV = 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
	const vFoV =
		2 * Math.atan(sensorHeight / (2 * focalLength)) * (180 / Math.PI);
	const places = 2;
	return {
		hFOV: _.round(hFoV, places),
		vFOV: _.round(vFoV, places),
		focalLength: _.round(focalLength, places),
		x: _.round(pan - hFoV / 2, places),
		y: _.round(tilt + vFoV / 2, places),
	};
}

export function degreesToPixels(fov: FOV, preset: Preset): PixelPreset {
	return {
		name: preset.name,
		x: Math.round((preset.pan - fov.x) * (1920 / fov.hFOV)),
		y: Math.round((fov.y - preset.tilt) * (1080 / fov.vFOV)),
	};
}

export function searchQuadtree(
	quadtree: d3.Quadtree<Preset>,
	fov: FOV,
): PixelPreset[] {
	const results: PixelPreset[] = [];

	const xmin = fov.x;
	const xmax = fov.x + fov.hFOV;
	const ymax = fov.y;
	const ymin = fov.y - fov.vFOV;

	quadtree.visit((node, x1, y1, x2, y2) => {
		if ("data" in node) {
			let leaf: d3.QuadtreeLeaf<Preset> | undefined = node;
			do {
				const d = leaf.data;
				if (d.pan >= xmin && d.pan < xmax && d.tilt >= ymin && d.tilt < ymax) {
					results.push(degreesToPixels(fov, d));
				}
			} while ((leaf = leaf.next));
		}

		return x1 >= xmax || y1 >= ymax || x2 < xmin || y2 < ymin;
	});

	return results;
}
