/**
 * Web Audio API Synthesizer for Mindwave Slot Car Racing
 */
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playBeep(freq = 440, type = 'sine', duration = 0.1, vol = 0.2) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  playLapPing(playerId) {
    if (playerId === '1') {
      this.playBeep(880, 'sine', 0.12, 0.25); // Higher pitch P1 (Cyan)
    } else if (playerId === '2') {
      this.playBeep(660, 'triangle', 0.12, 0.25); // P2 (Pink)
    } else {
      this.playBeep(750, 'sine', 0.12, 0.25);
    }
  }

  playBothLapsPing() {
    this.playBeep(880, 'sine', 0.12, 0.25);
    setTimeout(() => {
      this.playBeep(660, 'triangle', 0.12, 0.25);
    }, 60);
  }

  playStartBeep() {
    this.playBeep(440, 'sine', 0.15, 0.3);
    setTimeout(() => this.playBeep(440, 'sine', 0.15, 0.3), 300);
    setTimeout(() => this.playBeep(880, 'triangle', 0.35, 0.4), 600);
  }

  playVictoryFanfare() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playBeep(freq, 'square', 0.2, 0.15);
      }, idx * 120);
    });
  }
}

export const soundEngine = new SoundEngine();
