"use strict";

const { ipcMain, globalShortcut, app, BrowserWindow } = require("electron");
const tempWrite = require("temp-write");
const cryptoRandomString = require("crypto-random-string");
const Positioner = require("electron-positioner");
const fs = require("fs");
const exceptionFormatter = require("exception-formatter");
const DismissReason = Object.freeze({
  cancel: "cancel",
  close: "close",
  esc: "esc",
  timer: "timer"
});

const isMac = process.platform === "darwin";

class Alert {
  constructor(head, devTools) {
    this.head = head;
    this.devTools = devTools;
    this.uid = cryptoRandomString({
      length: 10
    });
    this.browserWindow = null;
    this.position = "center";
    this._isVisible = false;
  }

  /**
   * An enum of possible reasons that can explain an alert dismissal.
   */
  static get DismissReason() {
    return DismissReason;
  }

  /**
   * Determine if a modal is shown.
   */
  isVisible() {
    return this._isVisible;
  }

  /**
   * Enable "Confirm" and "Cancel" buttons.
   */
  enableButtons() {
    this.execJS(`Swal.enableButtons()`);
  }

  /**
   * Disable "Confirm" and "Cancel" buttons.
   */
  disableButtons() {
    this.execJS(`Swal.disableButtons()`);
  }

  /**
   * Disable buttons and show loader. This is useful with AJAX requests.
   */
  showLoading() {
    this.execJS(`Swal.showLoading()`);
  }

  /**
   * Disable buttons and show loader. This is useful with AJAX requests.
   */
  enableLoading() {
    this.showLoading();
  }

  /**
   * Enable buttons and hide loader.
   */
  hideLoading() {
    this.execJS(`Swal.hideLoading()`);
  }

  /**
   * Enable buttons and hide loader.
   */
  disableLoading() {
    this.hideLoading();
  }

  /**
   * Determine if modal is in the loading state.
   *
   * @returns {Promise<boolean>} Promise which resolves with a boolean
   */
  isLoading() {
    return this.execJS(`Swal.isLoading()`);
  }

  /**
   * Click the "Confirm"-button programmatically.
   */
  clickConfirm() {
    this.execJS(`Swal.clickConfirm()`);
  }

  /**
   * Click the "Cancel"-button programmatically.
   */
  clickCancel() {
    this.execJS(`Swal.clickCancel()`);
  }

  /**
   * Show a validation message.
   *
   * @param {string} validationMessage The validation message.
   */
  showValidationMessage(validationMessage) {
    this.execJS(`Swal.showValidationMessage('${validationMessage}')`, () => {
      if (this.browserWindow) {
        this.browserWindow.webContents.send(`${this.uid}resizeToFit`, 25);
      }
    });
  }

  /**
   * Hide validation message.
   */
  resetValidationMessage() {
    this.execJS(`Swal.resetValidationMessage()`, () => {
      if (this.browserWindow) {
        this.browserWindow.webContents.send(`${this.uid}resizeToFit`, 25);
      }
    });
  }

  /**
   * Disable the modal input. A disabled input element is unusable and un-clickable.
   */
  disableInput() {
    this.execJS(`Swal.disableInput()`);
  }

  /**
   * Enable the modal input.
   */
  enableInput() {
    this.execJS(`Swal.enableInput()`);
  }

  /**
   * If `timer` property is is set/defined in swalOptions, returns number of milliseconds of timer remained.
   * Otherwise, returns undefined.
   *
   * @returns {Promise<number | undefined>} Promise which resolves with a number or undefined
   */
  getTimerLeft() {
    return this.execJS(`Swal.getTimerLeft()`);
  }

  /**
   * Stop timer. Returns number of milliseconds of timer remained.
   * If `timer` property isn't set in swalOptions, returns undefined.
   *
   * @returns {Promise<number | undefined>} Promise which resolves with a number or undefined
   */
  stopTimer() {
    return this.execJS(`Swal.stopTimer()`);
  }

  /**
   * Resume timer. Returns number of milliseconds of timer remained.
   * If `timer` property isn't set in swalOptions, returns undefined.
   *
   * @returns {Promise<number | undefined>} Promise which resolves with a number or undefined
   */
  resumeTimer() {
    return this.execJS(`Swal.resumeTimer()`);
  }

  /**
   * Toggle timer. Returns number of milliseconds of timer remained.
   * If `timer` property isn't set in swalOptions, returns undefined.
   *
   * @returns {Promise<number | undefined>} Promise which resolves with a number or undefined
   */
  toggleTimer() {
    return this.execJS(`Swal.toggleTimer()`);
  }

