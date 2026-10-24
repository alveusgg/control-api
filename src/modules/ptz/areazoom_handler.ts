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

// prettier-ignore
const areazoomAdapter = z.object({
	x: z.number(),
	y: z.number(),
	z: z.number().min(0),
	imagewidth: z.number().int().positive().optional(),
	imageheight: z.number().int().positive().optional(),
});

const AreazoomHandler: Handler = {
	openapi: describeRoute({
		summary: "Areazoom",
		tags: ["PTZ"],
		description:
			"Zoom to an area defined by x, y, and z. x and y are pixel coordinates in an image of the camera's default size, unless imagewidth and imageheight give the size of the image they were taken from",
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
			validator("json", areazoomAdapter),
			async (ctx) => {
				const areazoom = ctx.req.valid("json");

				let camera = ctx.get(constants.targetCameraKey);
				if (!camera) {
					return APIErrorResponse(
						ctx,
						http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
						ErrorCode.InvalidContextCode,
						errors.ErrCameraNotSet,
					);
				}

				let coordinates = [areazoom.x, areazoom.y, areazoom.z].join(",");

				const params: Record<string, number | string> = {
					areazoom: coordinates,
				};

				if (areazoom.imagewidth !== undefined) {
					params.imagewidth = areazoom.imagewidth;
				}
				if (areazoom.imageheight !== undefined) {
					params.imageheight = areazoom.imageheight;
				}

				let url = VAPIXManager.URLBuilder(camera.host, "com/ptz", params);

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

export default AreazoomHandler;
