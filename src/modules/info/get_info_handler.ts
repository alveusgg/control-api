import { createFactory } from "hono/factory";
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";
import {
	APIErrorResponse,
	formatQueryResponse,
	PositionValueSchema,
	getFOV,
} from "@/utils";
import { ErrorCode } from "@/errors/error_codes";
import * as errors from "@/errors/errors";

import { describeRoute, resolver } from "hono-openapi";

// The camera's position values, plus the field of view computed from them.
const InfoResponseSchema = z
	.object({
		fov: z.object({
			hFOV: z.number(),
			vFOV: z.number(),
			focalLength: z.number(),
			x: z.number(),
			y: z.number(),
			multiplier: z.number(),
		}),
	})
	.catchall(PositionValueSchema);

const GetInfoHandler: Handler = {
	openapi: describeRoute({
		summary: "Get Info",
		tags: ["Info"],
		description: "Get information about a specific camera",
		responses: {
			200: {
				description: "Information about a camera",
				content: {
					"application/json": {
						schema: resolver(InfoResponseSchema),
					},
				},
			},
		},
	}),
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let camera = ctx.get(constants.targetCameraKey);
			if (!camera) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
					ErrorCode.InvalidContextCode,
					errors.ErrCameraNotSet,
				);
			}

			let url = VAPIXManager.URLBuilder(camera.host, "com/ptz", {
				query: "position",
			});

			let response;
			try {
				response = await VAPIXManager.makeAPICall(camera.client, url);
			} catch (error) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
					ErrorCode.VAPIXCallFailed,
					errors.ErrUnableToCallVAPIX(error),
				);
			}

			if (!response.ok) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_BAD_GATEWAY,
					ErrorCode.VAPIXCallFailed,
					errors.ErrVAPIXCallFailed(await response.text()),
				);
			}

			let info = formatQueryResponse(await response.text());
			info.fov = getFOV(info.pan, info.tilt, info.zoom, camera);

			return ctx.json(info);
		});
	},
};

export default GetInfoHandler;