  /**
   * Check if timer is running. Returns true if timer is running,
   * and false is timer is paused / stopped.
   *
   * @returns {Promise<boolean | undefined>} Promise which resolves with a boolean or undefined
   */
  isTimerRunning() {
    return this.execJS(`Swal.isTimerRunning()`);
  }

  /**
   * Increase timer. Returns number of milliseconds of an updated timer.
   * If `timer` property isn't set in swalOptions, returns undefined.
   *
   * @param {number} n The number of milliseconds to add to the current timer
   *
   * @returns {Promise<number | undefined>} Promise which resolves with a number or undefined
   */
  increaseTimer(n) {
    return this.execJS(`Swal.increaseTimer(${n})`);
  }

  /**
   * Shows progress steps.
   */
  showProgressSteps() {
    this.execJS(`Swal.showProgressSteps()`);
  }

  /**
   * Hides progress steps.
   */
  hideProgressSteps() {
    this.execJS(`Swal.hideProgressSteps()`);
  }

  /**
   * Determine if a given parameter name is valid.
   *
   * @param paramName The parameter to check
   *
   * @returns {Promise<boolean | undefined>} Promise which resolves with a boolean or undefined
   */
  isValidParameter(paramName) {
    return this.execJS(`Swal.isValidParameter('${paramName}')`);
  }

  /**
   * Determines if a given parameter name is valid for Swal.update() method.
   *
   * @param paramName The parameter to check
   *
   * @returns {Promise<boolean | undefined>} Promise which resolves with a boolean or undefined
   */
  isUpdatableParameter(paramName) {
    return this.execJS(`isUpdatableParameter('${paramName}')`);
  }

  /**
   *
   * @param options Options object of type `SweetAlertOptions` or `ElectronAlertOptions`.
   *
   *   __Possible `options` for type `SweetAlertOptions`:__
   *     See TS definition file (Alert.d.ts) or the original [sweetAlert2](https://sweetalert2.github.io) docs for list of sweetAlert2 options;
   *
   *   __Possible `options` for type `ElectronAlertOptions`:__  {
   *   > `swalOptions`?: SweetAlertOptions,
   *     `bwOptions`?: BrowserWindowOptions,
   *     `title`?: string,
   *     `parent`?: boolean,
   *     `alwaysOnTop`?: boolean,
   *     `sound`?: object
   *
   *   };
   *
   * __Note:__
   * If `swalOptions` is defined in `options`, method will assume `options` (arg) to be of type `ElectronAlertOptions`; and if not defined, of type `SweetAlertOptions`.
   *
   * @returns {Promise<SweetAlertResult>} Promise which resolves with a value of type SweetAlertResult
   */
  fireFrameless(options = {}) {
    if (options.constructor !== Object)
      throw new Error(
        `${options} is not an object. Object of type ElectronAlertOptions or SweetAlertOptions expected as argument.`
      );

    let swalOptions = options.swalOptions
      ? options.swalOptions
      : {
          ...options
        };
    options = options.swalOptions ? options : {};
    let size = options.size;
    let bwOptions = {
      frame: false,
      transparent: true,
      thickFrame: false,
      closable: false,
      backgroundColor: "#00000000",
      hasShadow: false,
      ...options.bwOptions
    };

    swalOptions.backdrop = `rgba(0,0,0,0.0)`;
    swalOptions.allowOutsideClick = false;

    if (size) {
      if (size.hasOwnProperty("width")) {
        bwOptions.width = size.width;
      }
      if (size.hasOwnProperty("height")) {
        bwOptions.height = size.height;
      }
    }

    return this.fire({
      swalOptions: swalOptions,
      bwOptions: bwOptions,
      parent: options.parent,
      alwaysOnTop: options.alwaysOnTop,
      draggagle: options.draggable,
      sound: options.sound
    });
  }

