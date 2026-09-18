import { Hono } from "hono";

import * as constants from "@/constants";
import { RegisterRoute, serveHandler, type Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import {
	GetParameterHandler,
	SetParameterHandler,
} from "./boolean_parameter_handler";
import SetSpeedHandler from "./set_speed_handler";
import GetSpeedHandler from "@/modules/info/get_speed_handler";
import SetIntParameterHandler from "./int_parameter_handler";
import SetEnumParameterHandler from "./enum_parameter_handler";

// root.PTZ.UserAdv.U1.FocusAutoType. "assisted" lets the camera use its
// zoom/focus curve to help find focus after a jump; "normal" does not, and quick
// zoom does nothing at all on a camera set that way. Nearly every camera ships
// assisted, which is why this went unnoticed until one didn't.
//
// Lowercase because that is what the camera reports and accepts; the parameter
// is FocusAutoType, not AutoFocusType, despite reading as "Auto Focus Type" in
// the web UI.
const FOCUS_AUTO_TYPES = ["normal", "assisted"] as const;

const SettingsModule: Module = {
	name: "Settings",
	basePath: "/settings",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const SettingsModule = new Hono<{ Variables: constants.Variables }>();

		SettingsModule.use(...CameraMiddleware);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/quickzoom",
			CapabilitiesMiddleware("PTZ", "QuickZoom"),
			...serveHandler(GetParameterHandler, "PTZ.UserAdv.U1.QuickZoom"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/quickzoom",
			CapabilitiesMiddleware("PTZ", "QuickZoom"),
			...serveHandler(SetParameterHandler, "PTZ.UserAdv.U1.QuickZoom"),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/focusautotype",
			CapabilitiesMiddleware("PTZ", "Focus", "AssistedFocus"),
			...serveHandler(GetParameterHandler, "PTZ.UserAdv.U1.FocusAutoType"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/focusautotype",
			CapabilitiesMiddleware("PTZ", "Focus", "AssistedFocus"),
			...serveHandler(
				SetEnumParameterHandler,
				"PTZ.UserAdv.U1.FocusAutoType",
				FOCUS_AUTO_TYPES,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/spotfocus",
			CapabilitiesMiddleware("SpotFocus"),
			...serveHandler(GetParameterHandler, "PTZ.UserAdv.U1.SpotFocus"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/spotfocus",
			CapabilitiesMiddleware("SpotFocus"),
			...serveHandler(SetParameterHandler, "PTZ.UserAdv.U1.SpotFocus"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/saturation",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(
				SetIntParameterHandler,
				"ImageSource.I0.Sensor.ColorLevel",
				100,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/saturation",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(GetParameterHandler, "ImageSource.I0.Sensor.ColorLevel"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/brightness",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(
				SetIntParameterHandler,
				"ImageSource.I0.Sensor.Brightness",
				100,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/brightness",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(GetParameterHandler, "ImageSource.I0.Sensor.Brightness"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/contrast",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(
				SetIntParameterHandler,
				"ImageSource.I0.Sensor.Contrast",
				100,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/contrast",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(GetParameterHandler, "ImageSource.I0.Sensor.Contrast"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/sharpness",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(
				SetIntParameterHandler,
				"ImageSource.I0.Sensor.Sharpness",
				100,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/sharpness",
			CapabilitiesMiddleware("Appearance"),
			...serveHandler(GetParameterHandler, "ImageSource.I0.Sensor.Sharpness"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/localcontrast",
			CapabilitiesMiddleware("WideDynamicRange"),
			...serveHandler(
				SetIntParameterHandler,
				"ImageSource.I0.Sensor.LocalContrast",
				100,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/localcontrast",
			CapabilitiesMiddleware("WideDynamicRange"),
			...serveHandler(
				GetParameterHandler,
				"ImageSource.I0.Sensor.LocalContrast",
			),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/tonemapping",
			CapabilitiesMiddleware("WideDynamicRange"),
			...serveHandler(
				SetIntParameterHandler,
				"ImageSource.I0.Sensor.ToneMapping",
				100,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/tonemapping",
			CapabilitiesMiddleware("WideDynamicRange"),
			...serveHandler(GetParameterHandler, "ImageSource.I0.Sensor.ToneMapping"),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/proportionalspeed",
			CapabilitiesMiddleware("PTZ"),
			...serveHandler(
				SetIntParameterHandler,
				"PTZ.Various.V1.MaxProportionalSpeed",
				1000,
			),
		);

		RegisterRoute(
			SettingsModule,
			"GET",
			"/proportionalspeed",
			CapabilitiesMiddleware("PTZ"),
			...serveHandler(
				GetParameterHandler,
				"PTZ.Various.V1.MaxProportionalSpeed",
			),
		);

		// This is identical to info/speed, I just couldn't decide where to put it
		RegisterRoute(
			SettingsModule,
			"GET",
			"/speed",
			CapabilitiesMiddleware("PTZ"),
			...serveHandler(GetSpeedHandler),
		);

		RegisterRoute(
			SettingsModule,
			"POST",
			"/speed",
			CapabilitiesMiddleware("PTZ"),
			...serveHandler(SetSpeedHandler),
		);

		return SettingsModule;
	},
	Shutdown: (): void => {},
};

export default SettingsModule;
