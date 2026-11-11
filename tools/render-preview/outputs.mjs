// Scene -> output file names shared by every backend. The stand-in WebGL2
// renderer writes into docs/art-reference/h-renders/, render-three.mjs into
// docs/art-reference/h-renders/three/, Blender into docs/art-reference/h-renders/blender/.
export const OUTPUTS = [
  ['families-1', 'a1-families-1.png'],
  ['families-2', 'a2-families-2.png'],
  ['families-3', 'a3-families-3.png'],
  ['closeup', 'a4-closeup-near-detail.png'],
  ['civic-1', 'a5-civic-1.png'],
  ['civic-2', 'a6-civic-2.png'],
  ['town-centre', 'b2-town-centre.png'],
  ['village', 'b-village.png'],
  ['wonders', 'c-wonders.png'],
  ['caravans', 'd-caravans-stalls.png'],
  ['lod', 'e-lod-tiers.png'],
  ['civ-lineup', 'f0-civ-lineup.png'],
  ...['desert-canyon', 'river-delta', 'temperate-forest', 'steppe-highland', 'coastal-island', 'cold-north'].map((id, i) => ['civ-' + id, `f${i + 1}-civ-${id}.png`]),
];
