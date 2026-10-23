import * as z from "zod";
import { describeRoute, resolver } from "hono-openapi";
import { positionSchema } from "@/captures/store";
import { Hono } from "hono";
import type * as constants from "@/constants";
import type { Module } from "@/modules/module";
import AuthenticationMiddleware from "@/server/middleware/authentication";
import { readPresetExport } from "@/captures/export";
export default {
	name: "Presets",
	basePath: "/presets",
	Initialize: () =>
		new Hono<{ Variables: constants.Variables }>()
			.onError((_error, ctx) =>
				ctx.json({ error: "Unable to read preset bootstrap source" }, 500),
			)
			.get(
				"/export",
				AuthenticationMiddleware,
				describeRoute({
					summary: "Export read-only preset bootstrap source",
					tags: ["Presets"],
					responses: {
						200: {
							description: "Bootstrap source, not authoritative live database",
							content: {
								"application/json": {
									schema: resolver(
										z.object({
											version: z.literal(1),
											cameras: z.array(
												z.object({
													camera: z.string(),
													presets: z.array(
														z.object({
															name: z.string(),
															position: positionSchema,
														}),
													),
												}),
											),
										}),
									),
								},
							},
						},
					},
				}),
				async (ctx) => ctx.json(await readPresetExport()),
			),
	Shutdown: () => {},
} satisfies Module;
