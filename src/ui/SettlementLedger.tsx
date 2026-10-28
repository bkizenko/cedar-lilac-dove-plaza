import {sendCaptiveEscort} from '@/game/caravans';
import {captiveGuardCoverage,captivityDescription,repatriateCaptive} from '@/game/captivity';
import {buildingCost} from "@/game/construction";
import {PEACE_TERMS,peaceTerms,peaceDescription,peaceIssue,rejectPeace,releasePuppet,freePeople} from '@/game/peace';
import {fieldProductionSummary} from "@/game/productionReport";
import {planStatus,planMissing} from "@/game/construction";
import {workdayAt,solarTimeLabel} from "@/game/daylight";
import {FARM_TOOLS,resumeFarmToolWork} from "@/game/farmTools";
import {HAULAGE,resumeHaulageWork} from "@/game/haulage";
import {villageAppeal,foodAttention} from "@/game/migration";
import {resumeWeaponWork,WEAPONS,combatPractice} from "@/game/warfare";
import { personName, predisposition } from "@/game/people";
import { DISCOVERIES } from "@/game/discovery";
import { AGES, AGE_CHOICES, BUILDINGS } from "@/game/constants";
import {CROPS,CROP_NAMES,seekCropSamples,beginCropTrial,setFieldCrop,cropYield} from "@/game/cultivation";
import { foodSpoilage, winterOutlook, storehouses, foodInventory, FOOD_KINDS } from "@/game/pantry";
import { habitatAt, soilQuality, climateAt } from "@/game/ecology";
import { TradeProposal } from "./TradeProposal";
import { knownSettlement } from "@/game/barter";
import { useEffect, useRef } from "react";
import type { Engine } from "@/game/engine";
import {
  calendar,
  reserveSeconds,
  foodDemand,
  isDependent,
} from "@/game/settlement";
export function SettlementLedger({ engine }: { engine: Engine | null }) {
  const ref = useRef<HTMLDialogElement>(null),
    open = !!engine?.keyboard.ledger;
  useEffect(() => {
    if (!engine || !open) return;
    const paused = engine.game.state.paused;
    engine.setPaused(true);
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      engine.game.state.paused = paused;
      engine.canvas.focus();
    };
  }, [engine, open]);
  if (!engine || !engine.game.started) return null;
  const g = engine.game,
    s = g.state,
    t = g.tribe(0);
  if (!t) return null;
  const workday=workdayAt(s.time,g.dayPhase()*24);
  const home = g.campOf(0);
  const habitat = habitatAt(g, home.x, home.z);
  const climate=climateAt(g,home.x,home.z),foods=foodInventory(t);
  const cal = calendar(g),
    people = s.units.filter((u) => u.team === 0 && u.hp > 0),
    farms = s.buildings.filter((b) => b.team === 0 && b.type === "farm" && g.finished(b));
  const winter = open ? winterOutlook(g) : {needed:0,shortage:0,capacityShortfall:0,seconds:0};
  const guards=open?captiveGuardCoverage(g):new Set<number>();
  const stores = storehouses(g, 0);
  const dependents = people.filter((u) => isDependent(g, u)).length;
  const foodWorkers = people.filter((u) => u.job === "food" && u.order === "gather").length;
  const militia=people.filter(u=>u.militia),standingDown=militia.filter(u=>u.demobilizing).length;
  const projects=s.buildings.filter(b=>b.team===0&&b.hp>0&&!g.finished(b));
  const knownCrops = t.cultivated || [];
  const trial = t.cropTrial;
  const trialWorker = trial && people.find(u => u.studyCrop === trial.kind);
  const readyCrop = CROPS.find(kind => !knownCrops.includes(kind) && (t.cropSamples?.[kind] || 0) >= 4);
  const sampleCrop = [...CROPS].sort((a,b) => (t.cropSamples?.[b] || 0) - (t.cropSamples?.[a] || 0))[0];
  const startTrial = (kind: typeof CROPS[number]) => {
    if(!beginCropTrial(g,kind))g.banner("An available adult and reachable hearth are needed for the trial.",4);
    engine.pushHud();
  };
  const close = () => {
    engine.keyboard.ledger = false;
    engine.pushHud();
  };
  return (
    <dialog ref={ref} className="play-guide settlement-ledger" onCancel={close}>
      <h2 className="font-display text-2xl text-bronze-bright">The village ledger</h2>
      <p><strong>{habitat.name}</strong> · {habitat.advice}</p>
      <p className="mt-2">
        Year {cal.year + 1} · {cal.month} ({cal.name}) · {Math.ceil(cal.remaining / 60)} minutes until the next
        season
      </p>
      <p className="text-sm text-parchment-dim">
        Paused while you plan. Food reserves exclude future gathering and harvests.
      </p>
      <div className="ledger-grid">
        <section>
          <h3>Food security</h3>
          {militia.length>0&&<div role="status">
            <p>{militia.length} armed civilians are on military duty or hunting instead of ordinary food work. {standingDown>0&&`${standingDown} are returning to stand down.`}</p>
            <button className="my-2 min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left" onClick={()=>engine.standDown()}>Return militia to food and work</button>
            <p>They return home, unload supplies and put weapons away before resuming village priorities. Close the ledger to let them travel.</p>
          </div>}
          <strong>
            {Math.floor(t.food)} food · {g.stockCap(0)} sheltered capacity
          </strong>
          <h4 className="mt-3 font-display text-bronze-bright">{knownCrops.length ? "Farming" : "Start farming"}</h4>
          <ol className="list-decimal pl-5">
            <li>Gather wild grain, pulses or tubers and bring home 8 food for 4 samples.
              {!knownCrops.length && !trial && <> {Math.floor(t.cropSamples?.[sampleCrop] || 0)}/4 {sampleCrop} samples at home.</>}</li>
            <li>Residents automatically test cultivation at the hearth: 4 samples, no logs or food cost. One adult works for 30–45 seconds.
              {trial && <> {trial.kind} trial: {Math.floor(100*trial.progress/trial.duration)}% complete.</>}
              {!trial && knownCrops.length>0 && <> Learned: {knownCrops.join(", ")}.</>}</li>
            <li>Place a field for 4 seed baskets. Greener ground in the placement preview means richer soil; keep it on dry land.</li>
          </ol>
          {trial ? (
            <>
              <button className="min-h-11" disabled={!!trialWorker} onClick={()=>startTrial(trial.kind)}>
                {trialWorker ? `Testing ${trial.kind} · ${Math.floor(100*trial.progress/trial.duration)}%` : "Resume cultivation trial"}
              </button>
              <p>{trialWorker ? "Close the ledger to let work continue. Saved trials keep their existing progress and work time." : "The paid trial is paused. Resume with an available adult; materials are not charged again."}</p>
            </>
          ) : knownCrops.length ? (
            <button className="min-h-11" onClick={()=>{close();engine.setPlacing("farm");}}>
              Place {farms.length ? "another field" : "your first field"} · 4 seed baskets
            </button>
          ) : readyCrop ? (
            <button className="min-h-11" disabled={false} onClick={()=>startTrial(readyCrop)}>
              Test {readyCrop} cultivation · 4 samples
            </button>
          ) : (
            <button className="min-h-11" onClick={()=>{seekCropSamples(g);engine.pushHud();}}>Find and gather crop seeds</button>
          )}
          <p>Forage and hunt while fields grow. Sow in spring, tend in summer, then carry the autumn harvest home.</p>
          <p>{Math.round(reserveSeconds(g) / 60)} minutes of food before spoilage</p>
          <p>{(foodSpoilage(g) * 60).toFixed(1)} food spoils per minute at present.</p>
          <p>Food work continues when stores fill; extra supplies are kept outdoors.</p>
          {t.food>g.stockCap(0)&&<button onClick={()=>{close();engine.setPlacing("warehouse");}}>Plan a storehouse · protects 200 more food</button>}
          {farms.length>0&&<details><summary>Field output & seasonal work</summary>
            {farms.map((b,i)=><p key={b.id}>Field {i+1}: {fieldProductionSummary(g,b)}.</p>)}
            <p>Estimates exclude walking, rest and later weather changes. Tools reduce work time; they do not create extra harvest. Food enters stores only when carried home.</p>
          </details>}
          <p>Hunting: craft spears or bows at the hearth or crafting shelter, arm adults near village stores, then choose Hunt with weapons. Bows reach farther and equipped hunters need fewer hits. Meat must still be butchered and carried home.</p>
          <p>{FOOD_KINDS.filter(k=>foods[k]>=1).map(k=>`${Math.floor(foods[k])} ${k}`).join(" · ") || "No food reserves"}</p>
          <p>{Math.round(climate.temperature)}°C · {Math.round(climate.humidity*100)}% humidity · {Math.ceil(Math.max(0,t.food-g.stockCap(0)))} food outdoors. Fresh fish and berries keep less well than grain; cool, dry weather slows decay.</p>
          <p><strong>{cal.phase === 3 ? "Remaining winter" : "Full winter"}: about {winter.needed} food needed.</strong>{" "}
            {winter.shortage ? `${winter.shortage} more than current stores.` : "Current stores cover this estimate."}
          </p>
          {winter.capacityShortfall > 0 && <p>Storage is {winter.capacityShortfall} below that target. Expand storage or plan winter food production.</p>}
          <p className="text-sm">Estimate assumes current population, weather, adequate capacity and maintained stores, with no new gathering or harvest. It excludes food eaten before winter.</p>
          {stores.map(b => <p key={b.id}>Storehouse preservation: {Math.round((b.storeCare || 0) * 100)}%. Available adults dry and smoke surplus food using timber.</p>)}
          <p>
            {(foodDemand(g) * 60).toFixed(1)} food consumed per minute · {foodWorkers}/
            {people.length} people currently doing food work
          </p>
          <p>
            {people.length - dependents} adults · {dependents} dependents. Children need food and
            shelter before joining the workforce.
          </p>
          {s.agePicks.length > 0 ? (
            <p>
              Paths kept:{" "}
              {s.agePicks.map((p, i) => AGE_CHOICES[i]?.[p].name).filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <details>
            <summary>How food and harvests work</summary>{" "}
            <p>
              Fields need spring sowing and summer tending. Harvest must be carried into storage in
              autumn; uncollected crops are lost in winter. One worker can maintain each storehouse, using one timber per eight seconds of preparation. Urgent gathering takes priority. Storehouses increase capacity and reduce
              spoilage. Food may remain outdoors, with faster decay in warm, humid weather. Wild food does not regrow
              in winter, and gathering what remains is slower.
            </p>
          </details>
        </section>
        <section>
          <h3>Work priorities</h3>
          <label>
            Village priority{" "}
            <select
              value={s.laborPolicy || "balanced"}
              onChange={(e) => {
                g.setLaborPriority(e.target.value as NonNullable<typeof s.laborPolicy>);
                engine.pushHud();
              }}
            >
              <option value="balanced">Balanced work</option>
              <option value="food">Secure food reserves</option>
              <option value="build">Finish construction</option>
              <option value="wood">Gather timber</option>
              <option value="stone">Gather stone</option>
              <option value="hunt">Find and hunt herds</option>
              <option value="explore">Explore and make contact</option>
              <option value="trade">Develop trade connections</option>
            </select>
          </label>
          <p>
            Changing priority reassigns village workers, including paused crafters and recalled residents.
            Carriers deliver first; returning explorers join on arrival. Active crafting, study, delegations,
            settlement journeys and armed guards keep their orders.
          </p>
          {s.laborPolicy==="trade" && <p>Staff your approved routes first and send one trader to refresh old offers. At least three adults and six minutes of food reserves are kept at home. Choose purchases in a known community’s trade panel.</p>}
          <label><input type="checkbox" checked={!!s.nightWork} onChange={e=>{s.nightWork=e.target.checked;engine.pushHud();}}/> Work through the night</label>
          <p>Adult workday: {solarTimeLabel(workday.start)}–{solarTimeLabel(workday.end)} · about {workday.hours.toFixed(1)} hours. Summer allows up to 18 hours, winter 16; lamplight extends natural daylight. Ordinary rain permits work. Storms require shelter; urgent food and loaded deliveries can continue beyond the usual workday. Exhausted workers recover before resuming.</p>
          <label>
            Village growth{" "}
            <select
              value={s.growthPolicy || "stable"}
              onChange={(e) => {
                g.setGrowthPolicy(e.target.value as NonNullable<typeof s.growthPolicy>);
                engine.pushHud();
              }}
            >
              <option value="stable">Consolidate the village</option>
              <option value="welcome">Welcome settlers when reserves allow</option>
              <option value="eager">Enthusiastically welcome settlers</option>
            </select>
          </label>
          <p>
            Births require spare housing, eight minutes of reserves and adults to support children.
            Welcoming migrants permits arrivals with six minutes of reserves; enthusiastic welcomes need four and invite groups sooner. Food, shelter, health, rest and relations affect attraction. Childhood is compressed into six minutes;
            adult migration supports growth while they grow up.
          </p>
          <p>Food surplus attention: {Math.round(foodAttention(g)*100)}%. Larger reserves attract arriving families more often and raise raider interest after the opening grace period. Housing and food safeguards still apply. Palisades, gates and trenches protect approaches; leave a gate for your workers. Stone walls arrive in Iron, flooded moats in Medieval.</p>
          <p>Settler attraction: {Math.round(villageAppeal(g)*100)}% · improve food security, spare housing, rest and peaceful relations. Exploration focus sends up to a quarter of adults (at most three); the others keep the village working.</p>
        </section>
      </div>
      <p><strong>Next age:</strong> {g.ageUpIssue(0) || "Ready — choose a development path in the age panel."}</p>
      <details>
        <summary>Exploration chronicle</summary>
        <p>Remembered discoveries and journeys. Practical development will depend on materials, experiments and study brought home, not points.</p>
        <ul>
          {DISCOVERIES.map(d => {
            const entry = s.discoveries?.find(h => h.id === d.id);
            return <li key={d.id}><strong>{d.name}</strong>{" "}
              {entry ? `Recorded in the ${AGES[entry.age]} Age, year ${Math.floor(entry.time / 1800) + 1}.` : d.hint}
            </li>;
          })}
        </ul>
      </details>
      <section>
        <h3>Building plans & construction</h3>
        <p>Lay out an available building before you have its materials. Blue foundations are plans: people can walk through them. As supplies arrive, affordable plans reserve their full cost once and builders begin work. Smaller affordable projects can start while larger ones wait.</p>
        <p>Keep food secure first. Pause a plan to save materials for tools or another project. Unpaid plans can be cancelled freely.</p>
        {projects.length ? projects.map(b=><div key={b.id} className="mt-2 rounded-md border border-parchment/20 p-2">
          <strong>{BUILDINGS[b.type].name}</strong> · {planStatus(g,b)}
          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-md border border-bronze/30 px-2" onClick={()=>{g.selectEntity(b);engine.view.look.set(b.x,b.y-1.2,b.z);close();engine.pushHud();}}>Find site</button>
            <button type="button" className="min-h-11 rounded-md border border-bronze/30 px-2" onClick={()=>{g.orderConstruction(b);engine.pushHud();}}>Assign builders</button>
            {b.plannedCost&&<>
              <button type="button" className="min-h-11 rounded-md border border-bronze/30 px-2" onClick={()=>{b.planPaused=!b.planPaused;g.workBoard.reset();engine.pushHud();}}>{b.planPaused?"Resume plan":"Pause plan"}</button>
              <button type="button" className="min-h-11 rounded-md border border-bronze/30 px-2" onClick={()=>{g.selectEntity(b);g.recycleSelected();engine.pushHud();}}>Cancel plan</button>
              {planMissing(g,b).filter(n=>n.kind==="wood"||n.kind==="stone").map(n=><button key={n.kind} type="button" className="min-h-11 rounded-md border border-bronze/30 px-2" onClick={()=>{g.setLaborPriority(n.kind as "wood"|"stone");engine.pushHud();}}>Focus {n.kind==="wood"?"timber":"stone"}</button>)}
            </>}
          </div>
        </div>):<p>No projects queued. Choose a building from the bar to plan its site.</p>}
      </section>
      <h3>Campaign orders</h3>
      <p>Select adults for an expedition. Raiding is an explicit campaign; home food and construction workers keep their priorities.</p>
      <button onClick={()=>{g.raidRival();engine.pushHud();}}>Raid and pillage with selected adults</button>
      <button onClick={()=>{g.soundRecall();engine.pushHud();}}>Sound recall horn · return everyone home</button>
      <h3>Fields and harvest</h3>
      <p>Known cultivation: {t.cultivated?.join(", ")||"None yet — forage for wild crop samples and bring them home."}</p>
      <details>
      <summary>Crop experiments and varieties</summary>
      <ul>{CROPS.filter(k=>!t.cultivated?.includes(k)).map(kind=><li key={kind}>
        {CROP_NAMES[kind]} · {(t.cropSamples?.[kind]||0).toFixed(1)} samples at home
        {t.cropTrial?.kind===kind?` · trial ${Math.round(100*t.cropTrial.progress/t.cropTrial.duration)}%`:" · needs 4 samples and 2 logs; 30–45 seconds of work"}
        <button disabled={!!t.cropTrial&&t.cropTrial.kind!==kind||s.units.some(u=>u.hp>0&&u.team===0&&u.studyCrop===kind)||!t.cropTrial&&((t.cropSamples?.[kind]||0)<4)} onClick={()=>startTrial(kind)}>{t.cropTrial?.kind===kind?"Resume cultivation trial":"Test cultivation"}</button>
      </li>)}</ul>
      <p>Trials use an adult’s working time at the hearth. They pause for sleep, storms and urgent food needs. Wild grain, pulses and tubers occur in different habitats; pulses exhaust soil more slowly.</p>
      </details>
      {farms.length === 0 ? (
        <p>No finished fields. Forage and hunt while you establish your first farm.</p>
      ) : (
        <ul>
          {farms.map((b) => (
            <li key={b.id}>
              Field {b.id} · {b.crop?.kind||b.cropType||"grain"} · full harvest capacity {Math.floor(260 * (b.fertility ?? 1) * cropYield(g,b) * habitatAt(g, b.x, b.z).crops * (0.65 + soilQuality(g,b.x,b.z)*0.5) * (s.agePicks[3] === "econ" ? 1.2 : 1))} food per year · soil {Math.round((b.fertility ?? 1) * 100)}% ·{" "}
              {b.fallowYear === cal.year ? "Resting this year" : "In cultivation"}:{" "}
              {Math.round((b.crop?.planted || 0) * 100)}% sown ·{" "}
              {Math.round((b.crop?.tended || 0) * 100)}% tended ·{" "}
              {b.crop?.ripened
                ? `${Math.floor(b.crop.remaining)} food left to harvest`
                : `up to ${Math.floor(
                    (b.crop?.planted || 0) *
                      (160 + 100 * (b.crop?.tended || 0)) *
                      (b.fertility ?? 1) * (b.crop?.water??1) * cropYield(g,b) * habitatAt(g, b.x, b.z).crops * (0.65 + soilQuality(g,b.x,b.z)*0.5) *
                      (s.agePicks[3] === "econ" ? 1.2 : 1),
                  )} food expected`}
              <button
                disabled={cal.phase !== 0}
                onClick={() => {
                  b.fallowYear = b.fallowYear === cal.year ? undefined : cal.year;
                  if (b.fallowYear === cal.year && b.crop) b.crop.planted = 0;
                  g.workBoard.reset();
                  engine.pushHud();
                }}
              >
                {b.fallowYear === cal.year ? "Cultivate this year" : "Rest field this year"}
              </button>
              <label> Next crop <select value={b.crop?.kind||b.cropType||"grain"} disabled={!!b.crop&&b.crop.year===cal.year&&b.crop.planted>0} onChange={e=>{setFieldCrop(g,b.id,e.target.value as "grain"|"pulses"|"tubers");engine.pushHud();}}>{(t.cultivated?.length?t.cultivated:["grain"]).map(k=><option key={k} value={k}>{k}</option>)}</select></label>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>Soil and crop rotation</summary>
        <p>
          Repeated cropping reduces soil fertility. Leave a field unsown for a year to restore it;
          rotate between fields to preserve yields. Resting a field cancels any sowing already
          completed this spring.
        </p>
      </details>
      {people.some(u=>u.enslavedFrom!==undefined)&&<section><h3>Captivity and guards</h3><p>Assign an escort to accompany a returning captive, or station armed adults near captive workers. Each idle or holding guard watches up to three people within 18 meters; a travelling escort watches their assigned person. Hunger and forced work build resistance; at 100% they may escape with carried goods. You can free them here at any time.</p><ul>{people.filter(u=>u.enslavedFrom!==undefined).map(u=><li key={u.id}>{personName(u)} · {captivityDescription(u,guards.has(u.id))}{u.recalled&&<button onClick={()=>{sendCaptiveEscort(g,u.id);engine.pushHud();}}>Assign escort</button>}<button onClick={()=>{repatriateCaptive(g,u.id);engine.pushHud();}}>Send home</button></li>)}</ul>{[...new Set(people.filter(u=>u.enslavedFrom!==undefined).map(u=>u.enslavedFrom!))].map(team=><button key={team} onClick={()=>{freePeople(g,team);engine.pushHud();}}>Free captives from {g.tribe(team)?.name||"the former settlement"}</button>)}</section>}
      <h3>People and work</h3>
      <ul>
        {people.map((u) => (
          <li key={u.id}>
            <strong>{personName(u)}</strong> · {isDependent(g, u) ? "young" : u.type === "worker" ? "villager" : "defender"}
            · age {Math.floor(u.ageT / 1800)}{u.sickUntil ? " · recovering from fever" : ""}:{" "}
            {u.emergency
              ? u.workReason
              : u.order === "hold"
                ? u.workReason || "Holding position"
                : u.order === "idle"
                  ? u.workReason || (u.type === "worker" ? "Finding work" : "Guarding the village")
                  : u.order === "gather" && u.node && "type" in u.node && u.node.type === "farm"
                    ? u.workReason
                    : `${u.order}${u.job ? ` · ${u.job}` : ""}`}
          </li>
        ))}
      </ul>
      <h3>Caravans</h3>
      {s.routes.length === 0 ? (
        <p>
          No regular routes agreed. Single trades also need an adult to carry the goods there and
          back.
        </p>
      ) : (
        <ul>
          {s.routes.map((r) => (
            <li key={r.id}>
              {r.rival}: {r.status || "Preparing caravan"} · {r.giveAmt} {r.give} for {r.getAmt}{" "}
              {r.get}
              <button
                onClick={() => {
                  r.paused = !r.paused;
                  engine.pushHud();
                }}
              >
                {r.paused ? "Resume departures" : "Pause departures"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3>Neighbor relations</h3>
      {!s.tribes.some(n=>n.id>0&&n.id!==3&&n.alive&&knownSettlement(g,n.id)) && <p>Explore to find another settlement. Diplomacy begins with contact.</p>}
      {s.tribes
        .filter((n) => n.id > 0 && n.id !== 3 && (n.peaceTerm==='annexation' || (n.alive && knownSettlement(g,n.id))))
        .map((n) => (
          <section key={n.id} className="ledger-neighbor">
            <strong>{n.name}</strong>
            {s.tradeReports?.filter(r=>r.team===n.id&&r.observation).map(r=><div key={r.team} className="ledger-report">
              <p>Trader report · {Math.floor((s.time-r.time)/60)} minutes ago. Estimated {r.observation!.populationLow}–{r.observation!.populationHigh} people near this settlement; {r.observation!.buildings} completed buildings observed. Distant towns and travelers are not counted.</p>
              <p>{Object.keys(r.observation!.stocks).length?`They reported: ${Object.entries(r.observation!.stocks).map(([kind,level])=>`${kind==='wood'?'logs':kind} ${level}`).join(' · ')}.`:'They kept their supply levels private. Trade offers are the available evidence.'} Send another trader to refresh this account.</p>
            </div>)}
            {n.peaceTerm && <p>Treaty: {PEACE_TERMS[n.peaceTerm]}.</p>}
            {n.tribute && <p>Tribute: {n.tribute.amount} logs every two minutes. {n.tribute.paid} delivered; {n.tribute.owed} owed (including shipments on the road). {n.tribute.remaining<0?'Continues until independence.':`${n.tribute.remaining} scheduled payments left.`}</p>}
            {n.peaceTerm==='puppet' && <button onClick={()=>{releasePuppet(g,n.id);engine.pushHud();}}>Grant independence</button>}
            {n.hostile && n.peaceOffer && n.peaceOffer.expires>s.time && <div role="status">
              <p>{n.name} sues for peace: {PEACE_TERMS[n.peaceOffer.term]}. Expires in {Math.ceil(n.peaceOffer.expires-s.time)} seconds.</p>
              <button onClick={()=>{g.resolvePeaceTerm(n.id,n.peaceOffer!.term);engine.pushHud();}}>Accept peace offer</button>
              <button onClick={()=>{rejectPeace(g,n.id);engine.pushHud();}}>Reject offer</button>
              <p>You may send different terms below.</p>
            </div>}
            <TradeProposal engine={engine} team={n.id} />
            {n.hostile && (
              <div className="flex flex-wrap gap-1">
                {peaceTerms.map(term => (
                  <div key={term} className="w-full">
                    <button disabled={!!peaceIssue(g,n.id,term)} onClick={() => { g.proposePeace(n.id,term); engine.pushHud(); }}>
                      Propose {PEACE_TERMS[term].toLowerCase()}
                    </button>
                    <p>{peaceDescription[term]} {peaceIssue(g,n.id,term)}</p>
                  </div>
                ))}
              </div>
            )}
            <p>
              {n.hostile ? "Hostile" : n.ally ? "Allied" : "At peace"}. Send a delegation for current trading terms; their private plans are unknown.
            </p>
            <button
              disabled={t.food < 30}
              onClick={() => {
                g.sendDelegation(n.id,"gift");
                engine.pushHud();
              }}
            >
              Send gift carrier · 30 food{n.hostile ? " / seek truce" : ""}
            </button>
            {!n.hostile ? (
              <button
                disabled={t.food < 20 || (n.trust || 0) < 0.35 || (n.compactUntil || 0) > s.time}
                onClick={() => {
                  g.offerCompact(n.id);
                  engine.pushHud();
                }}
              >
                {(n.compactUntil || 0) > s.time
                  ? `Grazing compact holds · ${Math.ceil(((n.compactUntil || 0) - s.time) / 60)} min`
                  : "Offer grazing rights · 20 food"}
              </button>
            ) : null}
          </section>
        ))}
      <section className="mt-4">
        <h3>People and hearths</h3>
        <p>Village fatigue: {Math.round(people.reduce((sum,u)=>sum+(u.fatigue||0),0)/Math.max(1,people.length)*100)}%</p>
        <button onClick={()=>{close();engine.setPlacing("townhall");}}>Plan another settlement · {buildingCost("townhall",g).wood} logs</button>
        <p>Choose a distant resource clump. Building a hall provides shelter, not new people.</p>
        {(s.communities || []).filter(c=>c.team===0).map(c=><p key={c.hall}>{c.name} · {c.status} · {people.filter(u=>u.homeHall===c.hall).length} residents</p>)}
        {people.map(u=>{const traits=predisposition(u);return <p key={u.id}><strong>{personName(u)}</strong> · {isDependent(g,u)?"young":"adult"} · {u.workReason || u.order}
          {u.expedition && ` · ${u.expedition.food.toFixed(1)} journey food`}
          {` · fatigue ${Math.round((u.fatigue||0)*100)}%, pace ${Math.round(traits.speed*100)}%, strength ${Math.round(traits.strength*100)}%, appetite ${Math.round(traits.appetite*100)}%`}</p>;})}
        <h3>Life in the village</h3>
        {(s.lifeHistory || []).filter(e=>e.team===0).slice(-12).reverse().map((e,i)=><p key={i}>Year {Math.floor(e.time/1800)+1} · {e.text}</p>)}
      </section>
      <section>
        <h3>Farming tools</h3>
        <p>Stone hoes speed sowing and tending by 25%; copper tools by 50%; iron tools by 70%. Each tool belongs to one resident. Craft stone hoes at a hearth or shelter, and metal sets at a forge. Harvesting is also faster; the field still needs seeds, water and labor.</p>
        {people.filter(u=>u.farmTool||u.farmToolWork).map(u=><p key={u.id}>{personName(u)} · {u.farmTool?FARM_TOOLS[u.farmTool].name:"Basic hand tools"}{u.farmToolWork&&<> · making {FARM_TOOLS[u.farmToolWork.kind].name.toLowerCase()} {Math.floor(100*u.farmToolWork.progress/u.farmToolWork.duration)}%{u.farmToolWork.paused&&<button onClick={()=>{if(!resumeFarmToolWork(g,u))g.banner("Need empty hands and a reachable toolmaking workplace to resume",4);engine.pushHud();}}>Resume toolmaking</button>}</>}</p>)}
        <h3>Carrying equipment</h3>
        <p>Make a sled at a hearth or crafting shelter. Its owner carries twice as much. After 60 goods have actually arrived by sled, a crafting shelter can replace a sled with a handcart carrying three times as much.</p>
        <p>{Math.floor(t.haulagePractice||0)}/60 goods delivered by sled.</p>
        <p>Build a dugout at a fishing dock (20 logs, 2 stone, 75 seconds). Its maker can paddle across water with twice the hand-carried load, then portage on land at 80% walking speed. Select the carrier and order a destination or recall them as usual. Canoes can also fish known offshore grounds.</p>
        <p>Tame a discovered wild goat from a hearth or crafting shelter (10 food, 2 logs, 60 seconds). Its handler carries twice as much without a hauling speed penalty. Goats graze in warm seasons and need more village feed in winter. Movement or combat pauses taming; use the same action to resume without paying again.</p>
        {people.filter(u=>u.haulage||u.haulageWork).map(u=><p key={u.id}>{personName(u)} · {u.haulage?HAULAGE[u.haulage].name:"Hand carrying"}{u.haulageWork&&<> · making {HAULAGE[u.haulageWork.kind].name.toLowerCase()} {Math.floor(100*u.haulageWork.progress/u.haulageWork.duration)}%{u.haulageWork.paused&&<button onClick={()=>{if(!resumeHaulageWork(g,u))g.banner("Need empty hands and a reachable crafting workplace to resume",4);engine.pushHud();}}>Resume transport work</button>}</>}</p>)}
        <h3>Weapons and village defense</h3>
        <p>{t.spears} spears · {t.bows} bows · {t.blades} blades in stores. Equip empty-handed adults near a hall, store or barracks. They remain members of your village.</p>
        <p>Select a hearth to craft outdoors (three times slower), or build a crafting shelter for efficient spear and bow making. Crafting uses a resident’s working time; metal blades need a forge and Bronze Age copper.</p>
        <button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left" onClick={()=>{const b=g.state.buildings.find(b=>b.team===0&&b.type==="workshop"&&g.finished(b))||g.state.buildings.find(b=>b.team===0&&b.type==="townhall"&&g.finished(b));if(b){g.clearSelect();b.selected=true;g.state.selBld=b;engine.view.look.set(b.x,b.y,b.z);close();engine.pushHud();}}}>Choose crafting shelter or hearth · recipes are on the building</button>
        {g.state.buildings.some(b=>b.team===0&&b.type==="forge"&&g.finished(b))&&<button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left" onClick={()=>{const b=g.state.buildings.find(b=>b.team===0&&b.type==="forge"&&g.finished(b))!;g.clearSelect();b.selected=true;g.state.selBld=b;engine.view.look.set(b.x,b.y,b.z);close();engine.pushHud();}}>Choose forge · make metal blades</button>}
        {people.filter(u=>u.weaponWork).map(u=><p key={u.id}>{personName(u)} · {WEAPONS[u.weaponWork!.kind].name} {Math.floor(100*u.weaponWork!.progress/u.weaponWork!.duration)}% · {u.order==='hold'&&!u.weaponWork!.paused?'assigned':'paused by another order'}{(u.order!=='hold'||u.weaponWork!.paused)&&<button onClick={()=>{if(!resumeWeaponWork(engine.game,u))engine.game.banner('Choose an available adult and a reachable weapon-making workplace',4);engine.pushHud();}}>Resume weapon making</button>}</p>)}
        <button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left disabled:opacity-50" onClick={()=>engine.callToArms()}>Arm selected adults (all available if none selected)</button>
        <button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left disabled:opacity-50" disabled={!militia.length} onClick={()=>engine.standDown()}>Stand down militia · return to work</button>
        <p>Sea raids grow over the early waves, then level off. Their size is limited by your surviving adults, health, weapons and defenses. Losses bring a longer recovery interval and reduced pressure on the next wave. Raids never overlap another sea band, including its retreat.</p>
        <p>Select a group, then Pillage a discovered camp, or right-click a target. Relations turn hostile when the raid arrives. Move away or sound the recall horn to withdraw. Raiders carry supplies from ruined stores home; supplies are never granted remotely.</p>
        {s.buildings.filter(b=>b.hp<=0&&b.lootTeam===0&&b.raidLoot&&Object.values(b.raidLoot).some(n=>(n||0)>0)&&g.exploredAt(b.x,b.z)).map(b=><button key={b.id} className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left disabled:opacity-50" onClick={()=>{g.issuePillage(b);close();engine.pushHud();}}>Recover remaining loot from {g.tribe(b.team).name} ruins</button>)}
        {people.filter(u=>(u.combatXP||0)>0).map(u=><p key={u.id}>{personName(u)} · combat practice {Math.round((combatPractice(u)-1)*100)}% damage bonus</p>)}
      </section>
      <p className="mt-4 text-sm">
        Nearby danger triggers sheltering and an armed militia response. Returning militia resume
        civilian work after the danger passes.
      </p>
      <button className="guide-close" onClick={close}>
        Return to the village
      </button>
    </dialog>
  );
}
