
import {EventEmitter} from "events";
import sha1 from "sha1";
import * as diff from "diff";


export default class RemoteFile extends EventEmitter {
	autoReconnect: boolean;

	socket: WebSocket;
	connected: boolean = false;
	filePath: string;

	timestamp: number;
	_content: string;


	constructor ({autoReconnect = false} = {}) {
		super();

		this.autoReconnect = autoReconnect;
	}


	get hash (): string {
		return sha1(this._content) as string;
	}


	get content (): string {
		return this._content;
	}


	set content (value: string) {
		const timestamp = Date.now();

		const patch = diff.createPatch(this.filePath, this._content, value);

		this.socket.send(JSON.stringify({
			command: "increase",
			timestamp,
			fromHash: this.hash,
			toHash: sha1(value),
			patch,
		}));

		this.timestamp = timestamp;
		this._content = value;
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
				this.timestamp = message.timestamp;
				this._content = message.content;
				console.assert(this.hash === message.hash, "[RemoteFile] verify failed:", this.hash, message.hash);

				this.emit("sync", {timestamp: this.timestamp});

				break;
			case "increase":
				//console.log("increase:", this.hash, message);

				// already consistent with remote, update timestemp only
				if (this.hash === message.toHash) {
					this.timestamp = Math.max(this.timestamp, message.timestamp);
					break;
				}

				if (this.hash !== message.fromHash) {
					if (message.timestamp < this.timestamp)
						break;

					console.warn("hash mismatched:", this.hash, message.fromHash);
					this.socket.send(JSON.stringify({ command: "requestFullSync", timestamp: this.timestamp}));
				}
				else {
					this.timestamp = message.timestamp;
					this._content = diff.applyPatch(this._content, message.patch);
					console.assert(this.hash === message.toHash, "[RemoteFile] verify failed:", this.hash, message.toHash);

					this.emit("sync", {timestamp: this.timestamp});
				}

				break;
			default:
				console.warn("[RemoteFile]	unexpected command:", message);
			}
		};

		this.filePath = filePath;
	}


	close () {
		this.socket.close();
	}
};
