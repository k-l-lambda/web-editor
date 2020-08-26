
import path from "path";
import websocket from "websocket";
// eslint-disable-next-line
import { Server } from "net";

import FileProxy from "./fileProxy";
import { command } from "yargs";



interface ServerOptions {
	rootDir: string;
};



const acceptFrontendConnection = (request, options: ServerOptions) => {
	const connection = request.accept("editor-frontend", request.origin);
	console.log("[web-editor] frontend accepted:", request.origin, connection.remoteAddress);

	let file = null;

	connection.on("close", (reasonCode, description) => {
		console.log("[web-editor] frontend quit:", connection.remoteAddress, reasonCode, description);

		if (file) {
			file.dispose();
			file = null;
		}
	});

	const sendCommand = (command: string, data: object) => connection.sendUTF(JSON.stringify({
		command,
		...data,
	}));

	connection.on("message", message => {
		const json = JSON.parse(message.utf8Data);
		switch (json.command) {
		case "bindFile":
			try {
				const filePath = path.resolve(options.rootDir, json.filePath);
				file = new FileProxy(filePath);

				file.on("error", err => sendCommand("failure", err));
				file.on("fullSync", data => sendCommand("fullSync", data));
				file.on("increase", data => sendCommand("increase", data));
			}
			catch (err) {
				console.warn("bindFile failed:", err);
				connection.sendUTF(JSON.stringify({ command: "failure", description: err.toString() }));
			}

			break;
		case "increase":
			if (!file)
				sendCommand("failure", {description: "no file bound yet"});
			else {
				file.increase({
					timestamp: json.timestamp,
					fromHash: json.fromHash,
					toHash: json.toHash,
					patch: json.patch,
				});
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
