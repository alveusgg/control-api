import { Hono } from "hono";

import * as constants from "@/constants";
import type { Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import IrFilterHandler from "./ir_filter_handler";
import IrLightHandler from "./ir_light_handler";
import IrHandler from "./ir_handler";

const DayNightModule: Module = {
	name: "DayNight",
	basePath: "/ir",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const dayNightModule = new Hono<{ Variables: constants.Variables }>();

		dayNightModule.use(CameraMiddleware);

		dayNightModule.on(
			"POST",
			"",
			CapabilitiesMiddleware("IrCutFilter", "IrLight"),
			...IrHandler.handle(),
		);

		dayNightModule.on(
			"POST",
			"/filter",
			CapabilitiesMiddleware("IrCutFilter"),
			...IrFilterHandler.handle(),
		);

		dayNightModule.on(
			"POST",
			"/light",
			CapabilitiesMiddleware("IrLight"),
			...IrLightHandler.handle(),
		);

		return dayNightModule;
	},
	Shutdown: (): void => {},
};

export default DayNightModule;
