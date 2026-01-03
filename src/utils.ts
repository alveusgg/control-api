import type { Context } from "hono";
import { type StatusCode } from "hono/utils/http-status";

import * as constants from "@/constants";

interface APIError {
	code: number;
	details: string;
}

export function APIErrorResponse(
	ctx: Context<constants.Env>,
	status: number,
	code: number,
	error: unknown,
): Response {
	let err = error instanceof Error ? error : new Error(String(error));

	let details = err.message;
	if (err.cause) {
		details += `: ${err.cause}`;
	}

	let newAPIError: APIError = {
		code: code,
		details: details,
	};

	ctx.status(status as StatusCode);

	return ctx.json(newAPIError);
}
