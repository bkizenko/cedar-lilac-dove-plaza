# Local code navigation with Graphify

Installed Graphify (graphifyy 0.9.106) in an isolated user environment. CLI: `~/.local/bin/graphify`; Codex skill: `~/.codex/skills/graphify/SKILL.md` (available on the next turn). No game dependency, background watcher, Git hook, hosted backend, or API indexing calls.

## Current local map

`.play/graphify-canonical/graphify-out/graph.json`: 371 source files, 4,098 nodes, 17,479 edges; generated using local AST only. This indexes the **working tree**, including held uncommitted changes. It is not a published-release map or the separate Worker branch. Source hashes and HEAD are recorded in `.play/graphify-canonical/source-provenance.json`; refresh after relevant edits. Private saves, screenshots, dependencies and development copies were excluded by indexing only `src`.

## Use

From the repository root:

```sh
~/.local/bin/graphify query 'food demand' --seed 'foodDemand()' --context call --budget 500 --depth 1 --graph .play/graphify-canonical/graphify-out/graph.json
```

Choose query vocabulary from actual symbols. Narrow seeds and relation filters before raising the output budget. Truncated results are incomplete. Treat links as navigation candidates: inspect the actual target source before edits and use native/built checks for acceptance. Never infer runtime behavior, gate completion, or token savings from graph size.

Refresh explicitly, one process, no semantic model calls:

```sh
~/.local/bin/graphify extract src --code-only --no-cluster --max-workers 1 --out .play/graphify-canonical
```

Keep separate maps for separate branch worktrees. Do not commit the generated graph/cache or raw private source snapshots. Installation occupies approximately 157 MB; this first map is approximately 4.7 MB. Actual token savings have not been measured.
