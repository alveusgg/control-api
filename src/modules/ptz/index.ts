import type { Module } from '@/modules/module.js';
import { Hono } from 'hono'

const PTZModule: Module = {
	name: "PTZ",
	basePath: "/ptz",
	Initialize: (ms, config): Hono => {
		const ptzModule = new Hono();
    	return ptzModule;
	},
	Shutdown: (): void => {}
}

export default PTZModule;