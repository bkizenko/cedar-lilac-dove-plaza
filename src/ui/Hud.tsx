import { VisitingTrader } from "./VisitingTrader";
import { reportedQuote, tradeCarrier } from "@/game/barter";
import { useEffect, useState, type ReactNode } from "react";
import {
  Pause,
  Play,
  FastForward,
  Volume2,
  VolumeX,
  RotateCcw,
  Home,
  Wheat,
  TreePine,
  Mountain,
  Users,
  Sword,
  Hammer,
  Warehouse,
  Shield,
  Landmark,
  GraduationCap,
  Castle,
  Church,
  Store,
  Pickaxe,
  Axe,
  Eye,
  PawPrint,
  Sun,
  Hand,
  Swords,
  Recycle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  Fish,
  Coins,
} from "lucide-react";
import type { Engine } from "@/game/engine";
import type { HudSnapshot, ResKind, TradeDeal } from "@/game/types";
import { AGES, BUILDINGS, BUILD_ORDER, MAP, UNITS } from "@/game/constants";
import { YEAR_SECONDS } from "@/game/settlement";

const BLD_ICON: Record<string, ReactNode> = {
  hut: <Home className="size-4" />,
  farm: <Wheat className="size-4" />,
  lumber: <Axe className="size-4" />,
  quarry: <Pickaxe className="size-4" />,
  dock: <Fish className="size-4" />,
  warehouse: <Warehouse className="size-4" />,
  barracks: <Shield className="size-4" />,
  forge: <Hammer className="size-4" />,
  watchtower: <Eye className="size-4" />,
  temple: <Church className="size-4" />,
  market: <Store className="size-4" />,
  keep: <Castle className="size-4" />,
  stables: <PawPrint className="size-4" />,
  university: <GraduationCap className="size-4" />,
};

function resWord(k: ResKind) {
  if (k === "food") return "berries";
  if (k === "wood") return "logs";
  if (k === "copper") return "copper";
  if (k === "iron") return "iron";
  return "stone";
}

