import { createFactory } from "hono/factory";
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";
import { APIErrorResponse } from "@/utils";
import { ErrorCode } from "@/errors/error_codes";

// prettier-ignore
function newParameterAdapter(max: number) {
	return z.object({
		value: z.number().min(0).and(z.number().max(max)),
	});
}

const SetIntParameterHandler: Handler = {
	handle: (parameter: string, max: number) => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let value;
			try {
				value = newParameterAdapter(max).parse(await ctx.req.json());
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

			return VAPIXManager.SetParameter(ctx, camera, parameter, value.value);
		});
	},
};

export default SetIntParameterHandler;
