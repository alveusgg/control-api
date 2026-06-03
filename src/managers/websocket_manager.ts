import { IRObserver, PTZObserver } from "@/observers";
import CameraManager from "./camera_manager";
import ObserverRegistry from "./observer_registry";

const builtInObservers = [PTZObserver, IRObserver];

class WebSocketManager {
	#bootstrapped: boolean = false;

	bootstrap() {
		if (this.#bootstrapped) return;
		ObserverRegistry.bootstrap(Object.keys(CameraManager.getCameras()));
		builtInObservers.forEach((o) => ObserverRegistry.register(o));
		this.#bootstrapped = true;
	}
}

export default new WebSocketManager();
