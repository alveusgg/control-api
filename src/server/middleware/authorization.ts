import { createMiddleware } from "hono/factory";
import { constants as http } from "http2";
import { timingSafeEqual } from "node:crypto";

import { ErrorCode } from "@/errors/error_codes";
import * as constants from "@/constants";
import { APIErrorResponse } from "@/utils";

const AuthorizationMiddleware = (sharedKey: string) => {
	return createMiddleware<constants.Env>(async (ctx, next) => {
		const header = ctx.req.header("authorization");
		const [type, key] = header?.split(" ") ?? [];
		const keyBuffer = Buffer.from(key ?? "", "utf8");
		const sharedKeyBuffer = Buffer.from(sharedKey, "utf8");

		if (type !== "ApiKey" || !timingSafeEqual(keyBuffer, sharedKeyBuffer)) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_UNAUTHORIZED,
				ErrorCode.AuthorizationFailed,
				new Error(`Authorization Failed`),
			);
		}
		await next();
	});
};

export default AuthorizationMiddleware;
