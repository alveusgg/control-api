import { createFactory } from "hono/factory";
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from "@/constants";
import { CameraManager } from "@/managers";
import { type Handler } from "@/modules/module";
import { APIErrorResponse } from "@/utils";
import { ErrorCode } from "@/errors/error_codes";
import type { Camera } from "@/models";

const GetCapabilitiesHandler: Handler = {
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			const cameraName = ctx.req.param("camera");
			if (!cameraName) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_BAD_REQUEST,
					ErrorCode.MissingRequiredParameterCode,
					new Error("Missing required parameter"),
				);
			}

			const camera = CameraManager.getCamera(cameraName.toLowerCase());
			if (!camera) {
				return APIErrorResponse(
					ctx,
					http.HTTP_STATUS_BAD_REQUEST,
					ErrorCode.UnknownCameraCode,
					new Error(`No camera matching ${cameraName} found`),
				);
			}

			return ctx.json({
				camera: camera.name,
				capabilities: Array.from(camera.capabilities),
			});
		});
	},
};

export default GetCapabilitiesHandler;
