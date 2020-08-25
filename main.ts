
import express from "express";
import http from "http";
import {argv} from "yargs";
import ip from "ip";

import * as service from "./backend/service";



const host = argv.h as string || "127.0.0.1";
const port = argv.p as number || 8080;


const app = express();


const httpServer = http.createServer(app);
httpServer.listen(port, host, () => {
	console.log("WebEditor development server online:", `https://${ip.address()}:${port}`);
});


service.createServer(httpServer);
