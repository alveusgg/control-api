import type DigestClient from "digest-fetch";

export interface Camera {
	name: string;
	host: string;
	client: DigestClient;
	capabilities: Set<string>;
}
