import {villageAppeal} from "@/game/migration";
import {WEAPONS,combatPractice} from "@/game/warfare";
import { personName, predisposition } from "@/game/people";
import { DISCOVERIES } from "@/game/discovery";
import { AGES } from "@/game/constants";
import {CROPS,CROP_NAMES,beginCropTrial,setFieldCrop,cropYield} from "@/game/cultivation";
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
  neighborIntent,
} from "@/game/settlement";
import { AGE_CHOICES } from "@/game/constants";
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
  const home = g.campOf(0);
  const habitat = habitatAt(g, home.x, home.z);
  const climate=climateAt(g,home.x,home.z),foods=foodInventory(t);
  const cal = calendar(g),
    people = s.units.filter((u) => u.team === 0 && u.hp > 0),
    farms = s.buildings.filter((b) => b.team === 0 && b.type === "farm" && g.finished(b));
  const winter = open ? winterOutlook(g) : {needed:0,shortage:0,capacityShortfall:0,seconds:0};
  const stores = storehouses(g, 0);
  const dependents = people.filter((u) => isDependent(g, u)).length;
  const foodWorkers = people.filter((u) => u.job === "food" && u.order === "gather").length;
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
          <strong>
            {Math.floor(t.food)} food · {g.stockCap(0)} sheltered capacity
          </strong>
          <p>{Math.round(reserveSeconds(g) / 60)} minutes of food before spoilage</p>
          <p>{(foodSpoilage(g) * 60).toFixed(1)} food spoils per minute at present.</p>
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
            </select>
          </label>
          <p>
            Changing this priority resets adult workers’ assignments and work focus. Carriers finish
            deliveries and delegations before switching.
          </p>
          <label><input type="checkbox" checked={!!s.nightWork} onChange={e=>{s.nightWork=e.target.checked;engine.pushHud();}}/> Work through the night</label>
          <p>Workers normally sleep near shelter at night and seek shelter during storms. Night work increases fatigue.</p>
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
      <h3>Campaign orders</h3>
      <p>Select adults for an expedition. Raiding is an explicit campaign; home food and construction workers keep their priorities.</p>
      <button onClick={()=>{g.raidRival();engine.pushHud();}}>Raid and pillage with selected adults</button>
      <button onClick={()=>{g.soundRecall();engine.pushHud();}}>Sound recall horn · return everyone home</button>
      <h3>Fields and harvest</h3>
      <p>Gather wild grain, pulses or tubers and carry them home: every four food carries one sample. Four samples (sixteen gathered food), six timber and four food start a trial at the hearth. After the trial, place your first field.</p>
      <p>Known cultivation: {t.cultivated?.join(", ")||"None yet — forage for wild crop samples and bring them home."}</p>
      <ul>{CROPS.filter(k=>!t.cultivated?.includes(k)).map(kind=><li key={kind}>
        {CROP_NAMES[kind]} · {(t.cropSamples?.[kind]||0).toFixed(1)} samples at home
        {t.cropTrial?.kind===kind?` · trial ${Math.round(100*t.cropTrial.progress/t.cropTrial.duration)}%`:" · needs 4 samples, 4 food and 6 timber"}
        <button disabled={!!t.cropTrial&&t.cropTrial.kind!==kind||s.units.some(u=>u.hp>0&&u.team===0&&u.studyCrop===kind)||!t.cropTrial&&((t.cropSamples?.[kind]||0)<4||t.wood<6||t.food<4)} onClick={()=>{if(!beginCropTrial(g,kind))g.banner("An available adult and reachable hearth are needed for the trial.",4);engine.pushHud();}}>{t.cropTrial?.kind===kind?"Resume cultivation trial":"Test cultivation"}</button>
      </li>)}</ul>
      <p>Trials use an adult’s working time at the hearth. They pause for sleep, storms and urgent food needs. Wild grain, pulses and tubers occur in different habitats; pulses exhaust soil more slowly.</p>
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
      <h3>People and work</h3>
      <ul>
        {people.map((u) => (
          <li key={u.id}>
            {isDependent(g, u) ? "Dependent" : u.type === "worker" ? "Villager" : "Defender"} {u.id}
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
      {!s.tribes.some(n=>n.id>0&&n.id<3&&n.alive&&knownSettlement(g,n.id)) && <p>Explore to find another settlement. Diplomacy begins with contact.</p>}
      {s.tribes
        .filter((n) => n.id > 0 && n.id < 3 && n.alive && knownSettlement(g,n.id))
        .map((n) => (
          <section key={n.id} className="ledger-neighbor">
            <strong>{n.name}</strong>
            <TradeProposal engine={engine} team={n.id} />
            {n.hostile && (
              <button
                onClick={() => {
                  g.sendDelegation(n.id,"peace");
                  engine.pushHud();
                }}
              >
                Send peace delegation
              </button>
            )}
            <p>
              {n.hostile ? "Hostile" : n.ally ? "Allied" : "At peace"} · {neighborIntent(g, n.id)} ·
              trust {Math.round((n.trust || 0) * 100)}% · tension {Math.round(n.tension * 100)}%
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
        <button disabled={t.wood<20} onClick={()=>{close();engine.setPlacing("townhall");}}>Establish another settlement · 20 logs and construction labor</button>
        <p>Choose a distant resource clump. Building a hall provides shelter, not new people.</p>
        {(s.communities || []).filter(c=>c.team===0).map(c=><p key={c.hall}>{c.name} · {c.status} · {people.filter(u=>u.homeHall===c.hall).length} residents</p>)}
        {people.map(u=>{const traits=predisposition(u);return <p key={u.id}><strong>{personName(u)}</strong> · {isDependent(g,u)?"young":"adult"} · {u.workReason || u.order}
          {u.expedition && ` · ${u.expedition.food.toFixed(1)} journey food`}
          {` · fatigue ${Math.round((u.fatigue||0)*100)}%, pace ${Math.round(traits.speed*100)}%, strength ${Math.round(traits.strength*100)}%, appetite ${Math.round(traits.appetite*100)}%`}</p>;})}
        <h3>Life in the village</h3>
        {(s.lifeHistory || []).filter(e=>e.team===0).slice(-12).reverse().map((e,i)=><p key={i}>Year {Math.floor(e.time/1800)+1} · {e.text}</p>)}
      </section>
      <section>
        <h3>Weapons and village defense</h3>
        <p>{t.spears} spears · {t.bows} bows · {t.blades} blades in stores. Equip empty-handed adults near a hall, store or barracks. They remain members of your village.</p>
        <p>Select a hearth to craft outdoors (three times slower), or build a crafting shelter for efficient spear and bow making. Crafting uses a resident’s working time; metal blades need a forge and Bronze Age copper.</p>
        <button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left" onClick={()=>{const b=g.state.buildings.find(b=>b.team===0&&b.type==="workshop"&&g.finished(b))||g.state.buildings.find(b=>b.team===0&&b.type==="townhall"&&g.finished(b));if(b){g.clearSelect();b.selected=true;g.state.selBld=b;engine.view.look.set(b.x,b.y,b.z);close();engine.pushHud();}}}>Choose crafting shelter or hearth · recipes are on the building</button>
        {g.state.buildings.some(b=>b.team===0&&b.type==="forge"&&g.finished(b))&&<button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left" onClick={()=>{const b=g.state.buildings.find(b=>b.team===0&&b.type==="forge"&&g.finished(b))!;g.clearSelect();b.selected=true;g.state.selBld=b;engine.view.look.set(b.x,b.y,b.z);close();engine.pushHud();}}>Choose forge · make metal blades</button>}
        {people.filter(u=>u.weaponWork).map(u=><p key={u.id}>{personName(u)} · {WEAPONS[u.weaponWork!.kind].name} {Math.floor(100*u.weaponWork!.progress/u.weaponWork!.duration)}% · {u.order==='hold'&&!u.weaponWork!.paused?'assigned':'paused by another order'}{(u.order!=='hold'||u.weaponWork!.paused)&&<button onClick={()=>{u.order="hold";if(u.weaponWork)u.weaponWork.paused=false;u.node=null;u.target=null;engine.pushHud();}}>Resume weapon making</button>}</p>)}
        <button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left disabled:opacity-50" onClick={()=>engine.callToArms()}>Arm selected adults (all available if none selected)</button>
        <button className="my-2 block min-h-12 w-full rounded-md border border-bronze/30 bg-ink-soft px-3 py-2 text-left disabled:opacity-50" onClick={()=>engine.standDown()}>Stand down militia at home</button>
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
