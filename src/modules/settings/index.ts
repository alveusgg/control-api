import { Hono } from "hono";

import * as constants from "@/constants";
import type { Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import { GetParameterHandler, SetParameterHandler } from "./parameter_handler";
import SetSpeedHandler from "./set_speed_handler";
import GetSpeedHandler from "@/modules/info/get_speed_handler";

const SettingsModule: Module = {
	name: "Settings",
	basePath: "/settings",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const settingsModule = new Hono<{ Variables: constants.Variables }>();

		settingsModule.use(CameraMiddleware);

		settingsModule.on(
			"GET",
			"/quickzoom",
			CapabilitiesMiddleware("PTZ", "QuickZoom"),
			...GetParameterHandler.handle("root.PTZ.UserAdv.U1.QuickZoom"),
		);

		settingsModule.on(
			"POST",
			"/quickzoom",
			CapabilitiesMiddleware("PTZ", "QuickZoom"),
			...SetParameterHandler.handle("root.PTZ.UserAdv.U1.QuickZoom"),
		);

		// This is the identical to info/speed, I just couldn't decide where to put it
		settingsModule.on(
			"GET",
			"/speed",
			CapabilitiesMiddleware("PTZ"),
			...GetSpeedHandler.handle(),
		);

		settingsModule.on(
			"POST",
			"/speed",
			CapabilitiesMiddleware("PTZ"),
			...SetSpeedHandler.handle(),
		);

		return settingsModule;
	},
	Shutdown: (): void => {},
};

export default SettingsModule;
