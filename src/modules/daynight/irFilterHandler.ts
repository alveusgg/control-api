import { createFactory } from 'hono/factory';
import * as z from "zod";

import * as constants from '@/constants';
import { VAPIXManager } from '@/managers';
import { type Handler } from '@/modules/module';

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
			// Error handle
			let irFilter = IrFilterAdapter.parse(await ctx.req.json());
			let camera = ctx.get(constants.targetCameraKey);

			let url = VAPIXManager.URLBuilder("ptz", camera.name, {ircutfilter: irFilter.state});
			let response = await VAPIXManager.makeAPICall(url, camera.login);

			return ctx.text(response as string);
		})
	},
}

export default IrFilterHandler;