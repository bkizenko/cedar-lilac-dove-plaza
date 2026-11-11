# Handoff — Claude Experience render review (in progress)

- Branch `agents/claude-experience-render` (from `agents/claude-experience` c2f1e54). New files only: `tools/render-preview/**`, `tools/blender/**`, `.github/workflows/render-previews.yml`, this note.
- Rendered PNGs are kept local until the user has seen them; they are not pushed.

## Tooling (see tools/render-preview/README.md)
- Stand-in WebGL2 renderer (`render.mjs`, `renderer.html`): it has been run here and its shading follows the adapter's material and rig.
- `render-three.mjs`: real three.js 0.185.1. **Not executed here** (no node_modules, no network); syntax-checked only.
- `tools/blender/`: exporter (run here in Node), Cycles script (`py_compile` only), driver. **Not executed here.**
- CI workflow runs both pipelines and uploads artifacts.

The critique, measured colours and palette proposals follow in the final version of this note.
