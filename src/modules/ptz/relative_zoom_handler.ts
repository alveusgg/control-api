import { createFactory } from "hono/factory";
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { VAPIXManager } from "@/managers";
import { type Handler } from "@/modules/module";
import { APIErrorResponse } from "@/utils";
import { ErrorCode } from "@/errors/error_codes";

const rzoomAdapter = z.object({
	value: z.number().min(-19999).and(z.number().max(19999)),
});

const RZoomHandler: Handler = {
	adapter: rzoomAdapter,
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let rzoom;
			try {
				rzoom = rzoomAdapter.parse(await ctx.req.json());
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

			let url = VAPIXManager.URLBuilder("com/ptz", camera.host, {
				rzoom: rzoom.value,
			});

			let response;
			try {
				response = await VAPIXManager.makeAPICall(url, camera.client);
			} catch (error) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
					ErrorCode.VAPIXCallFailed,
					new Error("Unable to make VAPIX call", { cause: error }),
				);
			}

			if (!response.ok) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_BAD_GATEWAY,
					ErrorCode.VAPIXCallFailed,
					new Error("VAPIX call failed", { cause: await response.text() }),
				);
			}

			return ctx.text(await response.text());
		});
	},
};

export default RZoomHandler;
