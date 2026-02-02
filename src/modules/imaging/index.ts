import { Hono } from "hono";

import * as constants from "@/constants";
import type { Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import FocusHandler from "./focus_handler";
import BrightnessHandler from "./brightness_handler";
import IrisHandler from "./iris_handler";
import RFocusHandler from "./relative_focus_handler";
import RBrightnessHandler from "./relative_brightness_handler";
import IRrisHandler from "./relative_iris_handler";
import AutofocusHandler from "./autofocus_handler";
import AutoirisHandler from "./autobrightness_handler";
import CFocusHandler from "./continuous_focus_handler";
import CBrightnessHandler from "./continuous_brightness_handler";
import CIrisHandler from "./continuous_iris_handler";

const ImagingModule: Module = {
	name: "Imaging",
	basePath: "/imaging",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const imagingModule = new Hono<{ Variables: constants.Variables }>();

		imagingModule.use(CameraMiddleware);

		// Absolute imaging
		imagingModule.on(
			"POST",
			"/focus",
			CapabilitiesMiddleware("Focus"),
			...FocusHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/brightness",
			CapabilitiesMiddleware("Brightness"),
			...BrightnessHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/iris",
			CapabilitiesMiddleware("Iris"),
			...IrisHandler.handle(),
		);

		// Relative imaging
		imagingModule.on(
			"POST",
			"/rfocus",
			CapabilitiesMiddleware("Focus"),
			...RFocusHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/rbrightness",
			CapabilitiesMiddleware("Brightness"),
			...RBrightnessHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/riris",
			CapabilitiesMiddleware("Iris"),
			...IRrisHandler.handle(),
		);

		// Auto imaging
		imagingModule.on(
			"POST",
			"/autofocus",
			CapabilitiesMiddleware("Focus"),
			...AutofocusHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/autoiris",
			CapabilitiesMiddleware("Iris"),
			...AutoirisHandler.handle(),
		);

		// Continuous imaging
		imagingModule.on(
			"POST",
			"/cfocus",
			CapabilitiesMiddleware("Focus"),
			...CFocusHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/cbrightness",
			CapabilitiesMiddleware("ContinuousBrightness"),
			...CBrightnessHandler.handle(),
		);

		imagingModule.on(
			"POST",
			"/ciris",
			CapabilitiesMiddleware("ContinuousIris"),
			...CIrisHandler.handle(),
		);

		return imagingModule;
	},
	Shutdown: (): void => {},
};

export default ImagingModule;
