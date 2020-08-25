
const path = require("path");
const EsmWebpackPlugin = require("@purtuga/esm-webpack-plugin");



module.exports = {
	entry: {
		index: "./lib.browser/index.frontend.js",
	},
	output: {
		path: path.join(__dirname, "app/lib"),
		filename: "[name].mjs",
		library: "LIB",
		libraryTarget: "var",
	},
	plugins: [
		new EsmWebpackPlugin(),
	],
	mode: "development",
};
