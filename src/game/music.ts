export type MusicStage = "village" | "adventure" | "battle";
export const TRACKS: Record<MusicStage, { title: string; file: string }> = {
  village: { title: "Folk Round", file: "/audio/folk-round.mp3" },
  adventure: { title: "Celtic Impulse", file: "/audio/celtic-impulse.mp3" },
  battle: { title: "Five Armies", file: "/audio/five-armies.mp3" },
};
/** Streamed acoustic/orchestral recordings. No oscillator-generated music. */
export class AcousticScore {
  stage: MusicStage = "village";
  volume = 0.2;
  calm = true;
  muted = false;
  error = "";
  private seasonMul = 1;
  private tracks = new Map<MusicStage, HTMLAudioElement>();
  private levels: Record<MusicStage, number> = { village: 0, adventure: 0, battle: 0 };
  private dwell = 0;
  private peacefulTime = 0;
  private paused = false;
  private disposed = false;
  unlock() {
    if (this.disposed) return;
    if (!this.tracks.size) {
      for (const stage of Object.keys(TRACKS) as MusicStage[]) {
        const a = new Audio(TRACKS[stage].file);
        a.loop = true;
        a.preload = "auto";
        a.volume = 0;
        a.addEventListener("error", () => {
          this.error = `Cannot load ${TRACKS[stage].title}`;
        });
        this.tracks.set(stage, a);
        void a.play().catch(this.playbackError);
      }
      document.addEventListener("visibilitychange", this.visibility);
    } else if (!this.paused && !document.hidden) {
      this.error = "";
      for (const a of this.tracks.values()) void a.play().catch(this.playbackError);
    }
  }
  private playbackError = (error: unknown) => {
    // Opening a paused menu can intentionally cancel a pending play().
    if (
      this.disposed ||
      this.paused ||
      document.hidden ||
      (error as { name?: string })?.name === "AbortError"
    )
      return;
    this.error = "Press M twice to enable music";
  };
  private visibility = () => {
    for (const a of this.tracks.values()) {
      if (document.hidden) a.pause();
      else if (!this.paused) void a.play().catch(this.playbackError);
    }
  };
  update(requested: MusicStage, dt: number, paused: boolean, seasonMul = 1) {
    if (!this.tracks.size || this.disposed) return;
    if (paused !== this.paused) {
      this.paused = paused;
      for (const a of this.tracks.values()) {
        if (paused) a.pause();
        else if (!document.hidden) void a.play().catch(this.playbackError);
      }
    }
    if (paused || document.hidden) return;
    this.dwell += dt;
    this.peacefulTime = requested === "battle" ? 0 : this.peacefulTime + dt;
    if (
      requested !== this.stage &&
      (requested === "battle" ||
        (this.dwell >= 20 && (this.stage !== "battle" || this.peacefulTime >= 20)))
    ) {
      this.stage = requested;
      this.dwell = 0;
      this.tracks.get(requested)!.currentTime = 0;
    }
    for (const stage of Object.keys(TRACKS) as MusicStage[]) {
      const target = stage === this.stage ? 1 : 0;
      this.levels[stage] +=
        Math.sign(target - this.levels[stage]) *
        Math.min(Math.abs(target - this.levels[stage]), dt / 4);
    }
    this.seasonMul = seasonMul;
    this.applyVolume();
  }
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }
  setMuted(v: boolean) {
    this.muted = v;
    if (!v) this.unlock();
    this.applyVolume();
  }
  private applyVolume() {
    for (const [s, a] of this.tracks)
      a.volume = this.muted ? 0 : this.volume * this.levels[s] * this.seasonMul;
  }
  dispose() {
    this.disposed = true;
    document.removeEventListener("visibilitychange", this.visibility);
    for (const a of this.tracks.values()) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    this.tracks.clear();
  }
}
