export interface Preset {
	name: string;
	pan: number;
	tilt: number;
	zoom: number;
	focus: number;
	brightness: number;
	autofocus: "string";
	autoiris: "string";
}

export interface PixelPreset {
	name: string;
	x: number;
	y: number;
}
