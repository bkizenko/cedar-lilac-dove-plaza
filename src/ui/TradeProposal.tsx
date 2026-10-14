import { useState } from "react";
import type { Engine } from "@/game/engine";
import type { ResKind } from "@/game/types";
import { reportedQuote, proposeShipment, tradeCarrier, sendOffer, sendProcurement } from "@/game/barter";
export function TradeProposal({ engine, team }: { engine: Engine; team: number }) {
  const [give, setGive] = useState<ResKind>("food"),
    [get, setGet] = useState<ResKind>("wood");
  const [amount, setAmount] = useState(20);
  const [requested,setRequested] = useState(20);
  const g = engine.game,
    quote = reportedQuote(g, team, give, get, amount),
    carrier = tradeCarrier(g);
  const names: Record<ResKind, string> = {
    food: "Food",
    wood: "Timber",
    stone: "Stone",
    copper: "Copper",
    iron: "Iron",
  };
  const goods = (Object.keys(names) as ResKind[]).filter(
    (k) =>
      (k !== "copper" && k !== "iron") ||
      g.tribe(0).age >= (k === "iron" ? 2 : 1),
  );
  return (
    <details className="trade-proposal">
      <summary>Trade reports and shipments</summary>
      <button onClick={()=>{g.sendDelegation(team,"trade");engine.pushHud();}}>Send a trade delegation</button>
      {g.state.units.filter(u=>u.team===0&&u.hp>0&&u.tradeReservation?.team===team).map(u=>(
        <p key={u.id}>Reserved for collection: {u.tradeReservation!.amount} {names[u.tradeReservation!.kind].toLowerCase()}.</p>
      ))}
      <div className="trade-terms">
        <label>
          You offer
          <select value={give} onChange={(e) => setGive(e.target.value as ResKind)}>
            {goods.map((k) => (
              <option key={k} value={k}>
                {names[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        <label>
          You request
          <select value={get} onChange={(e) => setGet(e.target.value as ResKind)}>
            {goods.map((k) => (
              <option key={k} value={k}>
                {names[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        Your stores: {Math.floor(g.tribe(0)[give])} {names[give].toLowerCase()}.
      </p>
      <p aria-live="polite">
        {quote.deal
          ? `Last reported offer: ${quote.deal.getAmt} ${names[get].toLowerCase()} for ${quote.deal.giveAmt} ${names[give].toLowerCase()}.`
          : quote.reason}
      </p>
      {quote.deal && <p>{quote.reason}</p>}
      <label>Requested quantity (negotiated at arrival)
        <input type="number" min={1} max={200} value={requested} onChange={e=>setRequested(Number(e.target.value))}/>
      </label>
      <button disabled={!carrier || give===get || g.tribe(0)[give]<amount}
        onClick={()=>{sendOffer(g,team,give,get,amount,requested);engine.pushHud();}}>
        Send my proposal and negotiate locally
      </button>
      <p>The trader may accept a smaller counteroffer. Refused goods are carried home.</p>
      <button disabled={!carrier || give===get || g.tribe(0)[give]<amount || amount<1 || requested<1}
        onClick={()=>{sendProcurement(g,team,give,get,amount,requested);engine.pushHud();}}>
        Seek the best deal · minimum {requested} {names[get].toLowerCase()}
      </button>
      <p>Spend the offered {amount} {names[give].toLowerCase()} only if the trader can bring back at least your requested quantity. Skill, local needs and relations determine the offer at arrival; otherwise the full budget returns.</p>
      {!carrier && <p>An available adult with empty hands is needed to carry the goods.</p>}
      <button
        disabled={!quote.deal || !carrier}
        onClick={() => {
          proposeShipment(g, team, give, get, amount);
          engine.pushHud();
        }}
      >
        Accept and reserve this shipment
      </button>
      <p>
        Uses an available adult. Acceptance checks availability and sets the promised goods aside; your payment travels with the carrier. Later shortages cannot spend your reserved shipment. War, lost cargo or recall can cancel it.
      </p>
    </details>
  );
}
