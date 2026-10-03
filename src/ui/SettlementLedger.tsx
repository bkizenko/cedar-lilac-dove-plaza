import { foodSpoilage, winterOutlook, storehouses } from "@/game/pantry";
import { habitatAt } from "@/game/ecology";
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
    engine.game.state.paused = true;
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
        Year {cal.year + 1} · {cal.name} · {Math.ceil(cal.remaining / 60)} minutes until the next
        season
      </p>
      <p className="text-sm text-parchment-dim">
        Paused while you plan. Food reserves exclude future gathering and harvests.
      </p>
      <div className="ledger-grid">
        <section>
          <h3>Food security</h3>
          <strong>
            {Math.floor(t.food)} / {g.stockCap(0)} food storage
          </strong>
          <p>{Math.round(reserveSeconds(g) / 60)} minutes of food before spoilage</p>
          <p>{(foodSpoilage(g) * 60).toFixed(1)} food spoils per minute at present.</p>
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
              spoilage. Food left above storage capacity spoils quickly. Wild food does not regrow
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
                s.laborPolicy = e.target.value as typeof s.laborPolicy;
                g.workBoard.reset();
                engine.pushHud();
              }}
            >
              <option value="balanced">Balanced work</option>
              <option value="food">Secure food reserves</option>
              <option value="build">Finish construction</option>
            </select>
          </label>
          <p>
            Workers reserve jobs automatically. Direct assignments stay in effect. Changing
            priorities affects new tasks.
          </p>
          <label>
            Border pressure{" "}
            <select
              value={s.conflict || "balanced"}
              onChange={(e) => {
                s.conflict = e.target.value as typeof s.conflict;
                engine.pushHud();
              }}
            >
              <option value="quiet">Quiet frontier</option>
              <option value="balanced">Measured rivalry</option>
              <option value="dangerous">Contested lands</option>
            </select>
          </label>
          <p>Quiet frontier prevents new unprovoked raids; existing enemies still fight.</p>
          <label>
            Village growth{" "}
            <select
              value={s.growthPolicy || "stable"}
              onChange={(e) => {
                s.growthPolicy = e.target.value as typeof s.growthPolicy;
                engine.pushHud();
              }}
            >
              <option value="stable">Consolidate the village</option>
              <option value="welcome">Welcome settlers when reserves allow</option>
            </select>
          </label>
          <p>
            Births require spare housing, eight minutes of reserves and adults to support children.
            Welcoming migrants permits arrivals with six minutes of reserves. Children mature at 16;
            adult migration supports growth while they grow up.
          </p>
        </section>
      </div>
      <h3>Fields and harvest</h3>
      {farms.length === 0 ? (
        <p>No finished fields. Forage and hunt while you establish your first farm.</p>
      ) : (
        <ul>
          {farms.map((b) => (
            <li key={b.id}>
              Field {b.id} · full harvest capacity {Math.floor(260 * (b.fertility ?? 1) * habitatAt(g, b.x, b.z).crops * (s.agePicks[3] === "econ" ? 1.2 : 1))} food per year · soil {Math.round((b.fertility ?? 1) * 100)}% ·{" "}
              {b.fallowYear === cal.year ? "Resting this year" : "In cultivation"}:{" "}
              {Math.round((b.crop?.planted || 0) * 100)}% sown ·{" "}
              {Math.round((b.crop?.tended || 0) * 100)}% tended ·{" "}
              {b.crop?.ripened
                ? `${Math.floor(b.crop.remaining)} food left to harvest`
                : `up to ${Math.floor(
                    (b.crop?.planted || 0) *
                      (160 + 100 * (b.crop?.tended || 0)) *
                      (b.fertility ?? 1) * habitatAt(g, b.x, b.z).crops *
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
                ? "Holding position"
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
                  g.agreeTruce(n.id);
                  engine.pushHud();
                }}
              >
                Agree truce &amp; withdraw
              </button>
            )}
            <p>
              {n.hostile ? "Hostile" : n.ally ? "Allied" : "At peace"} · {neighborIntent(g, n.id)} ·
              trust {Math.round((n.trust || 0) * 100)}% · tension {Math.round(n.tension * 100)}%
            </p>
            <button
              disabled={t.food < 30}
              onClick={() => {
                if (t.food < 30) return;
                t.food -= 30;
                n.food += 30;
                n.trust = Math.min(1, (n.trust || 0) + 0.2);
                n.tension = Math.max(0, n.tension - 0.2);
                if (n.hostile && (n.trust || 0) >= 0.4) {
                  g.agreeTruce(n.id);
                }
                g.banner(`Food sent to ${n.name}; relations improve`, 3);
                engine.pushHud();
              }}
            >
              Send 30 food · build trust{n.hostile ? " / seek truce" : ""}
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
