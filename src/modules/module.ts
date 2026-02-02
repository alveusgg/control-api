import { Hono, type Handler as HonoHandler } from "hono";
import type { ZodObject } from "zod";

import * as constants from "@/constants";

// Import modules
import DayNightModule from "./daynight";
import PTZModule from "./ptz";
import InfoModule from "./info";
import ImagingModule from "./imaging";

export interface Module {
	name: string;
	basePath: string;
	Initialize: (config: {
		[index: string]: any;
	}) => Hono<{ Variables: constants.Variables }>;
	Shutdown: () => void;
}

export interface Handler {
	adapter?: ZodObject;
	handle: () => HonoHandler[];
}

// Register modules to be loaded here
export const modules: Module[] = [
	PTZModule,
	DayNightModule,
	InfoModule,
	ImagingModule,
];
