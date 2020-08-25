
import {EventEmitter} from "events";



export default class RemoteFile extends EventEmitter {
	autoReconnect: boolean;

	socket: WebSocket;
	connected: boolean = false;


	constructor ({autoReconnect = false} = {}) {
		super();

		this.autoReconnect = autoReconnect;
	}


	connect (host: string) {
		if (this.socket)
			this.socket.close();

		this.socket = new WebSocket(host, "editor-frontend");

		this.socket.onopen = () => {
			console.debug("[RemoteFile]	socket open.");

			this.connected = true;
			this.emit("connected");
		};
	
		this.socket.onclose = event => {
			console.warn("Synchronizer service socket closed:", event.code, event.reason);

			this.connected = false;
			this.emit("disconnected");

			if (this.autoReconnect && event.code === 1006) {
				console.log("[RemoteFile]	try to reconnect...");
				setTimeout(() => this.connect(host), 100);
			}
		};

		this.socket.onmessage = event => {
			const message = JSON.parse(event.data);
			switch (message.command) {
			default:
				console.warn("[RemoteFile]	unexpected command:", message);
			}
		};
	}


	close () {
		this.socket.close();
	}
};