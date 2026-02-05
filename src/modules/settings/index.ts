import { Hono } from "hono";

import * as constants from "@/constants";
import type { Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import {
	GetParameterHandler,
	SetParameterHandler,
} from "./boolean_parameter_handler";
import SetSpeedHandler from "./set_speed_handler";
import GetSpeedHandler from "@/modules/info/get_speed_handler";
import SetIntParameterHandler from "./int_parameter_handler";

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
			...GetParameterHandler.handle("PTZ.UserAdv.U1.QuickZoom"),
		);

		settingsModule.on(
			"POST",
			"/quickzoom",
			CapabilitiesMiddleware("PTZ", "QuickZoom"),
			...SetParameterHandler.handle("PTZ.UserAdv.U1.QuickZoom"),
		);

		settingsModule.on(
			"POST",
			"/saturation",
			CapabilitiesMiddleware("Appearance"),
			...SetIntParameterHandler.handle("ImageSource.I0.Sensor.ColorLevel", 100),
		);

		settingsModule.on(
			"GET",
			"/saturation",
			CapabilitiesMiddleware("Appearance"),
			...GetParameterHandler.handle("ImageSource.I0.Sensor.ColorLevel"),
		);

		settingsModule.on(
			"POST",
			"/brightness",
			CapabilitiesMiddleware("Appearance"),
			...SetIntParameterHandler.handle("ImageSource.I0.Sensor.Brightness", 100),
		);

		settingsModule.on(
			"GET",
			"/brightness",
			CapabilitiesMiddleware("Appearance"),
			...GetParameterHandler.handle("ImageSource.I0.Sensor.Brightness"),
		);

		settingsModule.on(
			"POST",
			"/contrast",
			CapabilitiesMiddleware("Appearance"),
			...SetIntParameterHandler.handle("ImageSource.I0.Sensor.Contrast", 100),
		);

		settingsModule.on(
			"GET",
			"/contrast",
			CapabilitiesMiddleware("Appearance"),
			...GetParameterHandler.handle("ImageSource.I0.Sensor.Contrast"),
		);

		settingsModule.on(
			"POST",
			"/sharpness",
			CapabilitiesMiddleware("Appearance"),
			...SetIntParameterHandler.handle("ImageSource.I0.Sensor.Sharpness", 100),
		);

		settingsModule.on(
			"GET",
			"/sharpness",
			CapabilitiesMiddleware("Appearance"),
			...GetParameterHandler.handle("ImageSource.I0.Sensor.Sharpness"),
		);

		settingsModule.on(
			"POST",
			"/localcontrast",
			CapabilitiesMiddleware("WideDynamicRange"),
			...SetIntParameterHandler.handle(
				"ImageSource.I0.Sensor.LocalContrast",
				100,
			),
		);

		settingsModule.on(
			"GET",
			"/localcontrast",
			CapabilitiesMiddleware("WideDynamicRange"),
			...GetParameterHandler.handle("ImageSource.I0.Sensor.LocalContrast"),
		);

		settingsModule.on(
			"POST",
			"/tonemapping",
			CapabilitiesMiddleware("WideDynamicRange"),
			...SetIntParameterHandler.handle(
				"ImageSource.I0.Sensor.ToneMapping",
				100,
			),
		);

		settingsModule.on(
			"GET",
			"/tonemapping",
			CapabilitiesMiddleware("WideDynamicRange"),
			...GetParameterHandler.handle("ImageSource.I0.Sensor.ToneMapping"),
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
