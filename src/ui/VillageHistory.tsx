import type { Engine } from '../game/engine';
import { yearSecondsOf } from '../game/calendarPacing';
import { villageChronicle } from './villageChronicle';

export function VillageHistory({ engine, close }: { engine: Engine; close: () => void }) {
  const events = villageChronicle(engine.game.state.lifeHistory, engine.game.state.rulers?.societies?.['0']?.dynasty?.log);
  return <section className="hud-panel village-history" aria-label="Village history">
    <div className="village-history-title">
      <strong>Village history</strong>
      <button type="button" onClick={close}>Close</button>
    </div>
    {events.length === 0 ? <p>No events recorded yet.</p> :
      <ol>{events.map((event, index) => <li key={index}>
        <span>Year {Math.floor(event.time / yearSecondsOf(engine.game.state)) + 1}</span>
        {event.source === 'house' ? '♛ ' : ''}{event.text}
      </li>)}</ol>}
  </section>;
}
