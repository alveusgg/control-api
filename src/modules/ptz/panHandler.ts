import { createFactory } from 'hono/factory';
import * as z from "zod";

import * as constants from '@/constants';
import { VAPIXManager } from '@/managers';
import { type Handler } from '@/modules/module';

const panAdapter = z.object({ 
	degrees: z.number().min(-180.0)
	.and(z.number().max(180.0)),
});

const PanHandler: Handler = {
	adapter: panAdapter,
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			// Error handle
			let pan = panAdapter.parse(await ctx.req.json());
			let camera = ctx.get(constants.targetCameraKey); // Verify that it exists

			let url = VAPIXManager.URLBuilder("ptz", camera.name, {pan: pan.degrees});
			let response = await VAPIXManager.makeAPICall(url, camera.login);

			return ctx.text(response as string);
		})
	},
}

export default PanHandler;