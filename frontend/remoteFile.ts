
import {EventEmitter} from "events";



export default class RemoteFile extends EventEmitter {
	autoReconnect: boolean;

	socket: WebSocket;


	constructor ({autoReconnect = false} = {}) {
		super();

		this.autoReconnect = autoReconnect;
	}


	connect (host: string) {
		if (this.socket)
			this.socket.close();

		this.socket = new WebSocket(host, "synchronizer-watcher");

		this.socket.onopen = () => {
			console.debug("[RemoteFile]	socket open.");
			this.emit("connected");
		};
	
		this.socket.onclose = event => {
			console.warn("Synchronizer service socket closed:", event.code, event.reason);
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
};
