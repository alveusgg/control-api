import type DigestClient from "digest-fetch";

export interface Camera {
	name: string;
	address: string;
	client: DigestClient;
	capabilities: Set<string>;
}
