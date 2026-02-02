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

export function formatPosition(position: string): Object {
	let o: any = {};
	position.split("\r\n").forEach((p) => {
		let j = p.split("=");
		if (j[0] != "") {
			o[j[0]] = !Number.isNaN(Number(j[1])) ? Number(j[1]) : j[1];
		}
	});

	return o;
}

export function mapTopicToFriendlyName(topic: string): string | undefined {
	for (const [key, value] of constants.topicMap) {
		if (topic.startsWith(key)) {
			return value;
		}
	}
	return undefined;
}
