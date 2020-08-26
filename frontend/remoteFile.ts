
import {EventEmitter} from "events";
import sha1 from "sha1";



export default class RemoteFile extends EventEmitter {
	autoReconnect: boolean;

	socket: WebSocket;
	connected: boolean = false;

	_content: string;


	constructor ({autoReconnect = false} = {}) {
		super();

		this.autoReconnect = autoReconnect;
	}


	get hash (): string {
		return sha1(this._content);
	}


	get content (): string {
		return this._content;
	}


	connect (host: string, filePath: string) {
		if (this.socket)
			this.socket.close();

		this.socket = new WebSocket(host, "editor-frontend");

		this.socket.onopen = () => {
			console.debug("[RemoteFile]	socket open.");

			this.connected = true;
			this.emit("connected");

			this.socket.send(JSON.stringify({ command: "bindFile", filePath }));
		};
	
		this.socket.onclose = event => {
			console.warn("Synchronizer service socket closed:", event.code, event.reason);

			this.connected = false;
			this.emit("disconnected");

			if (this.autoReconnect && event.code === 1006) {
				console.log("[RemoteFile]	try to reconnect...");
				setTimeout(() => this.connect(host, filePath), 100);
			}
		};

		this.socket.onmessage = event => {
			const message = JSON.parse(event.data);
			switch (message.command) {
			case "failure":
				console.warn("service failure:", message.description);
				this.close();

				break;
			case "fullSync":
				this._content = message.content;
				console.assert(this.hash === message.hash, "[RemoteFile] hash mismatched:", this.hash, message.hash);

				this.emit("sync");

				break;
			default:
				console.warn("[RemoteFile]	unexpected command:", message);
			}
		};
	}


	close () {
		this.socket.close();
	}
};
