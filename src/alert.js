// Copyright 2019-20 PJ Engineering and Business Solutions Pty. Ltd. All rights reserved.

const { ipcMain, globalShortcut, app, BrowserWindow } = require("electron");
const tempWrite = require("temp-write");
const cleanStak = require("clean-stack");
const cryptoRandomString = require("crypto-random-string");
const Positioner = require("electron-positioner");
const fs = require("fs");
const exceptionFormatter = require("exception-formatter");
const DismissReason = Object.freeze({
	cancel: "cancel",
	close: "close",
	esc: "esc",
	timer: "timer",
	showing: "showing", // Singleton alert currently showing
});

const isMac = process.platform === "darwin";

const singletonIds = {};

module.exports = class Alert {
	constructor(head, devTools) {
		this.head = head;
		this.devTools = devTools;
		this.uid = cryptoRandomString({ length: 10 });
		this.browserWindow = null;
		this.position = "center";
		this._isVisible = false;
	}

	static get DismissReason() {
		return DismissReason;
	}

	isVisible() {
		return this._isVisible;
	}

	enableButtons() {
		this.execJS(`Swal.enableButtons()`);
	}

	disableButtons() {
		this.execJS(`Swal.disableButtons()`);
	}

	showLoading() {
		this.execJS(`Swal.showLoading()`);
	}

	enableLoading() {
		this.showLoading();
	}

	hideLoading() {
		this.execJS(`Swal.hideLoading()`);
	}

	disableLoading() {
		this.hideLoading();
	}

	isLoading() {
		//: boolean
		return this.execJS(`Swal.isLoading()`);
	}

	clickConfirm() {
		//: void
		this.execJS(`Swal.clickConfirm()`);
	}

	clickCancel() {
		//: void
		this.execJS(`Swal.clickCancel()`);
	}

	showValidationMessage(validationMessage) {
		//: void
		this.execJS(
			`Swal.showValidationMessage('${validationMessage}')`,
			() => {
				if (this.browserWindow) {
					this.browserWindow.webContents.send(
						`${this.uid}resizeToFit`,
						25
					);
				}
			}
		);
	}

	resetValidationMessage() {
		//: void;
		this.execJS(`Swal.resetValidationMessage()`, () => {
			if (this.browserWindow) {
				this.browserWindow.webContents.send(
					`${this.uid}resizeToFit`,
					25
				);
			}
		});
	}

	disableInput() {
		//: void;
		this.execJS(`Swal.disableInput()`);
	}

	enableInput() {
		//: void;
		this.execJS(`Swal.enableInput()`);
	}

	getTimerLeft() {
		//: promise => number | undefined;
		return this.execJS(`Swal.getTimerLeft()`);
	}

	stopTimer() {
		//promise => number | undefined;
		return this.execJS(`Swal.stopTimer()`);
	}

	resumeTimer() {
		//: promise => number | undefined;
		return this.execJS(`Swal.resumeTimer()`);
	}

	toggleTimer() {
		//: promise => number | undefined;
		return this.execJS(`Swal.toggleTimer()`);
	}

	isTimerRunning() {
		//: promise => boolean | undefined;
		//method should be looked into / revisited
		return this.execJS(`Swal.isTimerRunning()`);
	}

	increaseTimer(
		n //: promise => number | undefined;
	) {
		return this.execJS(`Swal.increaseTimer(${n})`);
	}

	showProgressSteps() {
		//: void;
		this.execJS(`Swal.showProgressSteps()`);
	}

	hideProgressSteps() {
		//: void;
		this.execJS(`Swal.hideProgressSteps()`);
	}

	isValidParameter(
		paramName //: promise => boolean;
	) {
		return this.execJS(`Swal.isValidParameter('${paramName}')`);
	}

	isUpdatableParameter(
		paramName //: promise => boolean;
	) {
		return this.execJS(`isUpdatableParameter('${paramName}')`);
	}

	fireFrameless(swalOptions, parent, alwaysOnTop, draggable, sound, size) {
		let bwOptions = {
			frame: false,
			transparent: true,
			thickFrame: false,
			closable: false,
			backgroundColor: "#00000000",
			hasShadow: false,
		};

		bwOptions = bwOptions;
		swalOptions.backdrop = `rgba(0,0,0,0.0)`;
		swalOptions.allowOutsideClick = false;

		if (size !== undefined) {
			if (size.hasOwnProperty("width")) {
				bwOptions.width = size.width;
			}
			if (size.hasOwnProperty("height")) {
				bwOptions.height = size.height;
			}
		}

		return this.fire(
			swalOptions,
			bwOptions,
			parent,
			alwaysOnTop,
			draggable,
			sound
		);
	}

	fireWithFrame(swalOptions, title, parent, alwaysOnTop, sound, size) {
		let bwOptions = {
			frame: true,
			transparent: false,
			thickFrame: true,
			closable: true,
			title: title ? title : "name" in app ? app.name : app.getName(),
		};

		bwOptions = bwOptions;
		swalOptions.allowOutsideClick = false;
		swalOptions.animation = false;

		if (size !== undefined) {
			if (size.hasOwnProperty("width")) {
				bwOptions.width = size.width;
			}
			if (size.hasOwnProperty("height")) {
				bwOptions.height = size.height;
			}
		}

		swalOptions.customClass = Object.assign(
			swalOptions.customClass ? swalOptions.customClass : {},
			{
				popup: "border-radius-0",
			}
		);

		return this.fire(swalOptions, bwOptions, parent, alwaysOnTop, sound);
	}

	static fireToast(swalOptions, sound, size) {
		// Animation: https://github.com/electron/electron/issues/2407
		// https://stackoverflow.com/questions/54413142/how-can-i-modify-sweetalert2s-toast-animation-settings

		//    let head = [
		//      `
		//          <style>
		// .swal2-show {
		//   animation: swal2-show 15s !important;
		// }
		//              </style>
		//      `
		//    ];

		let alert = new Alert();
		swalOptions.toast = true;
		// swalOptions.onOpen = el => {
		// alert.browserWindow.webContents.send(`${alert.uid}resizeToFit`, 25);
		// };

		let bwOptions = {};
		if (size !== undefined) {
			if (size.hasOwnProperty("width")) {
				bwOptions.width = size.width;
			}
			if (size.hasOwnProperty("height")) {
				bwOptions.height = size.height;
			}
		}

		let ret = alert.fireFrameless(
			swalOptions,
			bwOptions,
			true,
			false,
			sound
		);
		return ret;
	}

	fire(swalOptions, bwOptions, parent, alwaysOnTop, draggable, sound) {
		// Create a unique id
		let uid = this.uid,
			head = this.head;

		var bwOptionsBase = {
			width: 800,
			height: 600,
			resizable: false,
			minimizable: false,
			maximizable: false,
			fullscreen: false,
			fullscreenable: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: this.devTools === true ? true : false,
			},
		};

		var bwOptionsFinal = Object.assign(bwOptionsBase, bwOptions, {
			show: false,
		});

		// Force these settings
		if (parent !== undefined && parent !== null) {
			bwOptionsFinal["parent"] = parent;
			bwOptionsFinal["modal"] = true;
		}
		bwOptionsFinal.webPreferences.nodeIntegration = true;
		bwOptionsFinal.webPreferences.enableRemoteModule = true;
		bwOptionsFinal.skipTaskbar = true;

		if (alwaysOnTop === true) {
			bwOptionsFinal["alwaysOnTop"] = alwaysOnTop;
		}

		if (draggable === true) {
			swalOptions.customClass = Object.assign(
				swalOptions.customClass ? swalOptions.customClass : {},
				{
					closeButton: "no-drag",
					confirmButton: "no-drag",
					cancelButton: "no-drag",
					input: "no-drag",
				}
			);
		}

		this.browserWindow = new BrowserWindow(bwOptionsFinal);

		if (swalOptions.hasOwnProperty("singletonId")) {
			// Check if singletonId already exists in singletonIds
			if (singletonIds.hasOwnProperty(swalOptions.singletonId)) {
				singletonIds[swalOptions.singletonId].show();
				return new Promise((resolve, reject) => {
					resolve({ dismiss: DismissReason.showing });
				});
			} else {
				singletonIds[swalOptions.singletonId] = this.browserWindow;
			}
		}

		let positions = {
			top: "topCenter",
			"top-start": "topLeft",
			"top-end": "topRight",
			center: "center",
			"center-start": "leftCenter",
			"center-end": "rightCenter",
			bottom: "bottomCenter",
			"bottom-start": "bottomLeft",
			"bottom-end": "bottomRight",
		};

		if (swalOptions.position) {
			this.position = positions[swalOptions.position] || "center";
			delete swalOptions.position;
		}

		if (!(isMac && (parent !== undefined && parent !== null))) {
			new Positioner(this.browserWindow).move(this.position);
		}

		let html = String.raw`
    <html>
      <head>
		<script type="text/javascript"><@insert-swal-lib@></script>
		<style>.noselect{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;-webkit-app-region:no-drag}.no-drag{-webkit-app-region:no-drag}.border-radius-0{border-radius:0}</style>
        ${Array.isArray(head) ? head.join("\n") : ""}
      </head>
      <body draggable="false" class="noselect" ${
			draggable === true ? 'style="-webkit-app-region:drag"' : ""
		}></body>
      <script type="text/javascript">
      let _sound = ${JSON.stringify(sound)}
      let _config = ${JSON.stringify(swalOptions)}
		<@insert-renderer@>
		</script>
    </html>
    `;

		// Disable menu (and refresh shortcuts)
		this.browserWindow.setMenu(null);

		// Save html
		let filepath = tempWrite.sync(html, "swal.html");

		this.browserWindow.loadURL("file://" + filepath);

		if (isMac) {
			// Disable Window Refresh (Cmd+R)
			this.browserWindow.on("focus", (event) => {
				globalShortcut.registerAll(
					["CommandOrControl+R", "CommandOrControl+Shift+R"],
					() => {}
				);
			});

			this.browserWindow.on("blur", (event) => {
				globalShortcut.unregister("CommandOrControl+R");
				globalShortcut.unregister("CommandOrControl+Shift+R");
			});
		}

		this.browserWindow.once("ready-to-show", () => {
			if (!(isMac && (parent !== undefined && parent !== null))) {
				new Positioner(this.browserWindow).move(this.position);
			}
			this.browserWindow.show();
		});

		// For debugging only. Remove ASAP.
		ipcMain.on(uid + "log", (event, arg) => {
			console.log("from renderer: ", arg);
		});

		ipcMain.on(uid + "reposition", (event, arg) => {
			if (!(isMac && (parent !== undefined && parent !== null))) {
				new Positioner(this.browserWindow).move(this.position);
			}
		});

		// Callbacks

		ipcMain.once(uid + "onBeforeOpen", (event, arg) => {
			if (swalOptions.hasOwnProperty("onBeforeOpen")) {
				swalOptions.onBeforeOpen(arg);
			}
		});

		ipcMain.once(uid + "onAfterClose", (event, arg) => {
			if (this.browserWindow) {
				this.browserWindow.destroy();
			}
		});

		ipcMain.once(uid + "onOpen", (event, arg) => {
			this._isVisible = true;
			if (swalOptions.hasOwnProperty("onOpen")) {
				swalOptions.onOpen(arg);
			}
		});

		let onCloseSignalSent = false;
		ipcMain.once(uid + "onClose", (event, arg) => {
			this._isVisible = false;
			onCloseSignalSent = true;
			if (swalOptions.hasOwnProperty("onClose")) {
				swalOptions.onClose(arg);
			}
		});

		this.browserWindow.once("close", () => {
			if (!onCloseSignalSent) {
				if (swalOptions.hasOwnProperty("onClose")) {
					swalOptions.onClose({});
				}
			}
		});

		this.browserWindow.once("closed", () => {
			fs.unlink(filepath, (err) => {});

			if (!this.browserWindow.isDestroyed()) {
				this.browserWindow.destroy();
			}
			this.browserWindow = null;

			// Send signal that browserWindow is closed
			ipcMain.emit(uid + "return-promise", undefined, {
				dismiss: "close",
			});

			if (swalOptions.hasOwnProperty("onAfterClose")) {
				swalOptions.onAfterClose();
			}

			if (isMac) {
				// Disable Window Refresh (Cmd+R)
				globalShortcut.unregister("CommandOrControl+R");
				globalShortcut.unregister("CommandOrControl+Shift+R");
			}

			// Remove all listeners
			ipcMain.removeAllListeners([
				uid + "log",
				uid + "onBeforeOpen",
				uid + "onAfterClose",
				uid + "onOpen",
				uid + "onClose",
				uid + "reposition",
				uid + "return-promise",
				uid + "resizeToFit",
			]);

			if (swalOptions.hasOwnProperty("singletonId")) {
				delete singletonIds[swalOptions.singletonId];
			}
		});

		return new Promise((resolve, reject) => {
			ipcMain.once(uid + "return-promise", (event, arg) => {
				resolve(arg);
			});
		});
	}

	execJS(javascript, callback) {
		if (this.browserWindow === null) {
			return new Promise((resolve) => {
				resolve();
			});
		}

		return this.browserWindow.webContents.executeJavaScript(
			javascript,
			false,
			callback
		);
	}

	static uncaughtException(hideTrace, closure, alwaysOnTop, cleanStack) {
		return (error) => {
			let html = exceptionFormatter(
				cleanStack === true ? cleanStak(error.stack) : error,
				{
					format: "html",
					inlineStyle: true,
				}
			);

			let alert = new Alert([], false);

			let swalOptions = {
				type: "error",
			};

			if (hideTrace !== true) {
				swalOptions.html = `
				<div contenteditable="false" style="overflow:auto">
				${html}
				</div>
				`;
			} else {
				swalOptions.title = error.message;
			}

			if (closure) {
				swalOptions["onAfterClose"] = () => {
					closure(error);
				};
			}

			alert.fireWithFrame(swalOptions, undefined, undefined, alwaysOnTop);
		};
	}
};
