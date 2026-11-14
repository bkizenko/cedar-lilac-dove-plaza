import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Lane B: every disabled husbandry/water/age button must carry a title reason (hover + long-press).
const src = (p) => readFileSync(p, 'utf8');
test('husbandry buttons that can be disabled name why', () => {
  const lines = src('src/ui/HusbandryControls.tsx').split('\n').filter((l) => /<button[^>]*disabled=\{(?!action)/.test(l));
  assert.ok(lines.length >= 12);
  for (const l of lines) assert.match(l, /title=\{/, l.slice(0, 120));
});
test('water reach fish and next-age buttons name why', () => {
  assert.match(src('src/ui/WaterReachPanel.tsx'), /disabled=\{!report\.fisher\} title=/);
  assert.match(src('src/ui/AgeReadiness.tsx'), /disabled=\{!hud\.canAge\|\|!!hud\.ended\} title=/);
});
