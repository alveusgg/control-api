import type DigestClient from "digest-fetch";
import type { Context } from "hono";

import * as constants from "@/constants";
import { constants as http } from "http2";
import { APIErrorResponse, formatQueryResponse } from "@/utils";
import type { Camera } from "@/models";
import { ErrorCode } from "@/errors/error_codes";
import * as errors from "@/errors/errors";

class VAPIXManager {
	constructor() {}

	async makeAPICall(
		client: DigestClient,
		url: string,
		method: RequestInit["method"] = "GET",
		body?: any,
		signal?: AbortSignal,
	): Promise<Response> {
		try {
			const hasBody = body !== undefined && body !== null;
			const response = await client.fetch(url, {
				method: method,
				signal,
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

	URLBuilder(target: string, api: string, URLParams?: any): string {
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
		let url = this.URLBuilder(target.host, "param", {
			action: "list",
			group: param,
		});

		let response;
		try {
			response = await this.makeAPICall(target.client, url);
		} catch (error) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
				ErrorCode.VAPIXCallFailed,
				errors.ErrUnableToCallVAPIX(error),
			);
		}

		if (!response.ok) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_BAD_GATEWAY,
				ErrorCode.VAPIXCallFailed,
				errors.ErrVAPIXCallFailed(await response.text()),
			);
		}

		let properties = formatQueryResponse(await response.text());
		return ctx.json(properties);
	}

	async SetParameter(
		ctx: Context<constants.Env>,
		target: Camera,
		param: string,
		value: any,
	): Promise<Response> {
		let url = this.URLBuilder(target.host, "param", {
			action: "update",
			[param]: value,
		});

		let response;
		try {
			response = await this.makeAPICall(target.client, url);
		} catch (error) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_INTERNAL_SERVER_ERROR,
				ErrorCode.VAPIXCallFailed,
				errors.ErrUnableToCallVAPIX(error),
			);
		}

		if (!response.ok) {
			return APIErrorResponse(
				ctx,
				http.HTTP_STATUS_BAD_GATEWAY,
				ErrorCode.VAPIXCallFailed,
				errors.ErrVAPIXCallFailed(await response.text()),
			);
		}

		return await this.GetParameter(ctx, target, param);
	}
}

export default new VAPIXManager();
