import { useState } from "react";
import type { Engine } from "@/game/engine";
import type { ResKind } from "@/game/types";
import { reportedQuote, proposeShipment, tradeCarrier, sendOffer } from "@/game/barter";
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
      Math.min(g.tribe(0).age, g.tribe(team).age) >= (k === "iron" ? 2 : 1),
  );
  return (
    <details className="trade-proposal">
      <summary>Trade reports and shipments</summary>
      <button onClick={()=>{g.sendDelegation(team,"trade");engine.pushHud();}}>Send a trade delegation</button>
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
          ? `They offer ${quote.deal.getAmt} ${names[get].toLowerCase()} for ${quote.deal.giveAmt} ${names[give].toLowerCase()}.`
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
      {!carrier && <p>An available adult with empty hands is needed to carry the goods.</p>}
      <button
        disabled={!quote.deal || !carrier}
        onClick={() => {
          proposeShipment(g, team, give, get, amount);
          engine.pushHud();
        }}
      >
        Send a carrier with this offer
      </button>
      <p>
        Uses an available adult. Sending removes the offered goods from storage; war or shortages
        can send the carrier home with their original cargo.
      </p>
    </details>
  );
}
