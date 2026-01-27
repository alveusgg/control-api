import type DigestClient from "digest-fetch";

class VAPIXManager {
	constructor() {}

	async makeAPICall(
		url: string,
		client: DigestClient,
		method: RequestInit["method"] = "GET",
	): Promise<Response> {
		try {
			const response = await client.fetch(url, {
				method: method,
			});
			return response;
		} catch (error) {
			throw error;
		}
	}

	URLBuilder(api: string, target: string, URLParams: any): string {
		const params = new URLSearchParams(
			Object.assign(
				{
					camera: "1",
				},
				URLParams,
			),
		);

		return `http://${target}/axis-cgi/${api}.cgi?${params.toString()}`;
	}
}

export default new VAPIXManager();
