import { createFactory } from "hono/factory";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";
import { APIErrorResponse, formatQueryResponse } from "@/utils";
import { ErrorCode } from "@/errors/error_codes";
import * as errors from "@/errors/errors";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as z from "zod";

const screenshotAdapter = z.object({
	width: z.coerce.number().int().positive().optional(),
	height: z.coerce.number().int().positive().optional(),
	compression: z.coerce.number().int().min(0).max(100).default(0),
});

const GetScreenshotHandler: Handler = {
	openapi: describeRoute({
		summary: "Get Screenshot",
		tags: ["Info"],
		description: "Get a screenshot of the current view of the camera",
		responses: {
			200: {
				description: "Base64 encoded image",
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
			validator("query", screenshotAdapter),
			async (ctx) => {
				let camera = ctx.get(constants.targetCameraKey);
				if (!camera) {
					return APIErrorResponse(
						ctx,
						http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
						ErrorCode.InvalidContextCode,
						errors.ErrCameraNotSet,
					);
				}

				const { width, height, compression } = ctx.req.valid("query");

				const params: Record<string, number | string> = {
					compression,
				};

				if (width !== undefined && height !== undefined) {
					params.resolution = `${width}x${height}`;
				}

				let url = VAPIXManager.URLBuilder(camera.host, "jpg/image", params);

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

				const arrayBuffer = await response.arrayBuffer();
				const base64 = Buffer.from(arrayBuffer).toString("base64");
				return ctx.text(base64);
			},
		);
	},
};

export default GetScreenshotHandler;
