import fs from "fs";
import replace from "replace-in-file";
import { terser } from "rollup-plugin-terser";

export default [
	{
		input: "src/renderer.js",
		output: {
			file: "dist/renderer.js",
			format: "esm",
			sourcemap: false
		},
		external: ["electron"],
		plugins: []
	},
	{
		input: "src/alert.js",
		output: {
			file: "dist/alert.js",
			format: "cjs",
			sourcemap: false
		},
		external: [
			"electron",
			"uniqid",
			"electron-positioner",
			"temp-write",
			"exception-formatter"
		],
		plugins: [
			stringReplace(
				"./dist/alert.js",
				/<@insert-renderer@>/,
				"./dist/renderer.js"
			),
			stringReplace(
				"./dist/alert.js",
				/<@insert-swal-lib@>/,
				"node_modules/sweetalert2/dist/sweetalert2.all.min.js"
			),
			deleteFile("./dist/renderer.js")
		]
	},
	// Minified version
	{
		input: "src/renderer.js",
		output: {
			file: "dist/renderer.min.js",
			format: "esm",
			sourcemap: false
		},
		external: ["electron"],
		plugins: [
			terser({
				ecma: 6,
				mangle: {
					reserved: ["uid", "sound", "config", "_sound", "_config"]
				}
			})
		]
	},
	{
		input: "src/alert.js",
		output: {
			file: "dist/alert.min.js",
			format: "cjs",
			sourcemap: false
		},
		external: [
			"electron",
			"uniqid",
			"electron-positioner",
			"temp-write",
			"exception-formatter"
		],
		plugins: [
			terser({
				ecma: 6,
				mangle: {
					reserved: ["uid", "sound", "config", "_sound", "_config"]
				}
			}),
			stringReplace(
				"./dist/alert.min.js",
				/<@insert-renderer@>/,
				"./dist/renderer.min.js"
			),
			stringReplace(
				"./dist/alert.min.js",
				/<@insert-swal-lib@>/,
				"node_modules/sweetalert2/dist/sweetalert2.all.min.js"
			),
			deleteFile("./dist/renderer.min.js")
		]
	}
];

function stringReplace(file, tag, toFile) {
	return {
		name: "stringReplace",
		writeBundle: function() {
			var js = fs.readFileSync(toFile, "utf8");
			js = js.replace(/`/g, String.fromCharCode(92, 96)); // ` => \`

			replace.sync({
				files: file,
				from: tag,
				to: js
			});
		}
	};
}

function deleteFile(filePath) {
	return {
		name: "deleteFile",
		writeBundle: function() {
			fs.unlinkSync(filePath);
		}
	};
}
