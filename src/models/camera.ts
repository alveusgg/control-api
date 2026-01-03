export interface Camera {
	name: string;
	address: string;
	login: string; // btoa encoded string from user + pass
	capabilities: Set<string>;
}
