import { createMiddleware } from "hono/factory";
import { constants as http } from "http2";

import { ErrorCode } from "@/errors/error_codes";
import * as constants from "@/constants";
import { APIErrorResponse } from "@/utils";

const AuthorizationMiddleware = (sharedKey: string) => {
	return createMiddleware<constants.Env>(async (ctx, next) => {
		const header = ctx.req.header("authorization");
		const [type, key] = header?.split(" ") ?? [];
		if (type !== "ApiKey" || key !== sharedKey) {
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
