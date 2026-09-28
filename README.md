# Dawn of Empire

A browser-based 3D settlement and strategy game. See DEVELOPMENT_STATUS.md for the verified implementation milestone and remaining work; GAME_DESIGN.md and ASTRA_BACKLOG.md describe the larger intended game.

## Run
Use Node 24.19 or a compatible current Node version, then `npm ci`, `npm run build`, and `npm run preview`. The production preview is configured for port 8081. The local development server currently has an SSR WebSocket issue on the tested Mac; production preview works.

## Play without a mouse
Enter begins. C cycles people, B buildings, [ / ] visible resources, R orders, WASD/arrows pan, Q/E rotate and Page Up/Down zoom. 1–8 choose quick buildings and Enter places at the center target. J selects workers, V army, Z attack-moves, period stops and semicolon holds. Ctrl+1–9 stores groups; Alt+1–9 recalls them. Tab/Shift+Tab and Enter operate menus. Escape cancels or returns focus to the world. P pauses, H opens the complete guide and audio settings, M mutes.

Save and Load are in the top-right menu. Loads resume paused. Storage is local to this browser.

## Music and licensing
Music progresses from Folk Round to Celtic Impulse, with Five Armies during nearby combat. All three recordings are by Kevin MacLeod under CC BY 4.0. They use acoustic/orchestral instrument timbres, including sampled instruments. THIRD_PARTY_ASSETS.md contains exact sources, license details, hashes and attribution. License evidence is bundled under public/licenses/.

## Verify
`npm run test:game`, `npm test`, `npm run typecheck`, `npm run build`.
