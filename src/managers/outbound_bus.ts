import type { Message } from "@/models";

class OutboundBus extends EventTarget {
	broadcast(msg: Message) {
		const payload = JSON.stringify(msg);
		this.dispatchEvent(new MessageEvent("message", { data: payload }));
	}
}

export default new OutboundBus();
