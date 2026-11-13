import { peacefulMusic, AcousticScore } from "./music";
import { ProceduralAudio, proceduralMusicOn, type WorldAudio } from "./proceduralAudio";
import { LEGACY_SFX, BUS_OFF_KEY, busGain, busOff, loadSettings, saveSettings, type AudioSettings, type Bus, type SubBus } from "../scene/audioMix";
export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  muted = false;
  unlocked = false;
  score = new AcousticScore();
  /** Procedural score, environment and spatial SFX (asset-free); replaces the recorded score while active. */
  proc = new ProceduralAudio();
  seed = 1;
  settings: AudioSettings = loadSettings(typeof localStorage === "undefined" ? null : localStorage);
  private noise: AudioBuffer | null = null;
  unlock() {
    if (this.unlocked) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      this.score.unlock();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    this.proc.attach(this.ctx, this.master, this.seed);
    this.applySettings();
    this.score.unlock();
  }

  /** Shared settings reach both the recorded score and procedural/fallback audio.
   * The context master stays at its calibrated gain: procedural busGain already
   * includes the user's master slider, so applying it here again would apply the slider twice. */
  private applySettings() {
    this.muted = this.settings.muted;
    this.score.setVolume(busGain(this.settings, 'music'));
    this.score.setAmbience(busGain(this.settings, 'ambience'));
    this.score.setUserPaused(this.settings.musicPaused);
    this.score.setMuted(busOff(this.settings, 'music') || (this.proc.active && proceduralMusicOn()));
    this.proc.setSettings(this.settings);
    if (this.ctx) {
      this.master?.gain.setTargetAtTime(this.muted ? 0 : .5, this.ctx.currentTime, .04);
      this.sfx?.gain.setTargetAtTime(.45 * busGain(this.settings, 'sfx'), this.ctx.currentTime, .025);
      this.music?.gain.setTargetAtTime(.2 * busGain(this.settings, 'music'), this.ctx.currentTime, .025);
    }
  }
  setMuted(m: boolean) {
    this.settings = { ...this.settings, muted: m };
    saveSettings(typeof localStorage === "undefined" ? null : localStorage, this.settings);
    this.applySettings();
  }

  /** Sound effects are silent while everything is muted or the effects switch is off (one-shots are skipped, not just turned down). */
  get sfxOff() { return busOff(this.settings, "sfx"); }
  /** Per-bus on/off, independent of the other buses and of the master mute. Persisted with the volumes. */
  setBusOff(bus: SubBus, off: boolean) {
    if (!(bus in BUS_OFF_KEY)) return;
    this.settings = { ...this.settings, [BUS_OFF_KEY[bus]]: !!off };
    saveSettings(typeof localStorage === "undefined" ? null : localStorage, this.settings);
    this.applySettings();
  }
  toggleBusOff(bus: SubBus) { this.setBusOff(bus, !this.settings[BUS_OFF_KEY[bus]]); }
  setSfxOff(off: boolean) { this.setBusOff("sfx", off); }
  toggleSfxOff() { this.toggleBusOff("sfx"); }

  private makeNoise(ctx: AudioContext) {
    const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return n;
  }

  private lastSfx: Record<string, number> = {};
  private voices = 0;

  tone(freq: number, dur: number, type: OscillatorType = "triangle", vol = 0.08, detune = 0) {
    if (!this.ctx || !this.sfx || this.sfxOff) return;
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
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(v, now + Math.min(.012,dur*.2));
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
    if (!this.ctx || this.sfxOff) return;
    if (this.proc.active) {
      const kind = LEGACY_SFX[name];
      if (kind !== undefined) {
        // positional work sounds come from the world probe; only whole-village cues route here
        if (kind === "horn" || kind === "thunder" || kind === "splash" || kind === "click") this.proc.playSfx(kind);
        return;
      }
    }
    const now = this.ctx.currentTime;
    const gap = name === "fish" || name === "rustle" ? 2.5 : name === "chop" || name === "hammer" ? .6 : name === "drop" ? .8 : name === "hit" ? .18 : .04;
    if (this.lastSfx[name] !== undefined && this.lastSfx[name] + gap > now) return;
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
      case "rustle":
        this.noiseBurst(.16, .009, 400);
        break;
      case "fish":
        this.noiseBurst(.28, .018, 650);
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
    if (!this.ctx || !this.sfx || !this.noise || this.sfxOff) return;
    if (this.voices > 12) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(.02,dur*.25));
    g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    this.voices++;
    src.onended = () => {
      this.voices = Math.max(0, this.voices - 1);
      src.disconnect();f.disconnect();g.disconnect();
    };
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  setMood(
    mood: "peace" | "raid" | "pillage",
    age = 0,
    population = 0,
    dt = 0,
    paused = false,
    season = "Spring",
  ) {
    if (this.proc.active && proceduralMusicOn()) return;
    const battle = mood !== "peace";
    const stage = battle ? "battle" : peacefulMusic(age,season,this.score.calm);
    const duck = (season === "Winter" ? 0.5 : season === "Autumn" ? 0.62 : 0.7) * (population > 30 || age > 3 ? 0.9 : 1);
    this.score.update(stage, dt, paused, duck);
  }
  /** Per-frame world feed for the procedural mix (the caller throttles the probe). */
  updateWorld(dt: number, world: WorldAudio) {
    this.proc.update(dt, world);
  }
  setVolume(bus: Bus, v: number) {
    if (bus === "master" || bus === "music" || bus === "sfx" || bus === "ambience") {
      if (!Number.isFinite(v)) return;
      this.settings = { ...this.settings, [bus]: Math.max(0, Math.min(1, v)) };
      saveSettings(typeof localStorage === "undefined" ? null : localStorage, this.settings);
      this.applySettings();
    }
  }
  /** Player pause/play for the music only; nature ambience and effects keep playing. */
  setMusicPaused(p: boolean) {
    this.settings = { ...this.settings, musicPaused: p };
    saveSettings(typeof localStorage === "undefined" ? null : localStorage, this.settings);
    this.applySettings();
  }
  toggleMusicPaused() { this.setMusicPaused(!this.settings.musicPaused); }
  skipTrack() {
    if (this.settings.musicPaused) this.setMusicPaused(false);
    this.score.skip();
  }
  setMusicVolume(v: number) {
    this.setVolume("music", v);
  }
  setSfxVolume(v: number) {
    this.setVolume("sfx", v);
  }
  dispose() {
    this.score.dispose();
    this.proc.dispose();
    this.unlocked = false;
    void this.ctx?.close();
    this.ctx = null;
  }
}
