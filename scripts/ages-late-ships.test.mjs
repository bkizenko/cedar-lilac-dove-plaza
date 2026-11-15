import test from 'node:test';
import assert from 'node:assert/strict';
import {SHIP_CLASSES,shipClassForAge,shipClassById} from '../src/game/tradeFleet.ts';
test('late ages have their own trade hulls, strictly larger than the age before', () => {
  const cog = shipClassById('cog'), galleon = shipClassById('galleon'), merchant = shipClassById('merchantman');
  assert.ok(cog && galleon && merchant);
  assert.equal(cog.minAge, 4); assert.equal(galleon.minAge, 5);
  assert.ok(cog.cargo > merchant.cargo && galleon.cargo > cog.cargo);
  assert.ok(galleon.minTier >= cog.minTier && cog.minTier >= merchant.minTier, 'bigger hulls need as good a harbour');
  assert.ok(SHIP_CLASSES.every((c, i) => !i || c.cargo > SHIP_CLASSES[i - 1].cargo && c.minAge >= SHIP_CLASSES[i - 1].minAge));
  assert.equal(shipClassForAge(3).id, 'merchantman'); assert.equal(shipClassForAge(4).id, 'cog'); assert.equal(shipClassForAge(5).id, 'galleon');
});
