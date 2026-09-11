/**
 * Mindwave Slot Car Racing — Offline Web Audio API Sound Synth
 * Zero external audio files, 100% offline synthesizer
 */

class SoundSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Play crisp digital arcade beep on +1 Lap tap
  playLapPing(playerId = '1') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Distinct pitch per player
    const pitchMap = {
      '1': 880,  // A5 (Cyan high chime)
      '2': 1108.73, // C#6 (Pink punchy chime)
      '3': 1318.51, // E6
      '4': 1567.98  // G6
    };

    const freq = pitchMap[playerId] || 880;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Play race start signal beep
  playStartBeep() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 3 short low beeps followed by 1 high GO beep
    const times = [0, 0.25, 0.5];
    times.forEach((t) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now + t);

      gain.gain.setValueAtTime(0.15, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + t);
      osc.stop(now + t + 0.15);
    });

    // High GO tone
    const oscGo = this.ctx.createOscillator();
    const gainGo = this.ctx.createGain();
    oscGo.type = 'triangle';
    oscGo.frequency.setValueAtTime(880, now + 0.75);

    gainGo.gain.setValueAtTime(0.35, now + 0.75);
    gainGo.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    oscGo.connect(gainGo);
    gainGo.connect(this.ctx.destination);

    oscGo.start(now + 0.75);
    oscGo.stop(now + 1.1);
  }

  // Play undo action beep
  playUndoBeep() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Play triumphant victory fanfare melody when winner crosses line
  playVictoryFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Arpeggiated C Major Victory Chords (C5 - E5 - G5 - C6)
    const notes = [
      { f: 523.25, duration: 0.12, time: 0 },
      { f: 659.25, duration: 0.12, time: 0.12 },
      { f: 783.99, duration: 0.12, time: 0.24 },
      { f: 1046.50, duration: 0.6, time: 0.36 }
    ];

    notes.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.time);

      gain.gain.setValueAtTime(0.3, now + note.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.duration);
    });
  }
}

window.soundSynth = new SoundSynth();
