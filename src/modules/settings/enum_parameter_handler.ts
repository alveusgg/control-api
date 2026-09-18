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

// Camera parameters whose value is one of a fixed set of words, rather than a
// boolean or a number. The allowed words are supplied per route and validated
// strictly: the camera silently accepts an unknown value and does nothing with
// it, so a typo here would be a setting that reports success and never applies.
function newParameterAdapter(values: readonly string[]) {
	return z.object({
		value: z.enum(values as [string, ...string[]]),
	});
}

const SetEnumParameterHandler: Handler = {
	openapi: describeRoute({
		tags: ["Settings"],
		description: "Set an enumerated camera parameter",
		responses: {
			200: {
				description: "Parameter state",
				content: {
					"application/json": {
						schema: resolver(z.record(z.string(), z.any())),
					},
				},
			},
		},
	}),
	handle: (parameter: string, values: readonly string[]) => {
		const valueAdapter = newParameterAdapter(values);

		return createFactory<constants.Env>().createHandlers(
			validator("json", valueAdapter),
			async (ctx) => {
				const value = ctx.req.valid("json");

				let camera = ctx.get(constants.targetCameraKey);
				if (!camera) {
					return APIErrorResponse(
						ctx,
						http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
						ErrorCode.InvalidContextCode,
						errors.ErrCameraNotSet,
					);
				}

				return VAPIXManager.SetParameter(ctx, camera, parameter, value.value);
			},
		);
	},
};

export default SetEnumParameterHandler;
