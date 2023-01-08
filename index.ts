/// <reference types="webrtc" />
/// <reference types="dom-screen-wake-lock" />

const div = document.getElementById('out')!;
const values = document.getElementById('values')!;
const sensitivityKnob = document.getElementById('sensitivity') as HTMLInputElement;
const volumeKnob = document.getElementById('volume') as HTMLInputElement;

function readKnobs() {
  volume = Number(volumeKnob.value) / 100;
  threshold = 4 * (2 ** (Number(sensitivityKnob.value) / 100 * 12));
  console.log(`knobs: ${volume} ${threshold}`);
}

if ('wakeLock' in navigator) {
  navigator.wakeLock.request('screen');
}

let volume = 0;
let threshold = 1024;
sensitivityKnob.addEventListener('change', readKnobs);
volumeKnob.addEventListener('change', readKnobs);
readKnobs();

function callback(stream: MediaStream) {
  const ctx = new AudioContext();
  const mic = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const frequency = analyser.frequencyBinCount / 24 * ctx.sampleRate / analyser.fftSize;
  osc.frequency.value = frequency;

  let timer = 0;
  const vol = ctx.createGain();
  vol.connect(ctx.destination);
  vol.gain.value = 0;

  mic.connect(analyser); 
  osc.connect(vol);
  osc.start(0);

  const data = new Uint8Array(analyser.frequencyBinCount);
  let level = 0;
  let visualLevel = 0;

  function play() {
    console.log('play');
    timer++;
    analyser.getByteFrequencyData(data);
    
    // get fullest bin
    let sum = 0;
    for (let j = 0; j < analyser.frequencyBinCount; j++) {
      sum += data[j];
    }
    level = Math.max(sum, level * 0.97);
    const emaMult = sum > visualLevel ? 0.05 : 0.02;
    visualLevel = visualLevel * (1 - emaMult) + sum * emaMult;
    //Math.max(sum, visualLevel * 0.92);
    const deg = Math.max(0, (3 * threshold - visualLevel) / (3 * threshold) * 120);
    const color = `hsl(${deg}deg 100% 50%)`;
    div.style.background = color;
    //values.textContent = `${level} ${color}`;

    if (level > threshold) {
      vol.gain.value = (timer / 30) & 1 ? 0 : volume;
    } else {
      vol.gain.value = timer = 0;
    }
    // (Math.log(level) / Math.log(1.5)) & 1 : 0; // level > 1000 ?  : 0;

    requestAnimationFrame(play);
  }

  play();
}

navigator.getUserMedia({ video : false, audio : true }, callback, console.log);
