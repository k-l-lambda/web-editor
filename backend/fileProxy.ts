
import fs from "fs";
import {EventEmitter} from "events";
import sha1 from "sha1";
import * as diff from "diff";

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

		fs.watchFile(filePath, async (current, previous) => {
			const buffer = await asyncCall(fs.readFile, filePath);
			if (!buffer) {
				this.emit("error", {description: "file reading failed"});
				return;
			}

			const newContent = buffer.toString();
			const patch = diff.createPatch(filePath, this.content, newContent);

			this.emit("increase", {
				fromHash: this.hash,
				toHash: sha1(newContent),
				patch,
			});

			this.content = newContent;
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
