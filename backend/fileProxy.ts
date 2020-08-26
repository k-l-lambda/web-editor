
import fs from "fs";
import {EventEmitter} from "events";
import sha1 from "sha1";
import * as diff from "diff";

import asyncCall from "./asyncCall";



export default class FileProxy extends EventEmitter {
	content: string;
	timestamp: number;
	filePath: string;


	constructor (filePath: string) {
		super();

		this.filePath = filePath;

		//console.log("File proxy created:", filePath);
		if (!fs.existsSync(filePath))
			throw new Error(`file not exist: ${filePath}`);

		asyncCall(fs.stat, filePath)
			.then(stats => {
				this.timestamp = stats.mtime.getTime();

				return asyncCall(fs.readFile, filePath);
			})
			.then(buffer => {
				this.content = buffer.toString();
				this.fullSync();
			});

		fs.watchFile(filePath, async (current, previous) => {
			this.timestamp = current.mtime.getTime();

			const buffer = await asyncCall(fs.readFile, filePath);
			if (!buffer) {
				this.emit("error", {description: "file reading failed"});
				return;
			}

			const newContent = buffer.toString();
			const patch = diff.createPatch(filePath, this.content, newContent);

			this.emit("increase", {
				timestamp: this.timestamp,
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
			timestamp: this.timestamp,
			content: this.content,
			hash: this.hash,
		});
	}


	increase ({timestamp, fromHash, toHash, patch}: {
		timestamp: number,
		fromHash: string,
		toHash: string,
		patch: string,
	}) {
		if (this.hash !== fromHash) {
			if (this.timestamp > timestamp)
				// web content is out of date
				this.fullSync();
			else
				console.warn("[FileProxy] disk file content is behind increase base:", this.timestamp, timestamp);
		}
		else {
			const content = diff.applyPatch(this.content, patch);
			const hash = sha1(content);

			console.assert(hash === toHash, "[FileProxy] verify failed:", this.hash, toHash, content);

			if (hash === toHash)
				asyncCall(fs.writeFile, this.filePath, content);
		}
	}
};
