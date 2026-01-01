import type { Module } from '@/modules/module';
import { Hono } from 'hono'
import * as constants from '@/constants';
import { CameraMiddleware, CapabilitiesMiddleware } from '@/server/middleware';

// Route imports
import IrCutFilterHandler from './irCutFilterHandler';


const DayNightModule: Module = {
	name: "DayNight",
	basePath: "/ir",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const dayNightModule = new Hono<{ Variables: constants.Variables }>();

		dayNightModule.use(CameraMiddleware);

		dayNightModule.on(
			"POST",
			"/filter",
			CapabilitiesMiddleware("IrCutFilter"),
			...IrCutFilterHandler.handle()
		);

    	return dayNightModule;
	},
	Shutdown: (): void => {}
}

export default DayNightModule;