// Light rigs for the preview. `adapter` mirrors src/scene/carvedPalette.ts
// CARVED_LIGHT_RIG exactly (plus a sun direction, which the rig leaves to the
// game). `tuned` is this preview's iteration toward the board; its numbers are
// a PROPOSAL recorded in docs/parallel/handoffs/claude-experience-render.md,
// not something the game uses.
import { adapterRig } from './scene-lib.mjs';

export const TUNED = {
  label: 'tuned preview rig (proposal)',
  // Measured against board H: neutral-white light (albedos already carry the
  // warmth), more sun / less fill for the board's tops-bright, sides-dark read,
  // slight exposure lift, and albedo saturation x0.86 to undo the Neutral tone
  // map's 0.04 toe offset, which otherwise pushes wood saturation from ~0.6 to ~0.8.
  exposure: 1.06,
  hemiSky: '#fff8f0', hemiGround: '#b08058', hemiIntensity: 1.35,
  sun: '#fffaf2', sunIntensity: 2.9,
  bounce: '#c9dbe6', bounceIntensity: .22,
  fog: '#e2b884', fogNearMetres: 120, fogFarMetres: 420,
  sunDir: [-.55, .62, .45], shadows: true, shadowSoft: 1.6,
  albedoSat: .86,
  /** carvedTerraceSample grain amplitude used by the preview terrain (palette: .07) */
  terrainGrainAmplitude: .015,
  blender: { saturation: .9, value: 1.0, sun_strength: 4.2, sky_strength: .35, sky_tint: '#ffd9ad', sun_angle_deg: 3 },
};

/** Natural terrain + warm golden-hour grade (user direction after review 1):
 * low warm sun, soft sky fill, long soft shadows. Proposal only. */
export const GOLDEN = {
  label: 'golden-hour rig (natural terrain)', exposure: 1.08,
  hemiSky: '#ffe6c4', hemiGround: '#6e5a3c', hemiIntensity: 1.25,
  sun: '#ffcf96', sunIntensity: 3.4,
  bounce: '#b9cde0', bounceIntensity: .3,
  fog: '#e8c9a0', fogNearMetres: 110, fogFarMetres: 420,
  sunDir: [-.68, .4, .45], shadows: true, shadowSoft: 2.2,
  albedoSat: .95, waterSky: '#c4d3da',
  blender: { saturation: 1.0, value: 1.0, sun_strength: 4.0, sky_strength: .4, sky_tint: '#ffd2a0', sun_angle_deg: 3.5 },
};
export function rigFor(name) {
  const base = name === 'adapter' ? adapterRig() : name === 'golden' ? { ...GOLDEN } : { ...TUNED };
  return process.env.RIG_JSON ? { ...base, ...JSON.parse(process.env.RIG_JSON) } : base; // tuning hook
}
