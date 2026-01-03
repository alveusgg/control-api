import { createMiddleware } from "hono/factory";
import { constants as http } from "http2";

import { ErrorCode } from "@/errors/error_codes";
import * as constants from "@/constants";
import type { Camera } from "@/models/camera";
import { APIErrorResponse } from "@/utils";

const CapabilitiesMiddleware = (...capabilitiesList: string[]) => {
	return createMiddleware<constants.Env>(async (ctx, next) => {
		// Requires camera middleware first
		let camera: Camera = ctx.get(constants.targetCameraKey);
		if (!camera) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
				ErrorCode.InvalidContextCode,
				new Error("Camera not set on context"),
			);
		}

		let requestedCapabilities = new Set(capabilitiesList);

		let unsupportedCapabilities = requestedCapabilities.difference(
			camera.capabilities,
		);
		if (unsupportedCapabilities.size > 0) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_BAD_REQUEST,
				ErrorCode.UnsupportedActionCode,
				new Error(
					`Actions not supported on camera: ${Array.from(unsupportedCapabilities).join(", ")}`,
				),
			);
		}

		await next();
	});
};

export default CapabilitiesMiddleware;
