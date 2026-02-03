import { createFactory } from "hono/factory";
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";
import { APIErrorResponse } from "@/utils";
import { ErrorCode } from "@/errors/error_codes";

// prettier-ignore
const parameterAdapter = z.object({
	enabled: z.boolean(),
});

export const SetParameterHandler: Handler = {
	handle: (parameter: string) => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let enabled;
			try {
				enabled = parameterAdapter.parse(await ctx.req.json());
			} catch (error) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_BAD_REQUEST,
					ErrorCode.InvalidRequestBodyCode,
					error,
				);
			}

			let camera = ctx.get(constants.targetCameraKey);
			if (!camera) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
					ErrorCode.InvalidContextCode,
					new Error("Camera not set on context"),
				);
			}

			return VAPIXManager.SetParameter(ctx, camera, parameter, enabled.enabled);
		});
	},
};

export const GetParameterHandler: Handler = {
	handle: (parameter: string) => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let camera = ctx.get(constants.targetCameraKey);
			if (!camera) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
					ErrorCode.InvalidContextCode,
					new Error("Camera not set on context"),
				);
			}

			return VAPIXManager.GetParameter(ctx, camera, parameter);
		});
	},
};
