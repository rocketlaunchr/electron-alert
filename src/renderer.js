// Copyright 2019-20 PJ Engineering and Business Solutions Pty. Ltd. All rights reserved.

const {
	ipcRenderer,
	remote
} = require("electron");
 
let sound = _sound;
let config = _config;
let win = remote.getCurrentWindow();
 
function playsound(type, freq, duration) {
	let std = {
		C: [16.35, 32.7, 65.41, 130.8, 261.6, 523.3, 1047, 2093, 4186],
		"C#": [17.32, 34.65, 69.3, 138.6, 277.2, 554.4, 1109, 2217, 4435],
		D: [18.35, 36.71, 73.42, 146.8, 293.7, 587.3, 1175, 2349, 4699],
		Eb: [19.45, 38.89, 77.78, 155.6, 311.1, 622.3, 1245, 2489, 4978],
		E: [20.6, 41.2, 82.41, 164.8, 329.6, 659.3, 1319, 2637, 5274],
		F: [21.83, 43.65, 87.31, 174.6, 349.2, 698.5, 1397, 2794, 5588],
		"F#": [23.12, 46.25, 92.5, 185.0, 370.0, 740.0, 1480, 2960, 5920],
		G: [24.5, 49.0, 98.0, 196.0, 392.0, 784.0, 1568, 3136, 6272],
		"G#": [25.96, 51.91, 103.8, 207.7, 415.3, 830.6, 1661, 3322, 6645],
		A: [27.5, 55.0, 110.0, 220.0, 440.0, 880.0, 1760, 3520, 7040],
		Bb: [29.14, 58.27, 116.5, 233.1, 466.2, 932.3, 1865, 3729, 7459],
		B: [30.87, 61.74, 123.5, 246.9, 493.9, 987.8, 1976, 3951, 7902]
	};
  
	if (isNaN(freq)) {
		// not a number
		regexStr = freq.match(/^(.+)([0-9])$/i);
		let note = regexStr[1].toUpperCase();
		let idx = regexStr[2];
		freq = std[note][idx]; 
	}
 
	var context = new AudioContext();
	var o = context.createOscillator();
	var g = context.createGain();
	o.type = type;
	o.connect(g);
	o.frequency.value = freq;
	g.connect(context.destination);
	o.start(0);
	g.gain.exponentialRampToValueAtTime(
		0.00001,
		context.currentTime + duration
	); 
}
 
// callbacks 
config.onBeforeOpen = modalElement => { 
	ipcRenderer.send("${uid}onBeforeOpen");
	ipcRenderer.on("${uid}showLoading", () => Swal.showLoading());

	if (sound !== undefined) {
		playsound(sound.type, sound.freq, sound.duration);
	}
};

config.onAfterClose = () => {
	ipcRenderer.send("${uid}onAfterClose");
};

config.onOpen = modalElement => {
	let titlebarHeight = win.getSize()[1] - win.getContentSize()[1];
	modalElement.parentNode.style.padding = "0px 0px 0px 0px";
	window.resizeTo(
		modalElement.scrollWidth,
		modalElement.scrollHeight + titlebarHeight + 1
	);

	ipcRenderer.send("${uid}reposition");
	window.setTimeout(() => {
		ipcRenderer.send("${uid}reposition");
	}, 25);

	ipcRenderer.send("${uid}onOpen");

	ipcRenderer.on("${uid}resizeToFit", delay => {
		if (delay !== undefined) {
			window.setTimeout(() => {
				window.resizeTo(
					modalElement.scrollWidth,
					modalElement.scrollHeight + titlebarHeight + 1
				);
			}, delay);
		} else {
			window.resizeTo(
				modalElement.scrollWidth,
				modalElement.scrollHeight + titlebarHeight + 1
			);
		}
	});

	ipcRenderer.on("${uid}hideLoading", () => Swal.hideLoading());
};

config.onClose = modalElement => {
	ipcRenderer.send("${uid}onClose");
};

let ret = Swal.fire(config);
ret.then(function (result) {
	ipcRenderer.send("${uid}return-promise", result);
});