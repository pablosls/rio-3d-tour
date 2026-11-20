/**
 * Procedural Web Audio API Rio Coastal Soundscape
 * (Gentle Atlantic surf waves + warm Bossa-inspired major-7th harmonic breeze)
 */
export function createAmbientAudio() {
  let ctx = null;
  let masterGain = null;
  let isPlaying = false;
  let chordInterval = null;

  const init = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    masterGain.connect(ctx.destination);

    // 1. Ocean surf generator (filtered pink-ish noise modulated by slow wave LFO)
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const surfFilter = ctx.createBiquadFilter();
    surfFilter.type = 'lowpass';
    surfFilter.frequency.value = 340;

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.14; // ~7-second gentle Atlantic wave rhythm
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 210;
    lfo.connect(lfoGain);
    lfoGain.connect(surfFilter.frequency);
    lfo.start();

    const surfGain = ctx.createGain();
    surfGain.gain.value = 0.36;

    noiseSrc.connect(surfFilter);
    surfFilter.connect(surfGain);
    surfGain.connect(masterGain);
    noiseSrc.start();

    // 2. Soft Bossa-inspired warm ambient pad progression (Fmaj7 -> G6 -> Em7 -> Am9)
    const chords = [
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 329.63], // G6
      [164.81, 196.0, 246.94, 293.66], // Em7
      [220.0, 261.63, 329.63, 392.0], // Am7
    ];
    let chordIdx = 0;

    const playChord = () => {
      if (!ctx || !isPlaying) return;
      const now = ctx.currentTime;
      const freqs = chords[chordIdx % chords.length];
      chordIdx++;

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.022, now + 1.4 + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 6.4);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now + i * 0.18);
        osc.stop(now + 6.6);
      });
    };

    chordInterval = setInterval(playChord, 6200);
    setTimeout(playChord, 250);
  };

  const toggle = async () => {
    if (!ctx) init();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    if (!isPlaying) {
      isPlaying = true;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(0.55, now, 0.5);
    } else {
      isPlaying = false;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(0.0001, now, 0.35);
    }
    return isPlaying;
  };

  const destroy = () => {
    if (chordInterval) clearInterval(chordInterval);
    if (ctx) ctx.close();
  };

  return { toggle, isPlaying: () => isPlaying, destroy };
}
