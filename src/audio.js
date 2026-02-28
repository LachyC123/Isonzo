let ctx = null;
let masterGain = null;

function getCtx() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.25;
        masterGain.connect(ctx.destination);
    }
    return ctx;
}

export function resumeAudio() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
}

function playTone(freq, duration, type = 'sine', volume = 0.3, delay = 0) {
    const c = getCtx();
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + duration);
}

function playNoise(duration, volume = 0.15, delay = 0) {
    const c = getCtx();
    const t = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    const filt = c.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 800;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(masterGain);
    src.start(t);
}

export function playHit() {
    playTone(200, 0.1, 'square', 0.2);
    playTone(150, 0.06, 'sawtooth', 0.1);
    playNoise(0.08, 0.12);
}

export function playHeavyHit() {
    playTone(100, 0.25, 'square', 0.3);
    playTone(60, 0.35, 'sine', 0.25);
    playNoise(0.18, 0.25);
    playTone(200, 0.08, 'sawtooth', 0.15);
}

export function playSlam() {
    playTone(50, 0.4, 'sine', 0.35);
    playTone(80, 0.3, 'square', 0.2);
    playNoise(0.25, 0.3);
    playTone(30, 0.5, 'sine', 0.2, 0.1);
}

export function playLaunch() {
    playTone(300, 0.15, 'sine', 0.15);
    playTone(500, 0.1, 'sine', 0.12, 0.05);
    playNoise(0.1, 0.1);
}

export function playBounce() {
    playTone(150, 0.08, 'sine', 0.12);
    playNoise(0.06, 0.08);
}

export function playDodge() {
    playTone(600, 0.08, 'sine', 0.08);
    playTone(900, 0.06, 'sine', 0.06, 0.04);
}

export function playGrab() {
    playTone(300, 0.15, 'sawtooth', 0.12);
    playTone(250, 0.1, 'square', 0.08, 0.05);
}

export function playBlock() {
    playTone(400, 0.06, 'triangle', 0.15);
    playTone(600, 0.04, 'triangle', 0.1, 0.03);
}

export function playKO() {
    playTone(200, 0.4, 'sine', 0.25);
    playTone(150, 0.5, 'sine', 0.2, 0.15);
    playTone(100, 0.6, 'sine', 0.15, 0.35);
}

export function playRingOut() {
    playTone(500, 0.15, 'sine', 0.2);
    playTone(350, 0.2, 'sine', 0.15, 0.1);
    playTone(150, 0.4, 'sine', 0.2, 0.2);
}

export function playPickup() {
    playTone(600, 0.08, 'sine', 0.12);
    playTone(800, 0.08, 'sine', 0.12, 0.07);
    playTone(1000, 0.12, 'sine', 0.1, 0.14);
}

export function playUIClick() {
    playTone(800, 0.04, 'sine', 0.08);
}

export function playCountdown() {
    playTone(440, 0.12, 'sine', 0.18);
}

export function playRoundStart() {
    playTone(440, 0.12, 'sine', 0.18);
    playTone(660, 0.12, 'sine', 0.18, 0.12);
    playTone(880, 0.25, 'sine', 0.22, 0.24);
}

export function playVictory() {
    playTone(523, 0.18, 'sine', 0.18);
    playTone(659, 0.18, 'sine', 0.18, 0.18);
    playTone(784, 0.3, 'sine', 0.2, 0.36);
    playTone(1047, 0.4, 'sine', 0.15, 0.56);
}

export function playDefeat() {
    playTone(400, 0.25, 'sine', 0.18);
    playTone(350, 0.25, 'sine', 0.15, 0.2);
    playTone(300, 0.4, 'sine', 0.12, 0.4);
}
