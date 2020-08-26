
import fs from "fs";
import {EventEmitter} from "events";
import sha1 from "sha1";

import asyncCall from "./asyncCall";



export default class FileProxy extends EventEmitter {
	content: string;


	constructor (filePath: string) {
		super();

		//console.log("File proxy created:", filePath);
		if (!fs.existsSync(filePath))
			throw new Error(`file not exist: ${filePath}`);

		asyncCall(fs.readFile, filePath)
			.then(buffer => {
				this.content = buffer.toString();
				this.fullSync();
			});
	}


	get hash (): string {
		return sha1(this.content);
	}


	fullSync () {
		this.emit("fullSync", {
			content: this.content,
			hash: this.hash,
		});
	}
};