  /**
   *
   * @param options Options object of type `SweetAlertOptions` or `ElectronAlertOptions`.
   *
   *   __Possible `options` for type `SweetAlertOptions`:__
   *     See TS definition file (Alert.d.ts) or the original [sweetAlert2](https://sweetalert2.github.io) docs for list of sweetAlert2 options;
   *
   *   __Possible `options` for type `ElectronAlertOptions`:__  {
   *   > `swalOptions`?: SweetAlertOptions,
   *     `bwOptions`?: BrowserWindowOptions,
   *     `title`?: string,
   *     `parent`?: boolean,
   *     `alwaysOnTop`?: boolean,
   *     `draggable`?: boolean,
   *     `sound`?: object
   *
   *   };
   *
   * __Note:__
   * If `swalOptions` is defined in `options`, method will assume `options` (arg) to be of type `ElectronAlertOptions`; and if not defined, of type `SweetAlertOptions`.
   *
   *
   * @returns {Promise<SweetAlertResult>} Promise which resolves with a value of type SweetAlertResult
   */
  fireWithFrame(options = {}) {
    if (options.constructor !== Object)
      throw new Error(
        `${options} is not an object. Object of type ElectronAlertOptions or SweetAlertOptions expected as argument.`
      );

    let swalOptions = options.swalOptions
      ? options.swalOptions
      : {
          ...options
        };
    options = options.swalOptions ? options : {};
    let title = options.title;
    let size = options.size;
    let bwOptions = {
      frame: true,
      transparent: false,
      thickFrame: true,
      closable: true,
      title: title ? title : app.getName(),
      ...options.bwOptions
    };

    swalOptions.allowOutsideClick = false;
    swalOptions.animation = false;

    if (size) {
      if (size.hasOwnProperty("width")) bwOptions.width = size.width;
      if (size.hasOwnProperty("height")) bwOptions.height = size.height;
    }

    swalOptions.customClass = Object.assign(
      swalOptions.customClass ? swalOptions.customClass : {},
      {
        popup: "border-radius-0"
      }
    );

    return this.fire({
      swalOptions: swalOptions,
      bwOptions: bwOptions,
      parent: options.parent,
      alwaysOnTop: options.alwaysOnTop,
      sound: options.sound
    });
  }

  /**
   *
   * @param options Options object of type `SweetAlertOptions` or `ElectronAlertOptions`.
   *
   *   __Possible `options` for type `SweetAlertOptions`:__
   *     See TS definition file (Alert.d.ts) or the original [sweetAlert2](https://sweetalert2.github.io) docs for list of sweetAlert2 options;
   *
   *   __Possible `options` for type `ElectronAlertOptions`:__  {
   *   > `swalOptions`?: SweetAlertOptions,
   *     `bwOptions`?: BrowserWindowOptions,
   *     `title`?: string,
   *     `parent`?: boolean,
   *     `alwaysOnTop`?: boolean,
   *     `draggable`?: boolean,
   *     `sound`?: object
   *
   *   };
   *
   * __Note:__
   * If `swalOptions` is defined in `options`, method will assume `options` (arg) to be of type `ElectronAlertOptions`; and if not defined, of type `SweetAlertOptions`.
   *
   * @returns {Promise<SweetAlertResult>} Promise which resolves with a value of type SweetAlertResult
   */
  static fireToast(options = {}) {
    if (options.constructor !== Object)
      throw new Error(
        `${options} is not an object. Object of type ElectronAlertOptions or SweetAlertOptions expected as argument.`
      );
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
    let swalOptions = options.swalOptions
      ? options.swalOptions
      : {
          ...options
        };

    options = options.swalOptions ? options : {};

    let sound = options.sound;
    let size = options.size;
    let alert = new this();

    swalOptions.toast = true;
    // swalOptions.onOpen = el => {
    //   alert.browserWindow.webContents.send(`${alert.uid}resizeToFit`, 25);
    // };

    let bwOptions = {};

    if (size) {
      if (size.hasOwnProperty("width")) {
        bwOptions.width = size.width;
      }
      if (size.hasOwnProperty("height")) {
        bwOptions.height = size.height;
      }
    }

    return alert.fireFrameless({
      swalOptions: swalOptions,
      bwOptions: bwOptions,
      parent: true,
      alwaysOnTop: false,
      sound: sound
    });
  }

  fire(options = {}) {
    if (options.constructor !== Object)
      throw new Error(
        `${options} is not an object. Object of type ElectronAlertOptions or SweetAlertOptions expected as argument.`
      );

    let swalOptions = options.swalOptions
      ? options.swalOptions
      : {
          ...options
        };

    options = options.swalOptions ? options : {};

    let bwOptions = options.bwOptions ? options.bwOptions : {};
    let parent = options.parent;
    let alwaysOnTop = options.alwaysOnTop;
    let draggable = options.draggable;
    let sound = options.sound;
    // Create a unique id
    let uid = this.uid,
      head = this.head;

    let bwOptionsBase = {
      width: 800,
      height: 600,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreen: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true,
        devTools: this.devTools === true ? true : false
      }
    };

    let bwOptionsFinal = Object.assign(bwOptionsBase, bwOptions, {
      show: false
    });

