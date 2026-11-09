// Web Audio API Retro 8-bit Beeper Sound Engine

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Play a single retro square/pulse tone
  private playTone(freq: number, type: OscillatorType, duration: number, gainVal = 0.08, startTime = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + startTime);
      osc.stop(this.ctx.currentTime + startTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public btnA() {
    // Select / Move button
    this.playTone(880, 'square', 0.04, 0.06); // A5
  }

  public btnB() {
    // Confirm button
    this.playTone(660, 'square', 0.05, 0.06);
    this.playTone(990, 'square', 0.06, 0.07, 0.04);
  }

  public btnC() {
    // Cancel / Back button
    this.playTone(440, 'square', 0.06, 0.05);
  }

  public blip() {
    this.playTone(720, 'square', 0.03, 0.04);
  }

  public textBeep() {
    // Small speech typewriter click
    this.playTone(900 + Math.random() * 200, 'square', 0.02, 0.025);
  }

  public eat() {
    // Munch munch munch
    for (let i = 0; i < 3; i++) {
      this.playTone(320 + i * 80, 'triangle', 0.08, 0.1, i * 0.09);
      this.playTone(480, 'square', 0.04, 0.05, i * 0.09 + 0.04);
    }
  }

  public clean() {
    // Water flush / sweep
    for (let i = 0; i < 4; i++) {
      this.playTone(400 + i * 150, 'sine', 0.06, 0.08, i * 0.05);
    }
  }

  public happy() {
    // Happy fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'square', 0.1, 0.08, idx * 0.08);
    });
  }

  public sad() {
    const notes = [600, 520, 440, 350];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.12, 0.08, idx * 0.1);
    });
  }

  public sick() {
    // Alarm siren
    for (let i = 0; i < 3; i++) {
      this.playTone(880, 'sawtooth', 0.1, 0.08, i * 0.2);
      this.playTone(587, 'sawtooth', 0.1, 0.08, i * 0.2 + 0.1);
    }
  }

  public heal() {
    // Sparkle recover
    const notes = [440, 554, 659, 880, 1108];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.1, 0.07, idx * 0.06);
    });
  }

  public evolve() {
    // Ascending arpeggio celebration
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'square', 0.12, 0.08, idx * 0.07);
    });
  }

  public win() {
    const notes = [523, 659, 783, 1046];
    notes.forEach((n, i) => this.playTone(n, 'square', 0.1, 0.08, i * 0.07));
  }

  public miss() {
    this.playTone(300, 'square', 0.15, 0.08);
    this.playTone(220, 'square', 0.2, 0.08, 0.1);
  }

  public sleep() {
    // Lullaby
    const notes = [659, 587, 523, 440];
    notes.forEach((n, i) => this.playTone(n, 'sine', 0.2, 0.06, i * 0.15));
  }
}

export const sound = new SoundEngine();
