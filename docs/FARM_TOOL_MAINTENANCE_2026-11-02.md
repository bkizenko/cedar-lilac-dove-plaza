# Owned farming-tool wear and paid self-repair

Base: `188df58`. Implementation and verification were performed in an isolated frozen export, without changing shared working-tree source. No terrain/influence/cultivation/knowledge or village-ledger edits are included.

## Delivered contract

- One resident owns a tool kind and optional condition (0–1). A legacy tool with no condition remains implicitly full until actual work first wears it.
- Only hands-on sowing, tending and harvesting wear the tool. Walking, queued repair, rest and idle time do not. Full service life is centrally tunable in actual work seconds: stone600, copper900, iron1200.
- The actual labor bonus is `1 + (full bonus - 1) × condition`. A broken tool remains owned, gives no bonus, and ordinary hand work can continue. New paid toolmaking/upgrades restore full condition; replacing a broken equal-kind tool still pays the full recipe.
- A resident can pay to maintain their own existing tool below90% condition. Repair consumes1log plus1stone/copper/iron and12/18/24 base work seconds. The townhall retains its doubled duration; actual crafting-shelter practice/work rate still applies.
- The owner physically walks to a compatible workplace and uses a real shared bench. Material payment happens once, only after actual actor ownership succeeds. Repair progress is never credited while walking or queued.
- The same tool is unavailable for a farming bonus throughout pending repair, including pause. Direct movement/recall release the actor while retaining the paid workpiece/progress. Strict load reconstructs active ownership and leaves paused work unclaimed. Resume pays nothing again. Completion restores that same owned tool once; it creates no communal tool stock.
- A bounded one-second ownership audit releases removed/dead/interrupted makers. This is self-maintenance, not a remote smith service: death loses the owned tool/workpiece; it grants neither a repair nor a refund.

## Ownership and benches

New `farmToolOwnership.ts` coordinates actual actors for both old toolmaking and repairs. Existing `craftingQueue` continues to enforce physical bench ordering. No additional bench ledger claim is layered on top: haulage already subtracts these legacy equipment workers, and adding another claim would double-count occupancy. This does not qualify all-executor atomic goods/capacity migration.

## UI and workload

`FarmToolRepairControls` is inserted inside the existing selected townhall/workshop/forge **Farm tools** disclosure in `Hud.tsx`. It shows actual owned condition, broken hand-work status, exact repair cost, paid progress, resume and one disabled reason. It shows at most12 owners, no extra permanent panel, and SSR rendering does not mutate orders or inventory. Workload uses actual repair duration and its executor's existing work rate.

Stone tool eligibility/rejection now says townhall/crafting shelter truthfully. Actual hearth equipment benches remain unsupported. `SettlementLedger.tsx` was deliberately untouched because another agent owns it; its older hearth-tool wording needs a separate text correction.

## Executed verification

23 distinct checks passed: five maintenance/ownership cases, two actual React SSR cases, eight existing tool regressions, two workload-plan checks and six production/workload checks. The seven maintenance/UI checks were subsequently rerun with active-repair restore and real legacy-condition-absent decode assertions. Final isolated TypeScript check passed. No build or desktop acceptance is claimed here.

The connected new case uses unchanged natural V14 seed1/pangaea1040 terrain and a declared finite initially worn hoe. An actual resident walks to and sows a seed-funded field until it breaks, then pays1log/1stone, walks to a genuinely paid/built crafting shelter, partially repairs, receives a direct movement/recall order, saves/restores, returns and resumes the same paid repair. It restores only the same owned hoe to100%, with exactly one material charge. Active and paused saves, legacy absence, no walking/queue wear, saturated benches, competing actor claims, builder/rest eligibility and dead-maker release are checked.

## Gate limits / proposed joined M1-09 proof

These focused checks alone do not qualify M1-09. Next run a joined finite-needs scenario: physically build shelter/workshop; make and deliver/equip a garment through existing hide-processing recipes; craft a new hoe, sow enough paid expandable ground to wear below90%, perform interrupted/saved self-repair, and continue work; allow ordinary fatigue/rest recovery at the built shelter and natural cold exposure with real food/water/fuel consumption. Compare actual work rate, garment warmth/cold pressure and recovered fatigue; assert people/stock/paid-work conservation and no source/terrain/position fixes. Disclose controlled endowments/climate/conflict separately from a Normal campaign claim.

Integrator extension: actual hearths now have one slower outdoor stone-tool place; both making and repair execute through real walking/bench work, with a dedicated ordinary-Game.step case. Queue labels and ledger condition/resume text reflect repairs. Combined48-case verification and joined M1-09 proof are recorded in docs/TOOLS_CAMERA_SURVIVAL_2026-11-02.md; earlier23-case report is retained as component provenance.
