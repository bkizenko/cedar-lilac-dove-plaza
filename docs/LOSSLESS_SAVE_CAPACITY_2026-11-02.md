# Lossless storage capacity and legacy checkpoint recovery

Baseline dee7005. Production scope: new `storageCodec.ts`, `save.ts`, `autosavePayload.ts`. Engine, schema version17, validator, raw village exports/imports and all physical game quantities remain unchanged. No storage keys are deleted or evicted, and no quota is increased.

## Causal evidence before edits

Root's own QA fresh V16/1560 export is3,005,124 UTF8bytes, SHA256 `b8e832a555b737dd9b11395de48da48bfe581726bb9450479b03f3f3854fad31`. Strict decode/encode reproduces that exact JSON. Its UTF16 string occupancy is6,010,238bytes before keys/timestamps. An atomic5MiB UTF16 adapter rejects even one uncompressed checkpoint; at10MiB the primary fits but adding the protected duplicate attempts12,020,706bytes and fails. This reproduces a sufficient capacity cause for the reported protection failure; it does not claim to have inspected or identified the actual browser's quota/storage policy.

Genuine native V16 seed1 openings across supported sizes also demonstrate the problem:1040 raw1,684,636 UTF16bytes;1560 raw4,768,686;2080 raw6,104,634. Standard primary/protection fits the modeled5MiB limit; larger duplicate checkpoints do not. Measurements use isolated adapters and the authorized own-QA file. No private browser store or user live-game state is read/injected. Only aggregate sizes, counts and hashes are included here; the QA payload is not copied into artifacts.

## Storage-only codec

Large checkpoints use a versioned lossless zlib envelope, implemented through the already installed Three.js MIT fflate0.8.2 module. UTF15 packing maps compressed bits to BMP characters U+4000–BFFF, excluding controls, quotes/backslashes, line separators and surrogate code units. Small/nonbeneficial values remain plain JSON. Raw legacy checkpoints continue to read, and normal exported files remain ordinary JSON.

The decoder validates format/length limits before unpacking. It never allocates the claimed decoded size. Fixed1024-byte compressed input increments feed a streaming inflater; each output increment is checked against declared and hard64MiB limits before retention. Final size, zlib-tail/independently recomputed Adler32 and fatal UTF8 decoding are checked before the normal strict save validator runs. A real4MiB-expansion zip-bomb with a forged32-byte header is rejected after feeding only the first1024 compressed bytes, rather than after decoding its whole stream. Malformed padding, controls/surrogates, unknown formats, extra fields, checksum corruption, truncation and oversized declarations fail closed.

The exact failed own-QA snapshot now fits all three full primary/backup/protected slots in about2.783MB total under both modeled5/10MiB budgets. Native1040/1560/2080 totals are about0.672/2.164/2.802MB respectively. The quantities and JSON text round-trip exactly; there is no coordinate rounding, dropped entity, erased history or reduced resource inventory.

## Quota-only legacy encoding migration

A held legacy raw1560 protected checkpoint alone occupies4,768,730bytes and can prevent adding even a compressed primary at5MiB. This blocker was reproduced before migration code: save failed, primary stayed absent and the protected string remained intact. Encoding that identical validated old JSON reduced its occupied bytes to721,084 and allowed the primary; original savedAt123, old time0, full state and whitespace were retained exactly.

Only an actual QuotaExceededError triggers recovery. Valid raw managed slots may be re-encoded from their exact original text; unknown, corrupt, already framed and unrelated values remain untouched. Compression/validation finishes before mutation. Every atomic replacement rechecks the full raw-slot snapshot and owned generation; each successful own conversion updates its expected raw snapshot. Conversion invalidates older jobs. Manual save/protect has one fresh retry and re-reads the existing newer-primary guard. A worker result prepared against old raw slots is superseded, never retargeted; only a fresh job may commit against converted values. If the first encoding write is denied with no conversion, it reports a genuine failure while invalidating its old job. Partial conversions retain every old checkpoint's exact data, and foreign snapshot/generation changes stop further conversion.

Web Storage still does not offer a multi-key transaction or cross-tab atomic compare-and-set. The existing final read/write window cannot be presented as stronger than it is. Legacy reads are backward compatible; an already-running older codec-unaware build is not a supported concurrent writer of the new format and should reload before mixed use. No guarantee of cross-version writer compatibility is claimed.

Recognizable damaged/future codec frames count as held saves even when they cannot decode. Startup therefore refuses automatic fresh-world fallback over them. Ordinary primary/backup rotation and protected-copy rules retain their prior meaning; migration is an encoding conversion, not a semantic replacement or deletion.

## Validation

Final post-migration compatibility suite39/39 passed (`/tmp/storage-codec-postmigration-compat.log`,84.66s), including an actual Worker thread, immutable cloning/zero gameplay RNG, stale primary/preflight/raw CAS, worker fallback/timeout/disposal and nine actual asynchronous Engine import outcomes. Genuine-capacity plus migration suite15/15 passed (`/tmp/storage-capacity-migration-release.log`,78.57s), including first-write denial, fresh retries, partial failure and a foreign write between two conversions. Dedicated coupled actual Engine checks3/3 passed (`/tmp/storage-engine-coupled.log`,54.82s) using a copied current peace+difficulty source snapshot: supported1560 import, exact original own-QA3MB import, and active New world/Hard protection with a legacy-full backup. The original-failure case reports applied=true/saved=true under5MiB and preserves the old full JSON hash, with2,079,096 total occupied bytes.

Both the isolated codec source and copied current peace+difficulty coupled source pass typecheck and development build. Logs: `/tmp/save-codec-postmigration-type.log`, `/tmp/save-codec-release-build.log`, `/tmp/storage-coupled-verified-type.log`, `/tmp/storage-coupled-final-verified-build.log`. Coupled scaffolding initially lacked build helper files; those were copied locally before the verified result. No root production/index files were edited or staged.

Tests formerly assuming raw internal slot JSON now decode that storage format before making their unchanged inventory/time/guard assertions. Worker exact-byte assertions compare the exact unpacked JSON, not a weaker subset. Public file JSON parsing remains unchanged. Quota-failure tests allow authorized exact-text re-encoding, while requiring identical data, all keys, unrelated values and old clocks/checkpoint ownership to survive.

This is durability/capacity evidence. Compression CPU/latency, arbitrary future campaign sizes, mixed old-client writers and target-hardware FPS are not qualified. Exceeding remaining space or codec bounds still fails honestly and keeps prior values. No acceptance gate or completion percentage is credited.

The seeded final migration-only rerun9/9 also passes (`/tmp/storage-migration-seeded-release.log`,16.53s); its exact captured legacy text/hash and preserved clocks are in `docs/metrics/save-capacity-legacy-after-2026-11-02.json`. These are the same rules with a fixed cosmetic RNG fixture, not a new production change.
