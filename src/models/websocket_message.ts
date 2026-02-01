export interface Message {
	camera: string;
	timestamp: number;
	event: string;
	data: any;
}

export interface RawMessage {
	topic: string;
	timestamp: number;
	message: {
		source: { PTZConfigurationToken: string };
		key: Record<string, any>;
		data: any;
	};
}
