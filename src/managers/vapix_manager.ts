class VAPIXManager {
	constructor() {}

	async makeAPICall(
		url: string,
		authorization: string,
		method: RequestInit["method"] = "GET",
	): Promise<Response> {
		try {
			const response = await fetch(url, {
				method: method,
				headers: {
					authorization: "Basic " + authorization,
				},
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

		return `http://${target}/axis-cgi/com/${api}.cgi?${params.toString()}`;
	}
}

export default new VAPIXManager();
