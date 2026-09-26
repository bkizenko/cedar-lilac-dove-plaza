export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  muted = false;
  unlocked = false;
  drones: OscillatorNode[] = [];
  mood: "peace" | "raid" | "pillage" = "peace";
  private scoreTimer: number | null = null;
  private scoreStart = 0;
  private lastBar = -1;
  private noise: AudioBuffer | null = null;
  private padOsc: OscillatorNode[] = [];
  private beat = 60 / 72;

  unlock() {
    if (this.unlocked) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx.gain.value = 0.45;
    this.music.gain.value = 0.2;
    this.master.gain.value = 0.5;
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise(this.ctx);
    void this.ctx.resume();
    this.unlocked = true;
    this.startScore();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.ctx?.state === "suspended") void this.ctx.resume();
    });
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.58, this.ctx.currentTime, 0.04);
    }
  }

  private makeNoise(ctx: AudioContext) {
    const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return n;
  }

  private lastSfx: Record<string, number> = {};
  private voices = 0;

  tone(freq: number, dur: number, type: OscillatorType = "triangle", vol = 0.08, detune = 0) {
    if (!this.ctx || !this.sfx || this.muted) return;
    if (this.voices > 10) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = type === "sawtooth" || type === "square" ? "triangle" : type;
    o.frequency.value = freq;
    o.detune.value = detune;
    f.type = "lowpass";
    f.frequency.value = 1400;
    const now = this.ctx.currentTime;
    const v = Math.max(0.0008, vol);
    g.gain.setValueAtTime(v, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    this.voices++;
    o.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      o.disconnect();
      g.disconnect();
      f.disconnect();
    };
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  play(name: string) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gap = name === "hit" || name === "chop" ? 0.18 : 0.04;
    if ((this.lastSfx[name] || 0) + gap > now) return;
    this.lastSfx[name] = now;
    const r = 0.94 + Math.random() * 0.12;
    switch (name) {
      case "click":
        this.tone(480 * r, 0.05, "sine", 0.02);
        break;
      case "place":
        this.tone(210, 0.12, "sine", 0.035);
        break;
      case "move":
        this.tone(180 * r, 0.04, "sine", 0.012);
        break;
      case "chop":
        this.tone(140 * r, 0.06, "triangle", 0.03);
        this.noiseBurst(0.04, 0.035, 900);
        break;
      case "hit":
        this.tone(96 * r, 0.07, "triangle", 0.035);
        this.noiseBurst(0.05, 0.04, 700);
        break;
      case "death":
        this.tone(82, 0.22, "sine", 0.04);
        this.tone(62, 0.3, "sine", 0.025);
        break;
      case "train":
        this.tone(392, 0.12, "sine", 0.03);
        this.tone(523, 0.16, "sine", 0.018);
        break;
      case "age":
        this.tone(196, 0.4, "sine", 0.04);
        this.tone(294, 0.5, "sine", 0.03);
        break;
      case "win":
        this.tone(262, 0.4, "sine", 0.045);
        this.tone(330, 0.55, "sine", 0.035);
        break;
      case "lose":
        this.tone(165, 0.5, "sine", 0.04);
        break;
      case "invalid":
        this.tone(150, 0.08, "sine", 0.02);
        break;
      case "horn":
        this.tone(174, 0.55, "sine", 0.07);
        this.tone(220, 0.7, "sine", 0.045);
        this.tone(130, 0.8, "sine", 0.03);
        break;
      case "bow":
        this.tone(620 * r, 0.05, "sine", 0.028);
        this.tone(180, 0.08, "triangle", 0.02);
        break;
      case "drop":
        this.tone(240 * r, 0.07, "sine", 0.022);
        this.noiseBurst(0.05, 0.02, 500);
        break;
      case "splash":
        this.noiseBurst(0.12, 0.045, 1600);
        this.tone(320 * r, 0.08, "sine", 0.015);
        break;
      case "hammer":
        this.tone(90 * r, 0.05, "triangle", 0.03);
        this.noiseBurst(0.04, 0.03, 800);
        break;
      case "pillage":
        this.tone(110, 0.18, "triangle", 0.05);
        this.tone(146, 0.28, "sine", 0.035);
        this.noiseBurst(0.1, 0.04, 400);
        break;
      case "fire":
        this.noiseBurst(0.28, 0.05, 1200);
        this.tone(70, 0.2, "sine", 0.02);
        break;
      case "birth":
        this.tone(440, 0.1, "sine", 0.025);
        this.tone(554, 0.14, "sine", 0.018);
        break;
      case "trade":
        this.tone(330, 0.1, "sine", 0.03);
        this.tone(392, 0.16, "sine", 0.022);
        break;
      case "thunder":
        this.noiseBurst(0.45, 0.08, 280);
        this.tone(48, 0.5, "sine", 0.04);
        break;
      default:
        break;
    }
  }

  private noiseBurst(dur: number, vol: number, cutoff: number) {
    if (!this.ctx || !this.sfx || !this.noise || this.muted) return;
    if (this.voices > 12) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    this.voices++;
    src.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
    };
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  /** D3 = 146.83 — Skyrim/Whiterun sitting in D minor. */
  private hz(semi: number) {
    return 146.83 * Math.pow(2, semi / 12);
  }

  /** Secunda-style piano: slow high sine, long tail. */
  private piano(time: number, semi: number, dur = 2.4, vol = 0.03) {
    if (!this.ctx || !this.music) return;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o2.type = "triangle";
    o.frequency.value = this.hz(semi + 12);
    o2.frequency.value = this.hz(semi + 24);
    o2.detune.value = 4;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    o2.connect(g);
    g.connect(this.music);
    o.start(time);
    o2.start(time);
    o.stop(time + dur + 0.05);
    o2.stop(time + dur + 0.05);
  }

  /** Lute / Whiterun mid: muted triangle, short. */
  private lute(time: number, semi: number, dur = 0.7, vol = 0.034) {
    if (!this.ctx || !this.music) return;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.value = this.hz(semi);
    f.type = "lowpass";
    f.frequency.setValueAtTime(1800, time);
    f.frequency.exponentialRampToValueAtTime(420, time + dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.music);
    o.start(time);
    o.stop(time + dur + 0.04);
  }

  /** 2CELLOS / Now We Are Free: singing cello. */
  private cello(time: number, semi: number, dur = 2.8, vol = 0.032) {
    if (!this.ctx || !this.music) return;
    const o = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o2.type = "sine";
    o.frequency.value = this.hz(semi);
    o2.frequency.value = this.hz(semi) * 2.005;
    f.type = "lowpass";
    f.frequency.setValueAtTime(520, time);
    f.frequency.linearRampToValueAtTime(380, time + dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.22);
    g.gain.linearRampToValueAtTime(vol * 0.72, time + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(this.music);
    o.start(time);
    o2.start(time);
    o.stop(time + dur + 0.05);
    o2.stop(time + dur + 0.05);
  }

  private strings(time: number, semi: number, dur = 4.2, vol = 0.018) {
    if (!this.ctx || !this.music) return;
    for (const s of [semi, semi + 7, semi + 12]) {
      const o = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o2.type = "triangle";
      o.frequency.value = this.hz(s);
      o2.frequency.value = this.hz(s) * 1.004;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(vol, time + 0.55);
      g.gain.linearRampToValueAtTime(vol * 0.7, time + dur * 0.75);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g);
      o2.connect(g);
      g.connect(this.music);
      o.start(time);
      o2.start(time);
      o.stop(time + dur + 0.05);
      o2.stop(time + dur + 0.05);
    }
  }

  private startPads() {
    if (!this.ctx || !this.music) return;
    const parts: { f: number; vol: number }[] = [
      { f: 73.42, vol: 0.04 },
      { f: 110.0, vol: 0.022 },
      { f: 146.83, vol: 0.01 },
    ];
    for (const p of parts) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const filt = this.ctx.createBiquadFilter();
      o.type = "sine";
      o.frequency.value = p.f;
      filt.type = "lowpass";
      filt.frequency.value = 480;
      g.gain.value = p.vol;
      o.connect(filt);
      filt.connect(g);
      g.connect(this.music);
      o.start();
      this.drones.push(o);
      this.padOsc.push(o);
    }
    if (this.noise) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 90;
      const g = this.ctx.createGain();
      g.gain.value = 0.008;
      src.connect(f);
      f.connect(g);
      g.connect(this.music);
      src.start();
    }
  }

  setMood(mood: "peace" | "raid" | "pillage") {
    if (this.mood === mood) return;
    this.mood = mood;
    if (!this.ctx || !this.music) return;
    const now = this.ctx.currentTime;
    const target = mood === "raid" ? 0.26 : mood === "pillage" ? 0.24 : 0.2;
    this.music.gain.setTargetAtTime(target, now, 0.2);
    const freqs = mood === "raid" ? [55, 82.4, 110] : mood === "pillage" ? [61.7, 92.5, 123.5] : [73.42, 110, 146.83];
    this.padOsc.forEach((o, i) => {
      try {
        o.frequency.setTargetAtTime(freqs[i] || freqs[0], now, 0.25);
      } catch {
        /* ignore */
      }
    });
    this.beat = mood === "raid" ? 60 / 96 : mood === "pillage" ? 60 / 88 : 60 / 72;
    this.lastBar = -1;
    this.scoreStart = now;
  }

  private drum(time: number, vol = 0.05) {
    if (!this.ctx || !this.music || !this.noise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(220, time);
    f.frequency.exponentialRampToValueAtTime(70, time + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0008, time + 0.22);
    src.connect(f);
    f.connect(g);
    g.connect(this.music);
    src.start(time);
    src.stop(time + 0.24);
  }

  /**
   * Peace: Whiterun/Secunda. Raid: war drums + low cello. Pillage: lute charge.
   */
  private scheduleBar(t0: number, beat: number, bar: number) {
    const mood = this.mood;
    if (mood === "raid") {
      this.strings(t0, bar % 2 === 0 ? 0 : -2, beat * 3.6, 0.016);
      this.cello(t0, -12, beat * 3.4, 0.03);
      this.drum(t0, 0.055);
      this.drum(t0 + beat * 2, 0.04);
      if (bar % 2 === 1) this.piano(t0 + beat * 0.5, 15, 1.6, 0.018);
      return;
    }
    if (mood === "pillage") {
      this.strings(t0, 2, beat * 3.8, 0.014);
      this.lute(t0, 7, 0.28, 0.04);
      this.lute(t0 + beat, 10, 0.26, 0.036);
      this.lute(t0 + beat * 2, 12, 0.28, 0.038);
      this.lute(t0 + beat * 3, 10, 0.24, 0.032);
      this.drum(t0 + beat * 1.5, 0.03);
      return;
    }
    const phrase = Math.floor(bar / 8) % 4;
    this.strings(t0, phrase % 2 === 0 ? 0 : -5, beat * 4.2, 0.012);
    if (bar % 4 === 0) this.cello(t0, phrase % 2 === 0 ? -12 : -7, beat * 3.8, 0.022);
    if (bar % 4 === 2) {
      const n = phrase === 1 ? 15 : phrase === 3 ? 19 : 12;
      this.piano(t0 + beat * 0.25, n, 3.2, 0.024);
    }
    if (phrase === 2 && bar % 8 === 4) this.piano(t0 + beat, 22, 3.6, 0.02);
  }

  startScore() {
    if (!this.ctx || !this.music) return;
    this.startPads();
    this.scoreStart = this.ctx.currentTime + 0.6;
    this.lastBar = -1;
    const tick = () => {
      if (!this.ctx || !this.unlocked) return;
      const beat = this.beat;
      const barLen = beat * 4;
      const now = this.ctx.currentTime;
      const bar = Math.floor((now - this.scoreStart + 0.45) / barLen);
      if (bar > this.lastBar && bar >= 0) {
        this.lastBar = bar;
        this.scheduleBar(this.scoreStart + bar * barLen, beat, bar);
      }
      this.scoreTimer = window.setTimeout(tick, 160);
    };
    tick();
  }

  dispose() {
    if (this.scoreTimer != null) window.clearTimeout(this.scoreTimer);
    this.scoreTimer = null;
    this.unlocked = false;
    for (const o of this.drones) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    this.drones = [];
    this.padOsc = [];
    void this.ctx?.close();
    this.ctx = null;
  }
}
