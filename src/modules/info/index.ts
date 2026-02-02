import { Hono } from "hono";

import * as constants from "@/constants";
import type { Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import GetInfoHandler from "./get_info_handler";
import GetSpeedHandler from "./get_speed_handler";

const InfoModule: Module = {
	name: "Info",
	basePath: "/info",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const infoModule = new Hono<{ Variables: constants.Variables }>();

		infoModule.use(CameraMiddleware);

		infoModule.on(
			"GET",
			"/position",
			CapabilitiesMiddleware("PTZ"),
			...GetInfoHandler.handle(),
		);

		infoModule.on(
			"GET",
			"/speed",
			CapabilitiesMiddleware("PTZ"),
			...GetSpeedHandler.handle(),
		);

		return infoModule;
	},
	Shutdown: (): void => {},
};

export default InfoModule;
