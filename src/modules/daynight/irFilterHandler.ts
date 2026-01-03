import { createFactory } from 'hono/factory';
import * as z from "zod";
import { constants as http } from "http2";

import * as constants from '@/constants';
import { VAPIXManager } from '@/managers';
import { type Handler } from '@/modules/module';
import { APIErrorResponse } from '@/utils';
import { ErrorCode } from '@/errors/error_codes';

const IrFilterAdapter = z.object({ 
	state: z.enum([
		"on",  
		"off",    
		"auto"
	]),
});

const IrFilterHandler: Handler = {
	adapter: IrFilterAdapter,
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			let irFilter;
			try {
				irFilter = IrFilterAdapter.parse(await ctx.req.json());
			} catch (error) {
				return APIErrorResponse(ctx, 
					http.HTTP_STATUS_BAD_REQUEST, 
					ErrorCode.InvalidRequestBodyCode, 
					error
				);
			}

			let camera = ctx.get(constants.targetCameraKey);
			if (!camera) {
				return APIErrorResponse(ctx, 
					http.HTTP_STATUS_INTERNAL_SERVER_ERROR, 
					ErrorCode.InvalidContextCode, 
					new Error("Camera not set on context")
				);
			}

			let url = VAPIXManager.URLBuilder("ptz", camera.name, {ircutfilter: irFilter.state});
			let response = await VAPIXManager.makeAPICall(url, camera.login);

			return ctx.text(response as string);
		})
	},
}

export default IrFilterHandler;