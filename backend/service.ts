
import websocket from "websocket";



const acceptFrontendConnection = request => {
	const connection = request.accept("editor-frontend", request.origin);
	console.log("[web-editor] frontend accepted:", request.origin, connection.remoteAddress);

	connection.on("close", (reasonCode, description) => {
		console.log("[web-editor] frontend quit:", connection.remoteAddress, reasonCode, description);

		// TODO:
	});

	connection.on("message", message => {
		const json = JSON.parse(message.utf8Data);
		switch (json.command) {
		// TODO:
		default:
			console.warn("[web-editor] unexpected frontend command:", json);
		}
	});

	return connection;
};


export function createServer (httpServer) {
	const server = new websocket.server({
		httpServer,
		maxReceivedFrameSize: 0x1000000,
		maxReceivedMessageSize: 0x1000000,
		closeTimeout: 30e+3,
	});

	server.on("request", request => {
		//console.log("[Synchronizer] request received:", request.origin);

		if (request.requestedProtocols.includes("editor-frontend"))
			acceptFrontendConnection(request);
		else
			console.warn("Unexpected subprotocol request:", request.origin, request.requestedProtocols);
	});

	return server;
};
