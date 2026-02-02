import { Hono } from "hono";

import * as constants from "@/constants";
import type { Module } from "@/modules/module";
import { CameraMiddleware, CapabilitiesMiddleware } from "@/server/middleware";

import PTZHandler from "./ptz_handler";
import MoveHandler from "./move_handler";
import PanHandler from "./pan_handler";
import TiltHandler from "./tilt_handler";
import ZoomHandler from "./zoom_handler";
import AreazoomHandler from "./areazoom_handler";
import SpinHandler from "./spin_handler";
import RPTZHandler from "./relative_ptz_handler";
import RPanHandler from "./relative_pan_handler";
import RTiltHandler from "./relative_tilt_handler";
import RZoomHandler from "./relative_zoom_handler";

const PTZModule: Module = {
	name: "PTZ",
	basePath: "/ptz",
	Initialize: (config): Hono<{ Variables: constants.Variables }> => {
		const ptzModule = new Hono<{ Variables: constants.Variables }>();

		ptzModule.use(CameraMiddleware);

		ptzModule.on(
			"POST",
			"",
			CapabilitiesMiddleware("PTZ"),
			...PTZHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/move",
			CapabilitiesMiddleware("PTZ"),
			...MoveHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/pan",
			CapabilitiesMiddleware("PTZ"),
			...PanHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/tilt",
			CapabilitiesMiddleware("PTZ"),
			...TiltHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/zoom",
			CapabilitiesMiddleware("PTZ"),
			...ZoomHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/areazoom",
			CapabilitiesMiddleware("PTZ"),
			...AreazoomHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/spin",
			CapabilitiesMiddleware("PTZ"),
			...SpinHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"rptz",
			CapabilitiesMiddleware("PTZ"),
			...RPTZHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/rpan",
			CapabilitiesMiddleware("PTZ"),
			...RPanHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/rtilt",
			CapabilitiesMiddleware("PTZ"),
			...RTiltHandler.handle(),
		);

		ptzModule.on(
			"POST",
			"/rzoom",
			CapabilitiesMiddleware("PTZ"),
			...RZoomHandler.handle(),
		);

		return ptzModule;
	},
	Shutdown: (): void => {},
};

export default PTZModule;
