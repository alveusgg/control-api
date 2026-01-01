import { createFactory } from 'hono/factory';
import * as z from "zod"; 
import * as constants from '@/constants';
import { makeVAPIXCall, VAPIXURLBuilder } from '@/utils';
import { type Handler } from '@/modules/module';

const moveAdapter = z.object({ 
	direction: z.enum([
		"upleft",   "up",   "upright", 
		"left",     "home", "right",
		"downleft", "down", "downright",
		"stop"
	]),
})

const MoveHandler: Handler = {
	adapter: moveAdapter,
	handle: () => {
		return createFactory<constants.Env>().createHandlers(async (ctx) => {
			// Error handle
			let move = moveAdapter.parse(await ctx.req.json());
			let camera = ctx.get(constants.targetCameraKey)

			let url = VAPIXURLBuilder("ptz", camera.name, {move: move.direction});
			let response = await makeVAPIXCall(url, camera.login);

			return ctx.text(response as string)
		})
	},
}

export default MoveHandler;