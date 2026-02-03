import type DigestClient from "digest-fetch";
import type { Context } from "hono";

import * as constants from "@/constants";
import { constants as http } from "http2";
import { APIErrorResponse, formatPosition } from "@/utils";
import type { Camera } from "@/models";
import { ErrorCode } from "@/errors/error_codes";

class VAPIXManager {
	constructor() {}

	async makeAPICall(
		url: string,
		client: DigestClient,
		method: RequestInit["method"] = "GET",
		body?: any,
	): Promise<Response> {
		try {
			const hasBody = body !== undefined && body !== null;
			const response = await client.fetch(url, {
				method: method,
				headers: hasBody
					? {
							"Content-Type": "application/json",
						}
					: undefined,
				body: hasBody ? JSON.stringify(body) : undefined,
			});
			return response;
		} catch (error) {
			throw error;
		}
	}

	URLBuilder(api: string, target: string, URLParams?: any): string {
		const params = new URLSearchParams(
			Object.assign(
				{
					camera: "1",
				},
				URLParams,
			),
		);

		return `http://${target}/axis-cgi/${api}.cgi?${params.toString()}`;
	}

	async GetParameter(
		ctx: Context<constants.Env>,
		target: Camera,
		param: string,
	): Promise<Response> {
		let url = this.URLBuilder("param", target.host, {
			action: "list",
			group: param,
		});

		let response;
		try {
			response = await this.makeAPICall(url, target.client);
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

		let properties = formatPosition(await response.text());
		return ctx.json(properties);
	}

	async SetParameter(
		ctx: Context<constants.Env>,
		target: Camera,
		param: string,
		enabled: boolean,
	): Promise<Response> {
		let url = this.URLBuilder("param", target.host, {
			action: "update",
			[param]: enabled,
		});

		let response;
		try {
			response = await this.makeAPICall(url, target.client);
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

		return await this.GetParameter(ctx, target, param);
	}
}

export default new VAPIXManager();
