import {
	Hono,
	type Handler as HonoHandler,
	type MiddlewareHandler,
} from "hono";

import * as constants from "@/constants";

// Import modules
import CapturesModule from "./captures";
import PresetsModule from "./presets";
import DayNightModule from "./daynight";
import PTZModule from "./ptz";
import InfoModule from "./info";
import ImagingModule from "./imaging";
import SettingsModule from "./settings";
import ConfigModule from "./config";
import AuthenticationMiddleware from "@/server/middleware/authentication";

export interface Module {
	name: string;
	basePath: string;
	Initialize: (config: {
		[index: string]: any;
	}) => Hono<{ Variables: constants.Variables }>;
	Shutdown: () => void;
}

export interface Handler {
	openapi: MiddlewareHandler;
	handle: (...props: any) => [HonoHandler, ...HonoHandler[]];
}

export const serveHandler = (
	handler: Handler,
	...props: any
): HonoHandler[] => {
	return [handler.openapi, ...handler.handle(...props)];
};

// Register modules to be loaded here
export const modules: Module[] = [
	CapturesModule,
	PresetsModule,
	PTZModule,
	DayNightModule,
	InfoModule,
	ImagingModule,
	SettingsModule,
	ConfigModule,
];

export function RegisterUnauthenticatedRoute(
	module: Hono<{ Variables: constants.Variables }>,
	method: string,
	path: string,
	...handlers: HonoHandler[]
) {
	module.on(method, [path], ...handlers);
}

export function RegisterRoute(
	module: Hono<{ Variables: constants.Variables }>,
	method: string,
	path: string,
	...handlers: HonoHandler[]
) {
	// Registers unauthenticated route... but adds authentication
	RegisterUnauthenticatedRoute(
		module,
		method,
		path,
		AuthenticationMiddleware,
		...handlers,
	);
}
