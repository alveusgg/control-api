import { Hono } from 'hono'

export interface ModuleServer {

}

export interface Module {
    name: string;
	basePath: string;
    Initialize: (ms: ModuleServer, config: {[index: string]: any}) => Hono;
    Shutdown: () => void;
}



const modules: Module[] = [

];

