import type { Engine } from '../game/engine';
import { YEAR_SECONDS } from '../game/settlement';

export function VillageHistory({ engine, close }: { engine: Engine; close: () => void }) {
  const events = (engine.game.state.lifeHistory ?? []).filter(event => event.team === 0).reverse();
  return <section className="hud-panel village-history" aria-label="Village history">
    <div className="village-history-title">
      <strong>Village history</strong>
      <button type="button" onClick={close}>Close</button>
    </div>
    {events.length === 0 ? <p>No events recorded yet.</p> :
      <ol>{events.map((event, index) => <li key={index}>
        <span>Year {Math.floor(event.time / YEAR_SECONDS) + 1}</span>
        {event.text.replace(/^\[Contact \d+\] /, '')}
      </li>)}</ol>}
  </section>;
}
