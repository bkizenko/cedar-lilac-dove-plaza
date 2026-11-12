# Development snapshot storage

The canonical source and current game are separate from `.play` review snapshots. On November10 the source was roughly3.7MB, installed development libraries426MB, and `.play` reported19GB. Most scratch snapshots repeated about100MB of source/reference assets. Nine leftover generated build outputs accounted for only about416MiB. APFS directory-size totals can count shared extents more than once, so these are not claims of physical reclaim.

`scripts/compact-review-files.py` replaces only byte-identical large tracked files in inactive review snapshots with independent native APFS clones of the canonical file. Later edits to either file remain independent through copy on write. It uses no hard links, no lossy compression, and no full-copy fallback. It does not delete review source, unique files, game releases, art, exported villages or browser saves. Current, next and rollback releases remain under the excluded `releases` tree.

The default is a read-only plan. Apply only after inspecting the plan. A one-hour age floor permits recent but inactive historical snapshots to be compacted; the default24-hour floor is more conservative.

```sh
python3 scripts/compact-review-files.py
python3 scripts/compact-review-files.py --review SOME_OLD_REVIEW
python3 scripts/compact-review-files.py --apply --minimum-age-hours 1
```

Only direct `.play` children with preserved game source/package files and a dependency symlink back to canonical libraries are eligible. Active process arguments/working directories are checked again for each snapshot. Symlinks, hard-linked files, immutable/append-only files, small files, recent files, differing bytes and differing ownership/extended attributes/ACLs are skipped. Hashes are checked before and after native cloning; the original review identity is rechecked before atomic replacement. Original mode, flags and file timestamps are retained. A failed or uncertain clone leaves the review file in place.

Each apply run writes a small numeric report in `.play/review-compaction-*.json`. Reports distinguish matched logical bytes from the filesystem's observed free-space change, which also includes other filesystem activity. Ordinary folder-size displays can remain similar after compaction. Run `python3 scripts/compact-review-files.test.py` to verify native clone isolation, concurrent changes, unsupported cloning, metadata flags and snapshot protections.
