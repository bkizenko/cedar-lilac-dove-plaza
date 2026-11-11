# Development-speed audit — November 11

## Findings from this repository

| Cost | Evidence | Change now |
|---|---|---|
| Repeated world setup and broad tests |378 test files; 262 construct Game. A broad storage regression took 179.09s; an unrelated baseline mismatch was confirmed in 3.11s. | Inspect source, run the changed-contract selector first, then affected integration once after freeze. Record baseline failures with exact source evidence; don't hide new failures. |
| Long simulation for a local decision | Partial saved-world run 570s simulation in 116.8s wall time; code showed all 3mills occupied and insufficient flour. | Use read-only save audit (~3.73s) for actual slots/stocks/blockers. No automatic seasonal rerun. |
| Repeated full validation after leaf changes | Existing final finite-band suite: 25 cases in 39.03s; relevant strict-save case ~1.2s; native journey check 6.34s. | Prove the specific ownership/payment contract first, reuse deterministic fixtures, run the final set once. |
| Mixed pending features at integration | Current sim carries separate unqualified forest/music changes alongside field work; renderer, UI and gameplay share a working tree. | One integrator, explicit owned patch set, clean published baseline, one frozen candidate. Never ship the whole dirty tree. |
| Excess context/report repetition | Original plans, request audit and iteration history overlap; main coordinator: 6268 lines. | Keep full canonical scope but load only relevant sections. A brief current handoff links evidence instead of copying prior plans. |
| Competing work on 8 GB hardware | Builds, browsers, world simulation and the user's game share the Mac. | Parallel independent source work; at most one expensive build/browser/simulation process. More agents are not automatically faster. |
| Tiny repeated releases | A metadata follow-up required another build although behavior was unchanged. | Freeze related fixes together, build once, reuse identical artifact for publication; recompile only after relevant source changes. |

These are observed cases, not an aggregate percentage improvement or a prediction about account usage. No claim that restarting the app/computer or changing models will solve workflow overhead.

## Implemented now

- `audit:food`: read-only stocks/slots/jobs/capacity report, no simulated time/browser/save edits.
- `check:food-dispatch`, `check:fish`, `check:activity`: explicit small test selectors. Save/ownership changes still require their specific conservation/migration checks; these commands are not full release acceptance.
- Current execution policy placed at the top of AGENTS.project.md: code-first diagnosis, stopped visual work, no unrequested long playthroughs, one frozen release candidate, one expensive process and bounded context.
- Stopped seasonal run preserved as incomplete evidence. No new artwork, screenshots or renderer work.

## Next architectural speed improvements (planned, not implemented here)

1. Separate pure scheduler decisions from Game execution, so eligibility/priority cases can use small readonly fixtures; keep one physical integration check per changed boundary.
2. Maintain reusable deterministic native terrain fixtures and a known-baseline failure ledger. Never bypass the generator/save tests that actually require reconstruction.
3. Make batch manifests record tested source hashes, exact commands and runtime artifact once; automate stale-source rejection and retention rather than hand-copying candidates repeatedly.
4. Finish shared task ownership so food, transport, construction and survival stop duplicating worker eligibility. This is both a game-reliability and development-speed issue; do not attempt a blanket rewrite during a bugfix.

## Official guidance checked

OpenAI's official guidance warns that blanket document-reading instructions and redundant testing prompts can add context and delay. Its workflow guidance recommends preserving material discoveries and linking canonical sources rather than copying logs/plans. These support the process changes above; measured repository timings remain the evidence for this game's bottlenecks.

- https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra
- https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex

## Yesterday versus today — measured comparison

Windows in America/New_York: November10,17:50–23:40 versus November11,08:39–10:44. Commit cadence is not publication cadence or feature completion.

| Measure | Yesterday evening | Today morning |
|---|---:|---:|
| All commits |49|8|
| Commits changing runtime source |42|5|
| Median runtime commit gap |4.85min|25.45min|
| Median source files/runtime commit |3|6|
| Median runtime changed lines/commit |35|104|
| Non-runtime commits |7|3|

Today's recorded Vite stages total about7s versus45s in yesterday's food-recovery candidate. Compiler stages therefore do not explain the slower visible code iteration. Larger bundles explain part of the difference but lines/files are not a complexity measure. Integration, repeated qualification, documentation and responding/replanning added controllable overhead; logs do not isolate model-service latency or prove a hardware slowdown.

Only five retained release folders fall in each window; their label gaps are about27.1min yesterday versus25.7min today. Old releases may have been pruned, so those folders are not a complete publication log and cannot establish equal delivery speed. Do not present the5×commit-gap ratio as a measured5×publication slowdown.

Use explicit candidate directories and run snapshot preparation separately from candidate commands. Fail fast on a relevant test failure. Freeze a batch before qualification; move unrelated findings into the next batch. For a changed test-only contract that accidentally belongs to another unpublished patch, restore the exact applicable published contract, document that provenance and rerun that case—never weaken a newly failing behavior just to pass.
