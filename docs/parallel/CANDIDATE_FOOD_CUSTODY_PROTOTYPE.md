# Disabled food custody prototype

Source preservation for Grok-led review; Claude owns conflicts. Not integrated, not tested (9 prepared only), not live, zero gate credit. Runtime consumers need complete migration before activation.

```json
{
  "baseCommit": "3266af2ce2af25e3ff0bd1229d32250ad996ff01",
  "state": "source-prepared-unexecuted; leaf-only, typed live loads DISABLED",
  "files": [
    {
      "path": "src/game/packedFoodCustody.ts",
      "sha256": "9660c9a2f5bca515e4163a67528fc77c03528c33364d002b8bf0a1c6692ec9aa"
    },
    {
      "path": "scripts/packed-food-custody.test.mjs",
      "sha256": "18f02180c0a2c91286abcefab538fdab0de68c3cddfe63e7e71282572befd9a8"
    },
    {
      "path": ".play/scout-food-custody-contract.md",
      "sha256": "59e89ad24e79622ac4fca0b4072f2efc0a7a638309aa24e0842b4265bbfbe576"
    }
  ],
  "testsPrepared": 9,
  "checksRun": [],
  "runtimeIntegration": false,
  "complete": false,
  "sourceClaims": [
    "new src/game/packedFoodCustody.ts",
    "new scripts/packed-food-custody.test.mjs"
  ],
  "sharedSourceEdits": [],
  "futureField": "ScoutProvisions.foodCustody?: PackedFoodCustody<FoodKind>, defined in scoutProvisions.ts (Unit already type-imports it), no types.ts change in this candidate",
  "preservedBase": {
    "src/game/scoutProvisions.ts": true,
    "src/game/types.ts": true,
    "src/game/seaExploration.ts": true,
    "src/game/finiteCamp.ts": true,
    "src/game/coastalTrade.ts": true,
    "src/game/captivity.ts": true,
    "src/game/pantry.ts": true,
    "src/game/carriedLoad.ts": true
  }
}
```
