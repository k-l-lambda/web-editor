
import fs from "fs";



export default class FileProxy {
	constructor (filePath: string) {
		//console.log("File proxy created:", filePath);
		if (!fs.existsSync(filePath))
			throw new Error(`file not exist: ${filePath}`);
	}
};
