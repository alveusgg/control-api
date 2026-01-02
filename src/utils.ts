import type { Context } from 'hono';
import { type StatusCode } from 'hono/utils/http-status';
import * as constants from '@/constants';

interface APIError {
	code: number;
	details: string;
}

export function APIErrorResponse(ctx: Context<constants.Env>, status: number, code: number, error: Error): Response {
	let newAPIError: APIError = {
		code: code,
		details: error.message
	}
	
	ctx.status(status as StatusCode);
	
	return ctx.json(newAPIError);
}