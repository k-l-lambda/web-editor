
import fs from "fs";
import {EventEmitter} from "events";
import sha1 from "sha1";
import * as diff from "diff";

import asyncCall from "./asyncCall";



export default class FileProxy extends EventEmitter {
	content: string;
	timestamp: number;
	diskTimestamp: number;
	filePath: string;

	alive: boolean = true;
	writeFile: () => void;

	fileListener: (curr: fs.Stats) => Promise<void>;


	constructor (filePath: string) {
		super();

		this.filePath = filePath;

		//console.log("File proxy created:", filePath);
		if (!fs.existsSync(filePath))
			throw new Error(`file not exist: ${filePath}`);

		asyncCall(fs.stat, filePath)
			.then(stats => {
				this.diskTimestamp = stats.mtime.getTime();
				this.timestamp = this.diskTimestamp;

				return asyncCall(fs.readFile, filePath);
			})
			.then(buffer => {
				this.content = buffer.toString();
				this.fullSync();
			});

		this.fileListener = async current => {
			this.diskTimestamp = current.mtime.getTime();
			this.timestamp = this.diskTimestamp;

			const buffer = await asyncCall(fs.readFile, filePath);
			if (!buffer) {
				this.emit("error", {description: "file reading failed"});
				return;
			}

			const newContent = buffer.toString();
			const newHash = sha1(newContent);
			if (newHash !== this.hash) {
				const patch = diff.createPatch(filePath, this.content, newContent);

				this.emit("increase", {
					timestamp: this.timestamp,
					fromHash: this.hash,
					toHash: newHash,
					patch,
				});
	
				this.content = newContent;
			}
		};

		fs.watchFile(filePath, this.fileListener);

		this.keepWriteFile();
	}


	dispose () {
		this.alive = false;

		if (this.fileListener)
			fs.unwatchFile(this.filePath, this.fileListener);
	}


	makeWritePromise (): Promise<void> {
		return new Promise(resolve => this.writeFile = resolve);
	}


	async keepWriteFile () {
		let writeSignal = this.makeWritePromise();

		while (this.alive) {
			await writeSignal;
			writeSignal = this.makeWritePromise();

			//console.debug("keepWriteFile:", this.timestamp, this.diskTimestamp);
			if (this.timestamp > this.diskTimestamp) {
				await asyncCall(fs.writeFile, this.filePath, this.content);
			}
		}
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
			this.content = diff.applyPatch(this.content, patch);
			this.timestamp = timestamp;

			console.assert(this.hash === toHash, "[FileProxy] verify failed:", this.hash, toHash, this.content);

			// trigger file writing
			this.writeFile();
		}
	}
};
