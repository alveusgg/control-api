import { createFactory } from 'hono/factory';
import * as z from "zod"; 
import * as constants from '@/constants';
import { makeVAPIXCall, VAPIXURLBuilder } from '@/utils';
import { type Handler } from '@/modules/module';

const IrCutFilterAdapter = z.object({ 
	state: z.enum([
		"on",  
		"off",    
		"auto"
	]),
})

const IrCutFilterHandler: Handler = {
	adapter: IrCutFilterAdapter,
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			// Error handle
			let irFilter = IrCutFilterAdapter.parse(await ctx.req.json());
			let camera = ctx.get(constants.targetCameraKey)

			let url = VAPIXURLBuilder("ptz", camera.name, {ircutfilter: irFilter.state});
			let response = await makeVAPIXCall(url, camera.login);

			return ctx.text(response as string)
		})
	},
}

export default IrCutFilterHandler;