
#	web-editor ![logo](./app/favicon.ico)

A WebSocket based text file synchronizer between disk and web browser.

## Installation

```bash
npm install @k-l-lambda/web-editor --save
```

## Usage

* Backend example:

```javascript
import http from "http";
import * as webEditor from "@k-l-lambda/web-editor";



// setup a web socket server over HTTP
const httpServer = http.createServer();
httpServer.listen("8080", "127.0.0.1", () => {
	console.log("WebEditor server is online.");
});


webEditor.service.createServer(httpServer, {rootDir: "/my-assets-folder"});
```

* Frontend example:

```javascript
import * as webEditor from "@k-l-lambda/web-editor";



// assume you have a textarea with id 'my-textarea' in DOM
const $textarea = document.querySelector("#my-textarea");

const remoteFile = new webEditor.RemoteFile();


remoteFile.on("sync", ({timestamp}) => {
	// receive change from disk
	$textarea.value = remoteFile.content;
	console.log("Disk change synchronized:", new Date(timestamp));
});


$textarea.onchange = () => {
	// send browser modification to disk
	remoteFile.content = $textarea.value;
};


// assume you have a file '/my-assets-folder/my-text.txt' on disk
remoteFile.connect("ws://127.0.0.1:8080", "my-text.txt");
```
