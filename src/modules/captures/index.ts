import { Hono } from "hono";
import * as z from "zod";
import { describeRoute, resolver } from "hono-openapi";
import type * as constants from "@/constants";
import { targetCameraKey } from "@/constants";
import type { Camera } from "@/models";
import { VAPIXManager } from "@/managers";
import AuthenticationMiddleware from "@/server/middleware/authentication";
import CameraMiddleware from "@/server/middleware/camera";
import type { Module } from "@/modules/module";
import {
	CaptureError,
	CaptureStore,
	MAX_IMAGE_SIZE,
	positionSchema,
	metadataSchema,
} from "@/captures/store";
import { formatQueryResponse } from "@/utils";

export const captureStore = new CaptureStore(
	process.env.CAPTURE_STORAGE_PATH ?? "data/captures",
);
async function cameraRead(
	camera: Camera,
	endpoint: string,
	params: Record<string, string | number>,
) {
	let response: Response;
	try {
		response = await VAPIXManager.makeAPICall(
			camera.client,
			VAPIXManager.URLBuilder(camera.host, endpoint, params),
			"GET",
			undefined,
			AbortSignal.timeout(10000),
		);
	} catch {
		throw new CaptureError(502, "Camera read failed or timed out");
	}
	if (!response.ok) throw new CaptureError(502, "Unable to read camera");
	return response;
}
export function captureRoutes(store: CaptureStore) {
	const app = new Hono<{ Variables: constants.Variables }>();
	app.use("*", AuthenticationMiddleware);
	app.onError((error, ctx) => {
		if (error instanceof CaptureError)
			return ctx.json({ error: error.message }, error.status);
		if (error instanceof z.ZodError || error instanceof SyntaxError)
			return ctx.json(
				{ error: "Invalid capture request or camera response" },
				400,
			);
		console.error("Capture storage or camera read failed");
		return ctx.json({ error: "Capture storage or camera read failed" }, 500);
	});
	app.on(
		"POST",
		["/:id"],
		describeRoute({
			summary: "Capture current view without moving",
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["expiresAt"],
							properties: { expiresAt: { type: "number" } },
						},
					},
				},
			},
			tags: ["Captures"],
			responses: {
				200: {
					description: "Retained capture",
					content: { "application/json": { schema: resolver(metadataSchema) } },
				},
			},
		}),
		...CameraMiddleware,
		async (ctx) => {
			const { expiresAt } = z
				.object({ expiresAt: z.number().finite() })
				.parse(await ctx.req.json());
			const camera = ctx.get(targetCameraKey);
			if (
				!camera.capabilities.has("Screenshots") ||
				!camera.capabilities.has("PTZ")
			)
				return ctx.json({ error: "Camera does not support captures" }, 400);
			const capture = await store.create(
				ctx.req.param("id")!,
				camera.name,
				expiresAt,
				{
					position: async () =>
						positionSchema.parse(
							formatQueryResponse(
								await (
									await cameraRead(camera, "com/ptz", { query: "position" })
								).text(),
							),
						),
					image: async () => {
						const response = await cameraRead(camera, "jpg/image", {
							compression: 0,
						});
						const reader = response.body?.getReader();
						if (!reader) throw new CaptureError(502, "Empty camera image");
						const chunks: Uint8Array[] = [];
						let size = 0;
						try {
							while (true) {
								const { done, value } = await reader.read();
								if (done) break;
								size += value.length;
								if (size > MAX_IMAGE_SIZE)
									throw new CaptureError(502, "Oversized camera image");
								chunks.push(value);
							}
						} finally {
							await reader.cancel();
							reader.releaseLock();
						}
						return Buffer.concat(chunks, size);
					},
				},
			);
			return ctx.json(capture);
		},
	);
	app.get(
		"/:id",
		describeRoute({
			summary: "Get retained capture metadata",
			tags: ["Captures"],
			responses: {
				200: {
					description: "Capture metadata",
					content: { "application/json": { schema: resolver(metadataSchema) } },
				},
			},
		}),
		async (ctx) => ctx.json(await store.get(ctx.req.param("id"))),
	);
	app.get(
		"/:id/image",
		describeRoute({
			summary: "Get exact retained JPEG",
			tags: ["Captures"],
			responses: {
				200: {
					description: "JPEG",
					content: {
						"image/jpeg": { schema: { type: "string", format: "binary" } },
					},
				},
			},
		}),
		async (ctx) =>
			new Response(new Uint8Array(await store.image(ctx.req.param("id"))), {
				headers: {
					"Content-Type": "image/jpeg",
					"Cache-Control": "private, immutable, max-age=31536000",
				},
			}),
	);
	app.post(
		"/:id/receipt",
		describeRoute({
			summary: "Acknowledge durable site delivery",
			requestBody: {
				required: true,
				content: {
					"application/json": {
						schema: {
							type: "object",
							required: ["sha256"],
							properties: {
								sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
							},
						},
					},
				},
			},
			tags: ["Captures"],
			responses: {
				200: {
					description: "Delivery recorded",
					content: {
						"application/json": {
							schema: resolver(
								z.object({
									id: z.uuid(),
									sha256: z.string(),
									delivered: z.literal(true),
								}),
							),
						},
					},
				},
			},
		}),
		async (ctx) => {
			const { sha256 } = z
				.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) })
				.parse(await ctx.req.json());
			return ctx.json(await store.receipt(ctx.req.param("id"), sha256));
		},
	);
	return app;
}
export default {
	name: "Captures",
	basePath: "/captures",
	Initialize: () => captureRoutes(captureStore),
	Shutdown: () => {},
} satisfies Module;
