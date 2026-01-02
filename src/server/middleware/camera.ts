import { createMiddleware } from 'hono/factory';
import { constants as http } from "http2";

import { ErrorCode } from '@/errors/error_codes';
import * as constants from '@/constants';
import { CameraManager } from '@/managers';
import { APIErrorResponse } from '@/utils';

const CameraMiddleware = createMiddleware<constants.Env>(async (ctx, next) => {
	const cameraName = ctx.req.header(constants.cameraHeader);
	if (!cameraName) {
		return APIErrorResponse(ctx, 
			http.HTTP_STATUS_BAD_REQUEST, 
			ErrorCode.MissingRequiredHeaderCode, 
			new Error("Missing required header 'X-Camera-Name'")
		);
	}

	const cam = CameraManager.GetCamera((cameraName as string).toLowerCase());
	if (!cam) {
		return APIErrorResponse(ctx, 
			http.HTTP_STATUS_BAD_REQUEST, 
			ErrorCode.UnknownCameraCode, 
			new Error(`No camera matching ${cameraName} found`)
		);
	}

	ctx.set(constants.targetCameraKey, cam);
	await next();
});

export default CameraMiddleware;