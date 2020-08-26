
import path from "path";
import websocket from "websocket";
// eslint-disable-next-line
import { Server } from "net";

import FileProxy from "./fileProxy";



interface ServerOptions {
	rootDir: string;
};



const acceptFrontendConnection = (request, options: ServerOptions) => {
	const connection = request.accept("editor-frontend", request.origin);
	console.log("[web-editor] frontend accepted:", request.origin, connection.remoteAddress);

	connection.on("close", (reasonCode, description) => {
		console.log("[web-editor] frontend quit:", connection.remoteAddress, reasonCode, description);

		// TODO: dispose file proxy
	});

	connection.on("message", message => {
		const json = JSON.parse(message.utf8Data);
		switch (json.command) {
		case "bindFile":
			try {
				const filePath = path.resolve(options.rootDir, json.filePath);
				const file = new FileProxy(filePath);
			}
			catch (err) {
				console.warn("bindFile failed:", err);
				connection.sendUTF(JSON.stringify({ command: "failure", description: err.toString() }));
			}

			break;
		default:
			console.warn("[web-editor] unexpected frontend command:", json);
		}
	});

	return connection;
};


export function createServer (httpServer: Server, options: ServerOptions) {
	const server = new websocket.server({
		httpServer,
		maxReceivedFrameSize: 0x1000000,
		maxReceivedMessageSize: 0x1000000,
		closeTimeout: 30e+3,
	});

	server.on("request", request => {
		//console.log("[Synchronizer] request received:", request.origin);

		if (request.requestedProtocols.includes("editor-frontend"))
			acceptFrontendConnection(request, options);
		else
			console.warn("Unexpected subprotocol request:", request.origin, request.requestedProtocols);
	});

	return server;
};
