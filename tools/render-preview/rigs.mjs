// Light rigs for the preview. `adapter` mirrors src/scene/carvedPalette.ts
// CARVED_LIGHT_RIG exactly (plus a sun direction, which the rig leaves to the
// game). `tuned` is this preview's iteration toward the board; its numbers are
// a PROPOSAL recorded in docs/parallel/handoffs/claude-experience-render.md,
// not something the game uses.
import { adapterRig } from './scene-lib.mjs';

export const TUNED = {
  label: 'tuned preview rig (proposal)',
  exposure: 1,
  hemiSky: '#ffe8c8', hemiGround: '#94643a', hemiIntensity: 1.05,
  sun: '#fff0d8', sunIntensity: 1.9,
  bounce: '#c9dbe6', bounceIntensity: .22,
  fog: '#e2b884', fogNearMetres: 120, fogFarMetres: 420,
  sunDir: [-.55, .62, .45], shadows: true, shadowSoft: 1.6,
};

export function rigFor(name) { return name === 'adapter' ? adapterRig() : { ...TUNED }; }
