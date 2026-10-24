import { createFactory } from "hono/factory";
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";
import { APIErrorResponse } from "@/utils";
import { ErrorCode } from "@/errors/error_codes";
import * as errors from "@/errors/errors";
import { describeRoute, resolver, validator } from "hono-openapi";

const ptzAdapter = z
	.object({
		pan: z.number().min(-180.0).and(z.number().max(180.0)).optional(),
		tilt: z.number().min(-180.0).and(z.number().max(180.0)).optional(),
		zoom: z.number().min(0).and(z.number().max(19999)).optional(),
		focus: z.number().min(1).and(z.number().max(19999)).optional(),
	})
	.refine(
		(data) =>
			data.pan != undefined ||
			data.tilt != undefined ||
			data.zoom != undefined ||
			data.focus != undefined,
		{
			message: "At least one of pan, tilt, zoom, or focus must be provided",
		},
	);

const PTZHandler: Handler = {
	openapi: describeRoute({
		summary: "Load",
		tags: ["PTZ"],
		description: "Make requests to change the pan, zoom and tilt of a camera",
		responses: {
			200: {
				description: "Successfully submitted to the camera",
				content: {
					"text/plain": {
						schema: resolver(z.string()),
					},
				},
			},
		},
	}),
	handle: () => {
		return createFactory<constants.Env>().createHandlers(
			validator("json", ptzAdapter),
			async (ctx) => {
				const ptz = ctx.req.valid("json");
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
					...(ptz.pan != undefined && { pan: ptz.pan }),
					...(ptz.tilt != undefined && { tilt: ptz.tilt }),
					...(ptz.zoom != undefined && { zoom: ptz.zoom }),
					...(ptz.focus != undefined && { focus: ptz.focus }),
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

				return ctx.text(await response.text());
			},
		);
	},
};

export default PTZHandler;