export function Hud({ hud, engine }: { hud: HudSnapshot; engine: Engine | null }) {
  const compact = () => typeof window !== "undefined" && window.innerWidth <= 720;
  const [selMin, setSelMin] = useState(compact);
  const [clockMin, setClockMin] = useState(compact);
  const [resMin, setResMin] = useState(compact);
  const [buildMin, setBuildMin] = useState(compact);
  const [mapMin, setMapMin] = useState(compact);
  const [techOpen, setTechOpen] = useState(false);
  useEffect(() => {
    if (hud.selection.kind !== "none") setSelMin(false);
  }, [hud.selection.kind, hud.selection.name]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const fit = () => {
      if (media.matches) {
        setClockMin(true);
        setResMin(true);
        setBuildMin(true);
        setMapMin(true);
        setSelMin(true);
      }
    };
    media.addEventListener("change", fit);
    return () => media.removeEventListener("change", fit);
  }, []);
  if (!hud.started || hud.awaitingStart) return null;
  const sel = hud.selection;
  const hpPct = sel.maxHp > 0 ? Math.round((100 * sel.hp) / sel.maxHp) : 0;
  const weatherBits = hud.weather.split(" · ");
  const weatherName = weatherBits[0] || hud.weather;
  const weatherTemp = weatherBits[1] || "";
  const showJobs = !selMin && hud.workerSelected > 0;
  const showFight = !selMin && (hud.militarySelected > 0 || hud.workerSelected > 0);
  const speed = hud.speed >= 3 ? 4 : hud.speed === 2 ? 2 : 1;
  const founding = hud.founding;
  const rate = hud.port ? 3 : 4;
  const stocks = (
    [
      ["food", hud.food],
      ["wood", hud.wood],
      ["stone", hud.stone],
    ] as const
  ).slice();
  const rich = stocks.filter(([, n]) => n >= rate).sort((a, b) => b[1] - a[1])[0];
  const poor = rich
    ? stocks.filter(([k]) => k !== rich[0]).sort((a, b) => a[1] - b[1])[0]
    : null;
  const bank = rich && poor ? { give: rich[0], get: poor[0] } : null;

  return (
    <div className="hud-shell font-sans text-parchment">
      <div className="hud-res">
        <div className="hud-panel rounded-xl px-3 py-2.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-display text-sm text-bronze-bright">Stores</div>
            <MinToggle open={!resMin} onClick={() => setResMin((v) => !v)} />
          </div>
          {resMin ? (
            <div className="mt-1 flex w-full items-center gap-2 text-[11px] text-parchment-dim">
              <span className="tabular text-parchment">{hud.food}</span>
              <span className="tabular">{hud.wood}</span>
              <span className="tabular">{hud.stone}</span>
              {hud.age >= 1 ? <span className="tabular text-dawn">{hud.copper}</span> : null}
              {hud.age >= 2 ? <span className="tabular">{hud.iron}</span> : null}
              <span className="ml-auto tabular text-dawn">
                {founding ? hud.pop : `${hud.pop}/${hud.popCap}`}
              </span>
            </div>
          ) : (
            <>
              <ResRow
                icon={<Wheat className="size-3.5 text-blood" />}
                label="Berries"
                value={hud.food}
              />
              <ResRow
                icon={<TreePine className="size-3.5 text-ok" />}
                label="Logs"
                value={hud.wood}
              />
              <ResRow
                icon={<Mountain className="size-3.5 text-parchment-dim" />}
                label="Stone"
                value={hud.stone}
              />
              {hud.age >= 1 ? (
                <ResRow
                  icon={<Coins className="size-3.5 text-bronze" />}
                  label="Copper · blades"
                  value={hud.copper}
                />
              ) : null}
              {hud.age >= 2 ? (
                <ResRow
                  icon={<Mountain className="size-3.5 text-parchment" />}
                  label="Iron"
                  value={hud.iron}
                />
              ) : null}
              <div className="flex w-full items-center gap-2 text-sm leading-7">
                <Users className="size-3.5 text-dawn" />
                <span className="flex-1 text-left text-parchment-dim text-[13px]">People</span>
                <span className="tabular min-w-10 text-right text-parchment">
                  {founding ? hud.pop : `${hud.pop}/${hud.popCap}`}
                </span>
              </div>
              {bank && !founding ? (
                <div className="mt-1.5">
                  <BankBtn give={bank.give} get={bank.get} hud={hud} engine={engine} />
                </div>
              ) : null}
            </>
          )}
        </div>
        {!resMin && !founding ? (
          <div className="hud-panel rounded-xl px-3 py-2 flex items-start gap-2">
            <Hammer className="size-3.5 mt-0.5 text-bronze shrink-0" />
            <div className="min-w-0">
              <p className="text-xs leading-snug text-parchment-dim">{hud.objective}</p>
              <p className="mt-0.5 text-[10px] text-parchment-dim/80">
                Food storage {hud.food}/{hud.stockCap}
              </p>
            </div>
          </div>
        ) : null}
        {hud.event ? (
          <div className="hud-panel rounded-xl px-3 py-1.5 text-[11px] text-bronze-bright">
            {hud.event}
          </div>
        ) : null}
      </div>

      <div className="hud-clock">
        {founding ? null : (
        <div className="hud-panel flex flex-wrap gap-2 rounded-xl p-2 text-xs">
          <button
            className="px-2 py-2"
            onClick={() => {
              if (engine) {
                engine.keyboard.help = true;
                engine.pushHud();
              }
            }}
          >
            Controls & music · H
          </button>
          <button
            className="px-2 py-2"
            onClick={() => {
              if (engine) {
                engine.keyboard.ledger = true;
                engine.pushHud();
              }
            }}
          >
            Village · L
          </button>
            <button type="button" aria-pressed={!!engine?.loggingMode}
              className="text-[11px] text-parchment hover:text-bronze-bright"
              onClick={() => engine?.toggleLogging()}>
              {engine?.loggingMode ? "Finish tree marks · N" : "Mark trees · N"}
            </button>
          <button className="px-2 py-2" onClick={() => engine?.focusHome()}>
            Focus village · F
          </button>
          <button className="px-2 py-2" onClick={() => engine?.saveNow()}>
            Save
          </button>
          <button className="px-2 py-2" onClick={()=>engine?.protectVillage()} title="Save a separate backup that automatic saves cannot overwrite">Save backup copy</button>
          <button className="px-2 py-2" onClick={()=>engine?.resumeSaved(true)} title="Return to the backup copy you saved">Load backup copy</button>
          <button className="px-2 py-2" onClick={()=>engine?.exportVillage()}>Download village</button>
          <label className="px-2 py-2">Import backup<input className="sr-only" aria-label="Import village backup" type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void engine?.importVillage(file);e.target.value="";}}/></label>
          <button className="px-2 py-2" onClick={()=>{engine?.game.soundRecall();engine?.pushHud();}}>Recall horn · V</button>
          <button className="px-2 py-2" onClick={() => engine?.resumeSaved()}>
            Load
          </button>
        </div>
        )}
        <div className="hud-panel rounded-xl px-3 py-2 text-right">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-end gap-1.5">
                <Sun className="size-3.5 text-bronze-bright" />
                <div className="font-display text-lg leading-none tracking-wide text-bronze-bright">
                  {hud.period}
                </div>
              </div>
              <div className="mt-1 text-xs text-parchment-dim tabular">
                {hud.clock}{" "}
                <span className="text-parchment-dim/70">
                  (Year {Math.floor(hud.time / YEAR_SECONDS) + 1})
                </span>
                {speed > 1 ? <span className="ml-1 text-bronze-bright">{speed}×</span> : null}
              </div>
              {!clockMin ? (
                <>
                  <div className="mt-0.5 font-display text-sm text-bronze">{hud.season}</div>
                  <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px] text-parchment-dim/85">
                    <span className="tabular">{weatherTemp}</span>
                    <span>{weatherName}</span>
                  </div>
                  <div className="mt-2 font-display text-sm text-bronze">{hud.ages[hud.age]}</div>
                </>
              ) : (
                <div className="mt-0.5 text-[11px] text-bronze">{hud.season}</div>
              )}
            </div>
            <MinToggle open={!clockMin} onClick={() => setClockMin((v) => !v)} />
          </div>
          <div className="mt-2 flex justify-end gap-1">
            <IconBtn
              active={hud.paused}
              title="Pause"
              onClick={() => engine?.setPaused(!hud.paused)}
            >
              <Pause className="size-3.5" />
            </IconBtn>
            <IconBtn
              active={!hud.paused && speed === 1}
              title="1×"
              onClick={() => engine?.setSpeed(1)}
            >
              <Play className="size-3.5" />
            </IconBtn>
            <IconBtn
              active={!hud.paused && speed === 2}
              title="2× — the day runs twice as fast"
              onClick={() => engine?.setSpeed(2)}
            >
              <FastForward className="size-3.5" />
            </IconBtn>
            <IconBtn
              active={!hud.paused && speed === 4}
              title="4× — skip through the day"
              onClick={() => engine?.setSpeed(4)}
            >
              <span className="text-[10px] font-semibold">4×</span>
            </IconBtn>
            {!clockMin ? (
              <>
                <IconBtn title={hud.muted ? "Unmute" : "Mute"} onClick={() => engine?.toggleMute()}>
                  {hud.muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </IconBtn>
                <IconBtn title="Restart" onClick={() => engine?.restart()}>
                  <RotateCcw className="size-3.5" />
                </IconBtn>
              </>
            ) : null}
          </div>
        </div>
        {!clockMin && !founding ? (
          <>
            {hud.canAge && hud.nextAge ? (
              <button
                type="button"
                disabled={hud.paused || !!hud.ended}
                onClick={() => engine?.ageUp()}
                className="hud-panel w-full rounded-xl px-3 py-2 text-xs font-medium text-bronze-bright hover:bg-ink-soft disabled:opacity-40"
              >
                Advance to {hud.nextAge}
                {hud.ageCost ? (
                  <span className="mt-0.5 block text-[10px] font-normal text-parchment">
                    {hud.ageCost.food ?? 0} food · {hud.ageCost.wood ?? 0} logs · {hud.ageCost.stone ?? 0}{" "}
                    stone
                    {hud.ageCost.pop ? ` · ${hud.ageCost.pop} people` : ""}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTechOpen((v) => !v)}
              className="hud-panel w-full rounded-xl px-3 py-1.5 text-[11px] text-parchment hover:bg-ink-soft"
            >
              {techOpen ? "Hide the ages" : `${AGES[hud.age]} Age · what you can raise`}
            </button>
          </>
        ) : null}
      </div>

      <div className="hud-banner">
        {hud.placing ? (
          <div className="hud-toast">
            {founding
              ? hud.banner || "Click beside a clump of berries or timber."
              : hud.placing === "cornerstone"
                ? "A cornerstone needs a distant clump — berries, timber, stone, or ore."
                : `Click open grass to raise a ${BUILDINGS[hud.placing].name}.`}
          </div>
        ) : hud.banner ? (
          <div className="hud-toast">{hud.banner}</div>
        ) : null}
      </div>

      {hud.paused && !hud.ended && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="font-display text-2xl tracking-[0.4em] text-bronze-bright">PAUSED</div>
        </div>
      )}

      {hud.pendingAge ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-ink/55 px-4">
          <div className="hud-panel w-full max-w-md rounded-2xl p-5">
            <div className="font-display text-xl text-bronze-bright">
              Enter the {hud.pendingAge.next} Age
            </div>
            <p className="mt-1 text-xs text-parchment-dim">
              Pick one. The other is gone this play.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => engine?.pickAge("econ")}
                className="rounded-xl border border-ok/40 bg-ink-soft px-3 py-3 text-left hover:border-ok"
              >
                <div className="font-display text-sm text-ok">{hud.pendingAge.econ.name}</div>
                <div className="mt-1 text-[11px] text-parchment-dim">
                  {hud.pendingAge.econ.hint}
                </div>
              </button>
              <button
                type="button"
                onClick={() => engine?.pickAge("army")}
                className="rounded-xl border border-blood/40 bg-ink-soft px-3 py-3 text-left hover:border-blood"
              >
                <div className="font-display text-sm text-blood">{hud.pendingAge.army.name}</div>
                <div className="mt-1 text-[11px] text-parchment-dim">
                  {hud.pendingAge.army.hint}
                </div>
              </button>
            </div>
            <button
              type="button"
              onClick={() => engine?.cancelAge()}
              className="mt-3 w-full text-[11px] text-parchment-dim hover:text-parchment"
            >
              Wait
            </button>
          </div>
        </div>
      ) : null}

      {engine && <VisitingTrader engine={engine}/>}
      {hud.routeOffer && !hud.pendingAge && !founding ? (
        <div className="pointer-events-none absolute bottom-28 right-4 z-20 flex max-w-[calc(100%-2rem)] justify-end">
          <div className="hud-panel pointer-events-auto w-full max-w-xs rounded-xl px-3 py-2">
            <p className="text-[12px] leading-snug text-parchment">
              {hud.routeOffer.rival}: {hud.routeOffer.giveAmt} {resWord(hud.routeOffer.give)} for{" "}
              {hud.routeOffer.getAmt} {resWord(hud.routeOffer.get)}.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => engine?.acceptRoute()}
                className="min-h-8 flex-1 rounded-md border border-ok/40 bg-ink-soft text-[11px] text-ok hover:border-ok"
              >
                Take it
              </button>
              <button
                type="button"
                onClick={() => engine?.declineRoute()}
                className="min-h-8 rounded-md border border-parchment/20 px-3 text-[11px] text-parchment-dim hover:text-parchment"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {founding ? (
        <div className="hud-sel hud-panel rounded-xl p-3">
          <div className="font-display text-base text-bronze-bright">Plant the hall</div>
          <p className="mt-1 text-[12px] leading-snug text-parchment-dim">
            Beside a clump of berries or timber. The first one is free.
          </p>
        </div>
      ) : (
      <div className="hud-sel hud-panel rounded-xl p-2.5 w-full">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-display text-base leading-tight text-bronze-bright">
              {sel.name}
            </div>
            {!selMin ? (
              <div className="text-[11px] text-parchment-dim mt-0.5">{sel.info}</div>
            ) : null}
          </div>
          <button
            type="button"
            title={selMin ? "Expand" : "Minimize"}
            onClick={() => setSelMin((v) => !v)}
            className="grid size-8 shrink-0 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
          >
            {selMin ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>
        {selMin ? (
          sel.kind !== "none" ? (
            <div className="mt-1.5 h-1 rounded-full bg-ink overflow-hidden border border-parchment/10">
              <div className="h-full rounded-full bg-ok" style={{ width: `${hpPct}%` }} />
            </div>
          ) : null
        ) : (
          <>
            {sel.carry ? <div className="text-[11px] text-dawn mt-1">{sel.carry}</div> : null}
            {sel.kind !== "none" ? (
              <>
                <div className="mt-1.5 text-[11px] text-parchment-dim">Condition {hpPct}%</div>
                <div className="mt-1 h-1.5 rounded-full bg-ink overflow-hidden border border-parchment/10">
                  <div className="h-full rounded-full bg-ok" style={{ width: `${hpPct}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] leading-snug text-parchment-dim">
                People join through birth or migration. Select adults to drill; right-click an enemy to fight.
              </p>
            )}
            {sel.kind === "building" && sel.team === 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {hud.trainOptions
                  .filter((option) => UNITS[option.type].from === sel.type)
                  .map((option) => (
                    <button
                      key={option.type}
                      className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs disabled:opacity-40"
                      disabled={hud.age < option.age || hud.pop >= hud.popCap || !!hud.ended}
                      onClick={() => engine?.train(option.type)}
                    >
                      Train {option.name} · {option.cost.food || 0} food
                      {option.cost.wood ? ` · ${option.cost.wood} logs` : ""}
                      {hud.age < option.age ? " · later age required" : ""}
                    </button>
                  ))}
                {sel.queue && <p className="text-xs">Queue: {sel.queue}</p>}
                {sel.type === "townhall" ? (
                  <button
                    type="button"
                    className="rounded-md border border-bronze/40 px-2 py-2 text-left text-xs"
                    disabled={(hud.cornerstoneCount || 0) >= 2}
                    onClick={() => engine?.setPlacing("cornerstone")}
                  >
                    {(hud.cornerstoneCount || 0) >= 2 ? "Two cornerstones planted" : `Plant cornerstone · 70 logs · ${hud.cornerstoneCount || 0}/2`}
                  </button>
                ) : null}
              </div>
            )}
            {sel.canRecycle ? (
              <button
                type="button"
                onClick={() => engine?.recycle()}
                className="mt-1.5 min-h-8 w-full rounded-md border border-parchment/25 bg-ink-soft px-2 text-[11px] text-parchment hover:border-bronze"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Recycle className="size-3.5" />
                  Recycle — return most wood and stone
                </span>
              </button>
            ) : null}
            <div className="mt-1.5 flex gap-1">
              <button className="min-h-8 flex-1" title="Previous villager (Shift+,)" onClick={()=>engine?.cycleVillager(-1)}>← Previous</button>
              <button className="min-h-8 flex-1" title="Next villager (,)" onClick={()=>engine?.cycleVillager(1)}>Next villager →</button>
            </div>
            {hud.idleWorkers > 0 ? (
              <button
                type="button"
                onClick={() => engine?.focusIdle()}
                className="mt-1.5 min-h-8 w-full rounded-md border border-bronze/30 bg-ink-soft px-2 text-[11px] text-bronze-bright hover:border-bronze"
              >
                {hud.idleWorkers} idle · cycle to them (I)
              </button>
            ) : null}
            {showJobs ? (
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                <JobBtn
                  active={hud.job === "food"}
                  label="Food"
                  title="Gather berries and fish"
                  onClick={() => engine?.assignJob("food")}
                >
                  <Wheat className="size-3.5 text-blood" />
                </JobBtn>
                <JobBtn
                  active={hud.job === "wood"}
                  label="Logs"
                  title="Cut logs"
                  onClick={() => engine?.assignJob("wood")}
                >
                  <TreePine className="size-3.5 text-ok" />
                </JobBtn>
                <JobBtn
                  active={hud.job === "stone"}
                  label="Stone"
                  title="Quarry stone"
                  onClick={() => engine?.assignJob("stone")}
                >
                  <Mountain className="size-3.5 text-parchment-dim" />
                </JobBtn>
                {hud.age >= 1 ? (
                  <JobBtn
                    active={hud.job === "copper"}
                    label="Copper"
                    title="Gather copper (Bronze Age)"
                    onClick={() => engine?.assignJob("copper")}
                  >
                    <Coins className="size-3.5 text-bronze" />
                  </JobBtn>
                ) : null}
                {hud.age >= 2 ? (
                  <JobBtn
                    active={hud.job === "iron"}
                    label="Iron"
                    title="Gather iron (Iron Age)"
                    onClick={() => engine?.assignJob("iron")}
                  >
                    <Mountain className="size-3.5 text-parchment" />
                  </JobBtn>
                ) : null}
                <JobBtn
                  active={hud.job === "hunt"}
                  label="Hunt"
                  title="Hunt deer, boar, and goats for food"
                  onClick={() => engine?.assignJob("hunt")}
                >
                  <PawPrint className="size-3.5 text-blood" />
                </JobBtn>
                {hud.age >= 1 && <JobBtn
                  active={hud.job === "drill"}
                  label="Drill"
                  title="Bronze Age: drill this adult as a soldier while the village has spare food. Villagers can already hunt and defend."
                  onClick={() => engine?.assignJob("drill")}
                >
                  <Sword className="size-3.5 text-bronze" />
                </JobBtn>}
                <JobBtn
                  active={hud.job === "hold"}
                  label="Rest"
                  title="Stop working"
                  onClick={() => engine?.assignJob("hold")}
                >
                  <Hand className="size-3.5 text-parchment-dim" />
                </JobBtn>
              </div>
            ) : null}
            {hud.workerSelected > 0 || hud.idleWorkers > 0 || sel.kind === "none" ? (
              <button
                type="button"
                title="Keep scouting unknown ground until stopped, blocked or threatened. Select scouts and press period to stop. (X)"
                onClick={() => engine?.explore()}
                className="mt-1.5 flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dawn/30 bg-ink-soft px-2 text-[11px] text-dawn hover:border-dawn"
              >
                <Compass className="size-3.5" />
                Explore (X)
              </button>
            ) : null}
            {showFight ? (
              <div className="mt-1.5 flex gap-1">
                <button
                  type="button"
                  title={
                    hud.raidName
                      ? `Raid ${hud.raidName} with the selected adults. Move or stop to withdraw.`
                      : "Explore a rival settlement and select adults with empty hands to raid."
                  }
                  onClick={() => engine?.raidRival()}
                  className="flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-blood/40 bg-ink-soft px-2 py-1.5 text-[11px] text-parchment hover:border-blood"
                >
                  <Swords className="size-3.5 text-blood" />
                  {hud.raidName ? `Pillage ${hud.raidName}` : "Pillage camp"}
                </button>
                <button
                  type="button"
                  title="Halt"
                  onClick={() => engine?.halt()}
                  className="min-h-8 rounded-md border border-parchment/20 bg-ink-soft px-2 py-1.5 text-[11px] text-parchment hover:border-bronze/40"
                >
                  Halt
                </button>
              </div>
            ) : null}
            {sel.kind === "none" ? (
              <div className="hud-trade-mobile mt-1.5">
                <TradeBlock hud={hud} engine={engine} />
              </div>
            ) : null}
          </>
        )}
      </div>
      )}

      {founding ? null : (
      <div className="hud-build hud-panel rounded-xl p-2 flex gap-1.5 items-center">
        {buildMin ? (
          <button
            type="button"
            onClick={() => setBuildMin(false)}
            className="flex min-h-8 flex-1 items-center px-2 text-[11px] text-parchment-dim hover:text-parchment"
          >
            {AGES[hud.age]} buildings
          </button>
        ) : (
          <div className="hud-build-row">
            {hud.buildOptions.map((b, i) => {
              const active = hud.placing === b.type;
              const unaffordable =
                hud.wood < (b.cost.wood || 0) ||
                hud.stone < (b.cost.stone || 0) ||
                hud.food < (b.cost.food || 0) ||
                hud.copper < (b.cost.copper || 0) ||
                hud.iron < (b.cost.iron || 0);
              return (
                <button
                  key={b.type}
                  type="button"
                  disabled={!!hud.ended}
                  title={`${b.name} [${i + 1}]\n${b.hint}`}
                  onClick={() => engine?.setPlacing(b.type)}
                  className={`w-16 shrink-0 rounded-lg border px-1 py-1.5 text-center transition-colors ${
                    active
                      ? "border-bronze bg-bronze/20"
                      : "border-parchment/15 bg-ink-soft hover:border-bronze/40"
                  } ${unaffordable ? "opacity-40" : ""}`}
                >
                  <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-md bg-ink text-bronze">
                    {BLD_ICON[b.type] || <Landmark className="size-4" />}
                  </div>
                  <div className="text-[10px] leading-tight text-parchment">
                    {shortName(b.name)}
                  </div>
                  <div className="text-[9px] text-parchment tabular">
                    {b.cost.wood ? `L${b.cost.wood}` : ""} {b.cost.stone ? `S${b.cost.stone}` : ""}
                    {b.cost.copper ? ` C${b.cost.copper}` : ""}
                    {b.cost.iron ? ` I${b.cost.iron}` : ""}
                  </div>
                </button>
              );
            })}
            {hud.trainOptions
              .filter((u) => u.type !== "worker" && hud.age >= u.age)
              .map((u) => (
                <button
                  key={u.type}
                  type="button"
                  disabled={!!hud.ended}
                  title={`Equip an adult as a ${u.name}. Needs spare food. One fewer gatherer.`}
                  onClick={() => engine?.train(u.type)}
                  className="w-16 shrink-0 rounded-lg border border-parchment/15 bg-ink-soft px-1 py-1.5 text-center hover:border-bronze/40 disabled:opacity-40"
                >
                  <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-md bg-ink">
                    <Sword className="size-4 text-bronze" />
                  </div>
                  <div className="text-[10px] text-parchment">{u.name}</div>
                  <div className="text-[9px] text-parchment tabular">
                    {u.cost.food || 0} food
                  </div>
                </button>
              ))}
          </div>
        )}
        <MinToggle open={!buildMin} onClick={() => setBuildMin((v) => !v)} />
      </div>
      )}
      {!founding && hud.placing && hud.placeIssue ? (
        <div className="pointer-events-none absolute bottom-[5.5rem] left-1/2 z-10 -translate-x-1/2 rounded-md border border-blood/40 bg-ink/90 px-3 py-1.5 text-[11px] text-blood">
          {hud.placeIssue}
        </div>
      ) : !founding && hud.placing ? (
        <div className="pointer-events-none absolute bottom-[5.5rem] left-1/2 z-10 -translate-x-1/2 rounded-md border border-ok/30 bg-ink/90 px-3 py-1.5 text-[11px] text-ok">
          {founding ? "Click the grass" : "Click to raise"}
        </div>
      ) : null}

      <div className="hud-map hud-panel rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-2 pt-1.5">
          <div className="text-[10px] uppercase tracking-wide text-parchment-dim">Island</div>
          <MinToggle open={!mapMin} onClick={() => setMapMin((v) => !v)} />
        </div>
        {mapMin ? (
          <button
            type="button"
            onClick={() => setMapMin(false)}
            className="flex w-full items-center gap-1.5 px-2 pb-2 text-[10px] text-parchment-dim"
          >
            {hud.tribes.map((t) => (
              <span
                key={t.name}
                className="size-1.5 rounded-full"
                style={{ background: t.alive ? t.color : "#4a4038" }}
              />
            ))}
            <span className="ml-auto tabular">{hud.fps} fps</span>
          </button>
        ) : (
          <div>
            <Minimap hud={hud} engine={engine} />
            {founding ? null : (
            <div className="px-2 py-1.5 space-y-1">
              {hud.tribes
                .filter((t) => t.id !== 0 && hud.camps?.some((c) => c.team === t.id && c.known))
                .map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => engine?.focusTribe(t.id)}
                    className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] hover:bg-ink-soft"
                    style={{ borderLeft: `3px solid ${t.alive ? t.color : "#4a4038"}` }}
                  >
                    <span className={t.alive ? "text-parchment" : "line-through opacity-50"}>
                      {t.name}
                    </span>
                    <span className="ml-auto tabular text-parchment">
                      {!t.alive
                        ? "Fallen"
                        : t.hostile
                          ? "War"
                          : t.ally
                            ? "Pact"
                            : (t.tension || 0) > 0.52
                              ? "Tense"
                              : "Peace"}
                    </span>
                  </button>
                ))}
              <p className="text-[10px] leading-snug text-parchment">Explore to discover other communities.</p>
              {(hud.clusters || [])
                .filter((c) => c.held)
                .map((c) => (
                  <div key={c.name} className="text-[10px] text-ok">
                    {c.name} — {c.bonus}
                  </div>
                ))}
            </div>
            )}
            {hud.trade && !founding ? (
              <div className="px-2 pb-2">
                <TradeBlock hud={hud} engine={engine} />
              </div>
            ) : null}
          </div>
        )}
      </div>

      {techOpen && !founding ? (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-ink/70 px-3">
          <div className="hud-panel max-h-[80dvh] w-full max-w-3xl overflow-y-auto rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-lg text-parchment">Ages</div>
              <button
                type="button"
                onClick={() => setTechOpen(false)}
                className="rounded-md border border-parchment/30 px-2 py-1 text-[11px] text-parchment"
              >
                Close
              </button>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-parchment">
              The bar only offers this age. Later ages stay closed until enough people live here and
              the village has more than one kind of building.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {AGES.map((name, age) => (
                <div
                  key={name}
                  className={`rounded-xl border p-2 ${
                    age === hud.age
                      ? "border-bronze bg-bronze/15"
                      : age < hud.age
                        ? "border-parchment/20"
                        : "border-parchment/10 opacity-50"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-wide text-parchment">
                    {name}
                    {age === hud.age ? " · now" : age > hud.age ? " · later" : ""}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {BUILD_ORDER.filter((type) => BUILDINGS[type].age === age).map((type) => (
                      <li key={type}>
                        <button
                          type="button"
                          disabled={age !== hud.age || !!hud.ended}
                          onClick={() => {
                            engine?.setPlacing(type);
                            setTechOpen(false);
                          }}
                          className="w-full rounded px-1 py-0.5 text-left text-[12px] text-parchment hover:bg-ink-soft disabled:hover:bg-transparent"
                        >
                          {BUILDINGS[type].name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {hud.ended && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink/70">
          <h2 className="font-display text-5xl text-bronze-bright">
            {hud.ended === "win" ? "Victory" : "Defeat"}
          </h2>
          <p className="text-parchment max-w-md text-center px-6">{hud.endReason}</p>
          <button
            type="button"
            onClick={() => engine?.restart()}
            className="rounded-lg border border-bronze/40 bg-ink-soft px-5 py-2 text-sm text-bronze-bright hover:bg-ink"
          >
            Begin again
          </button>
        </div>
      )}
    </div>
  );
}

function TradeBlock({ hud, engine }: { hud: HudSnapshot; engine: Engine | null }) {
  const t = hud.trade;
  if (!t) return null;
  if (!t.alive) return null;
  if (t.hostile) {
    return (
      <div className="space-y-1">
        <TradeHead hud={hud} engine={engine} />
        <p className="text-[10px] leading-snug text-blood">War with {t.rival}. Trade closed.</p>
        <button
          className="rounded border border-bronze/40 px-2 py-2 text-xs"
          onClick={() => {
            if (!engine) return;
            const rival = engine.game.pickTradeRival();
            if (rival) engine.game.sendDelegation(rival.id,"peace");
            engine.pushHud();
          }}
        >
          Send peace delegation
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <TradeHead hud={hud} engine={engine} />
      <p className="text-xs text-parchment-dim">Their stores are private. These are the goods they are willing to offer.</p>
      {t.cd > 0 ? (
        <p className="text-[10px] text-parchment-dim">Caravan out · {Math.ceil(t.cd)}s</p>
      ) : t.offers.length ? (
        t.offers.map((o) => (
          <TradeBtn key={o.give + o.get + o.giveAmt} deal={o} hud={hud} engine={engine} />
        ))
      ) : (
        <p className="text-[10px] text-parchment-dim">Nothing spare to trade.</p>
      )}
    </div>
  );
}

function TradeHead({ hud, engine }: { hud: HudSnapshot; engine: Engine | null }) {
  const t = hud.trade;
  if (!t) return null;
  return (
    <div className="flex items-center gap-1">
      {t.canCycle ? (
        <button
          type="button"
          title="Previous tribe (T)"
          onClick={() => engine?.cycleTrade()}
          className="grid size-7 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1 text-center text-[10px] uppercase tracking-wide text-parchment-dim">
        Trade {t.rival}
      </div>
      {t.canCycle ? (
        <button
          type="button"
          title="Next tribe (T)"
          onClick={() => engine?.cycleTrade()}
          className="grid size-7 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
        >
          <ChevronRight className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function TradeBtn({
  deal,
  hud,
  engine,
}: {
  deal: TradeDeal;
  hud: HudSnapshot;
  engine: Engine | null;
}) {
  const have =
    deal.give === "food"
      ? hud.food
      : deal.give === "wood"
        ? hud.wood
        : deal.give === "copper"
          ? hud.copper
          : deal.give === "iron"
            ? hud.iron
            : hud.stone;
  const ok = have >= deal.giveAmt && !hud.paused && !hud.ended;
  return (
    <button
      type="button"
      disabled={!ok}
      onClick={() => engine?.trade(deal)}
      className="flex min-h-8 w-full items-center justify-between rounded-md border border-parchment/15 bg-ink-soft px-2 py-1 text-[10px] text-parchment hover:border-bronze/40 disabled:opacity-40"
    >
      <span>
        Give {deal.giveAmt} {resWord(deal.give)}
      </span>
      <span className="text-bronze-bright">
        {deal.getAmt} {resWord(deal.get)}
      </span>
    </button>
  );
}

function BankBtn({
  give,
  get,
  hud,
  engine,
}: {
  give: ResKind;
  get: ResKind;
  hud: HudSnapshot;
  engine: Engine | null;
}) {
  const g = engine?.game, partner = g?.pickTradeRival();
  const quote = g && partner ? reportedQuote(g, partner.id, give, get, 20) : null;
  const available = g && !!tradeCarrier(g);
  return (
    <button
      type="button"
      disabled={!quote?.deal || !available || hud.paused || !!hud.ended}
      title={quote?.reason || "Explore to find trading partners"}
      onClick={() => engine?.bankTrade(give, get)}
      className="rounded border border-parchment/15 bg-ink-soft px-1.5 py-0.5 text-[9px] text-parchment hover:border-bronze/40 disabled:opacity-40"
    >
      {quote?.deal ? `Trade 20 ${resWord(give)} for ${quote.deal.getAmt} ${resWord(get)} · carrier` : "Find a trade partner"}
    </button>
  );
}

function JobBtn({
  children,
  label,
  title,
  onClick,
  active,
}: {
  children: ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex min-h-8 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-[9px] ${
        active
          ? "border-bronze bg-bronze/20 text-bronze-bright"
          : "border-parchment/15 bg-ink-soft text-parchment hover:border-bronze/40"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function ResRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm leading-7">
      {icon}
      <span className="flex-1 text-parchment-dim text-[13px]">{label}</span>
      <span className="tabular min-w-10 text-right text-parchment">{value}</span>
    </div>
  );
}

function MinToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={open ? "Minimize" : "Expand"}
      onClick={onClick}
      className="grid size-8 shrink-0 place-items-center rounded-md border border-parchment/20 text-parchment hover:border-bronze/40"
    >
      {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-md border text-parchment ${
        active ? "border-bronze text-bronze-bright" : "border-parchment/20 hover:border-bronze/40"
      }`}
    >
      {children}
    </button>
  );
}

function shortName(n: string) {
  if (n === "Lumber Camp") return "Lumber";
  if (n === "Watchtower") return "Tower";
  if (n === "University") return "Univ.";
  if (n === "Storehouse") return "Store";
  return n;
}

function Minimap({ hud, engine }: { hud: HudSnapshot; engine: Engine | null }) {
  const camps = (hud.camps || []).filter((c) => c.known);
  const homeLeft = 50 + ((hud.homeX ?? 0) / MAP) * 100;
  const homeTop = 50 + ((hud.homeZ ?? 0) / MAP) * 100;
  return (
    <button
      type="button"
      aria-label="Minimap"
      className="block h-24 w-40 bg-[#1a2218] relative overflow-hidden"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width - 0.5) * MAP;
        const nz = ((e.clientY - r.top) / r.height - 0.5) * MAP;
        engine?.focusMinimap(nx, nz);
      }}
    >
      <Home
        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 text-bronze-bright"
        style={{ left: `${homeLeft}%`, top: `${homeTop}%` }}
      />
      {camps.map((c) => (
        <span
          key={c.name + c.team}
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${50 + (c.x / MAP) * 100}%`,
            top: `${50 + (c.z / MAP) * 100}%`,
            background: c.alive ? c.color : "#4a4038",
            opacity: c.alive ? 1 : 0.4,
          }}
          title={c.name}
        />
      ))}
      <span className="sr-only">Focus valley</span>
      <span className="absolute bottom-1 right-1 text-[9px] text-parchment tabular">
        {hud.fps} fps
      </span>
    </button>
  );
}
