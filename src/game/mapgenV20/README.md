# Immutable published V20 generator

Every TypeScript file in this directory is a byte-for-byte copy of
`src/game/mapgen/` from published release
`714b47eb7025896e308a13756afcdc3560c7502d`.

Saved V20 worlds regenerate through this frozen implementation. Do not change
these algorithms to improve new maps: put new work in `../mapgen/` and use a new
world generation number. Keep relative imports intact. Changes to dependencies
outside this folder must retain the published V20 raw-height hash in
`scripts/mapgen-version-compat.test.mjs`.

The editable current generator is selected only for generation21 and later.
Versions before20 keep their previous generation paths. This copy changes no
player save, terrain, seed, resource, actor or ownership record.