    // Force these settings
    if (parent !== undefined && parent !== null) {
      bwOptionsFinal.parent = parent;
      bwOptionsFinal.modal = true;
    }
    bwOptionsFinal.webPreferences.nodeIntegration = true;
    bwOptionsFinal.skipTaskbar = true;

    if (alwaysOnTop !== undefined) {
      bwOptionsFinal.alwaysOnTop = alwaysOnTop;
    }

    if (draggable === true) {
      swalOptions.customClass = Object.assign(
        swalOptions.customClass ? swalOptions.customClass : {},
        {
          closeButton: "no-drag",
          confirmButton: "no-drag",
          cancelButton: "no-drag",
          input: "no-drag"
        }
      );
    }

    this.browserWindow = new BrowserWindow(bwOptionsFinal);

    let positions = {
      top: "topCenter",
      "top-start": "topLeft",
      "top-end": "topRight",
      center: "center",
      "center-start": "leftCenter",
      "center-end": "rightCenter",
      bottom: "bottomCenter",
      "bottom-start": "bottomLeft",
      "bottom-end": "bottomRight"
    };

    if (swalOptions.position) {
      this.position = positions[swalOptions.position] || "center";
      delete swalOptions.position;
    }

    if (!(isMac && parent !== undefined && parent !== null)) {
      new Positioner(this.browserWindow).move(this.position);
    }

    let html = String.raw`
    <html>
      <head>
		<script type="text/javascript"><@insert-swal-lib@></script>
		<style>.noselect{-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;-webkit-app-region:no-drag}.no-drag{-webkit-app-region:no-drag}.border-radius-0{border-radius:0}</style>
        ${
          Array.isArray(head)
            ? head.join("\n")
            : typeof head === "string"
            ? head
            : null
        }
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
    this.browserWindow.removeMenu();

    // Save html
    let filepath = tempWrite.sync(html, "swal.html");

    this.browserWindow.loadURL("file://" + filepath);

    if (isMac) {
      // Disable Window Refresh (Cmd+R)
      this.browserWindow.on("focus", event => {
        globalShortcut.registerAll(
          ["CommandOrControl+R", "CommandOrControl+Shift+R"],
          () => {}
        );
      });

      this.browserWindow.on("blur", event => {
        globalShortcut.unregister("CommandOrControl+R");
        globalShortcut.unregister("CommandOrControl+Shift+R");
      });
    }

    this.browserWindow.once("ready-to-show", () => {
      if (!(isMac && parent !== undefined && parent !== null)) {
        new Positioner(this.browserWindow).move(this.position);
      }
      this.browserWindow.show();
    });

    // For debugging only. Remove ASAP.
    // ipcMain.on(uid + "log", (event, arg) => {
    // 	console.log("from renderer: ", arg);
    // });

    ipcMain.on(uid + "reposition", (event, arg) => {
      if (!(isMac && parent !== undefined && parent !== null)) {
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
      fs.unlink(filepath, err => {});

      if (!this.browserWindow.isDestroyed()) {
        this.browserWindow.destroy();
      }
      this.browserWindow = null;

      // Send signal that browserWindow is closed
      ipcMain.emit(uid + "return-promise", null, {
        dismiss: "close"
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
        uid + "resizeToFit"
      ]);
    });

    return new Promise((resolve, reject) => {
      ipcMain.once(uid + "return-promise", (event, arg) => {
        resolve(arg);
      });
    });
  }

  execJS(javascript, callback) {
    if (this.browserWindow === null) return new Promise(resolve => resolve());

    return this.browserWindow.webContents.executeJavaScript(
      javascript,
      false,
      callback
    );
  }

  /**
   *
   * @param { boolean } hideTrace
   * @param { function } closure
   * @param { boolean } alwaysOnTop
   */
  static uncaughtException(hideTrace, closure, alwaysOnTop) {
    return error => {
      let html = exceptionFormatter(error, {
        format: "html",
        inlineStyle: true
      });
      let alert = new Alert([], false);
      let swalOptions = { type: "error" };

      if (hideTrace !== true) {
        swalOptions.html = `
				  <div class='wrapper' style='overflow: auto'>
						${html.replace(/nowrap/g, "")}
					</div>
					<style>
						.wrapper > div {
							word-break: break-word;
						}
					</style>`;
      } else swalOptions.title = error.message;

      if (closure) swalOptions.onAfterClose = () => closure(error);

      alert.fireWithFrame({
        swalOptions,
        title: error.name,
        alwaysOnTop
      });
    };
  }
}

module.exports = Alert;
