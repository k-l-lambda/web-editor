
import http from "http";
import {argv} from "yargs";
import ip from "ip";

import * as service from "./backend/service";



const host = argv.h as string || "127.0.0.1";
const port = argv.p as number || 8140;


const httpServer = http.createServer();
httpServer.listen(port, host, () => {
	console.log("WebEditor development server online:", `ws://${ip.address()}:${port}`);
});


service.createServer(httpServer);
