export type MusicStage = "village" | "adventure" | "battle";
export const TRACKS: Record<MusicStage, { title: string; file: string }> = {
  village: { title: "Meditation Impromptu 01", file: "/audio/meditation-impromptu-01.mp3" },
  adventure: { title: "Atlantean Twilight", file: "/audio/atlantean-twilight.mp3" },
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
  private rests = new Map<MusicStage, number>();
  private dwell = 0;
  private peacefulTime = 0;
  private disposed = false;
  unlock() {
    if (this.disposed) return;
    if (!this.tracks.size) {
      for (const stage of Object.keys(TRACKS) as MusicStage[]) {
        const a = new Audio(TRACKS[stage].file);
        a.loop = false;
        a.addEventListener("ended", () => {
          if(stage===this.stage)this.rests.set(stage, 20 + Math.random() * 20);
        });
        a.preload = stage===this.stage?"auto":"metadata";
        a.volume = 0;
        a.addEventListener("error", () => {
          this.error = `Cannot load ${TRACKS[stage].title}`;
        });
        this.tracks.set(stage, a);
      }
      document.addEventListener("visibilitychange", this.visibility);
    }
    this.error = "";
    if(!document.hidden&&!this.muted){this.rests.delete(this.stage);this.playCurrent();}
  }
  private playbackError = (error: unknown) => {
    // Opening a paused menu can intentionally cancel a pending play().
    if (
      this.disposed ||
      document.hidden ||
      (error as { name?: string })?.name === "AbortError"
    )
      return;
    this.error = "Music could not start. Choose Enable music below to retry.";
  };
  private visibility = () => {
    for (const [stage, a] of this.tracks) {
      if (document.hidden) a.pause();
      else if (stage===this.stage&&!this.muted&&!this.rests.has(stage)) this.playCurrent();
    }
  };
  update(requested: MusicStage, dt: number, _paused: boolean, seasonMul = 1) {
    if (!this.tracks.size || this.disposed) return;
    // Planning menus pause the simulation, not the calm soundtrack.
    if (document.hidden || this.muted) return;
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
      this.rests.delete(requested);this.playCurrent();
    }
    const rest = this.rests.get(this.stage);
    if (rest !== undefined) {
      if (rest > dt) this.rests.set(this.stage, rest - dt);
      else {
        this.rests.delete(this.stage);
        const track = this.tracks.get(this.stage)!;
        track.currentTime = 0;
        this.levels[this.stage] = 0;
        this.playCurrent();
      }
    }
    for (const stage of Object.keys(TRACKS) as MusicStage[]) {
      const target = stage === this.stage ? 1 : 0;
      this.levels[stage] +=
        Math.sign(target - this.levels[stage]) *
        Math.min(Math.abs(target - this.levels[stage]), dt / 6);
      if(stage!==this.stage&&this.levels[stage]<=0)this.tracks.get(stage)?.pause();
    }
    this.seasonMul = seasonMul;
    this.applyVolume();
  }
  private playCurrent(){
    const track=this.tracks.get(this.stage);if(!track)return;
    void track.play().then(()=>{this.error="";}).catch(this.playbackError);
  }
  get status(){const track=this.tracks.get(this.stage);return this.muted?"Muted":this.error?this.error:this.rests.has(this.stage)?"Quiet interval between pieces":!track||track.paused?"Ready — enable music":"Playing";}
  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }
  setMuted(v: boolean) {
    this.muted = v;
    if (!v) this.unlock();
    else for(const track of this.tracks.values())track.pause();
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
