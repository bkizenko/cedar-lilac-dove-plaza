# Pending source checkpoint

Grok leads execution. This branch preserves all51 pending source/test/document edits from the canonical working copy for review. It is not qualified or published. Do not infer current behavior from this snapshot. Main retains the d86d7da live build; acceptance remains34/98.

Normal whole-branch merge review is required; existing Worker and external model branches are separate. Some changes are historical held experiments. Resolve overlap with current work before promotion. Private saves, generated previews and duplicated build outputs were excluded.

```json
{
  "scope": "Unqualified pending source checkpoint for Grok-led integration review. NOT merged to main, NOT a live game release, zero gate credit. Existing canonical held edits/index unchanged.",
  "base": "c619d08f3262e954bcf2ec1190fc75e51c9bcbc1",
  "files": {
    "docs/REVIEW_STORAGE_MAINTENANCE.md": "30146631a927705d42984ea396f738a342d812d5389fdbdcb0074f71887d79a1",
    "docs/SETTLEMENT_ECONOMY_AND_ART_PLAN.md": "f02367c8304385adbedbe427d0ce164d84d3e4dd33b02cc55ef04270e45a593c",
    "scripts/compact-review-files.py": "db9689eb19b5fd8c5e87bd56d359c2224ae157df9d1cc4b9d8cdaa57157370dc",
    "scripts/compact-review-files.test.py": "555645cd4d9b473452505d05c883613591feb5940a566ff669d9efba88950fcf",
    "scripts/diagnostics/housing-connected-pilot.mjs": "2fb14344a69d259e06d95e4047a39849adaba39081fb2793698ff1630a5908d7",
    "scripts/diagnostics/saved-food-recovery.mjs": "9457876ee56f6c4aca4e97a912bf402feda1a8c5462bb6afc1be9b5566f860d3",
    "scripts/field-work.test.mjs": "61d5912cbed1617f9e434786a6bf660d7f226247bf37304aba9fbdbd96b06350",
    "scripts/housing-funding-admission.test.mjs": "d8fde2d6641e1f375c2b4a119962b75ea7fddb45bf3f4bc03df702ad2c9e03d5",
    "scripts/housing-survival-npc.test.mjs": "1fb5b18ebf11bac49f33f9875a89e7504caa9d4d7dd7a2791789b5e13a85aa89",
    "scripts/housing-ui-art.test.mjs": "d7c118739c4755eb099b74d40d34795e49af67d67dd096cdd871c106f7400051",
    "scripts/housing.test.mjs": "0d8bbcad1f239f0b20897c17387f41bca950b68e76eb36aad172256df82e53fa",
    "scripts/militia-camp-live.test.mjs": "e09d563cacef1daf576252f7469e27af85680997b26aa93b43f10fe7d561e18e",
    "scripts/rival-development.test.mjs": "88e2bfcb85fd140485d27739ffc567c7078d9c136828247418896ac789d899a6",
    "scripts/rival-operations.test.mjs": "98a6583fa05035b11fd21a6e45174d4941e552390d1efbc3ab1c607319c5fbd5",
    "scripts/scalable-plots.test.mjs": "ba871da30cbfebae3fe81295c366422884da8d7fa87a09da52a82ab2e113e8e3",
    "src/game/engine.ts": "a13570d31f4277833f7ba88813f2680d369a8bafb916d3c86d88a598d3daa434",
    "src/game/fieldWork.ts": "4d7701f0a4009ebd1fba90add3343c5c8ede46f829d672ba32b614a137858022",
    "src/game/plotExpansion.ts": "11fc2575ce9322fcdd65efb59f4c9342595162292765cd76da35067b276b7087",
    "src/game/plots.ts": "b29d7c93d43e33909b89882c5dc72dd58c5fa35eccda7c125798ca8b29f7135e",
    "src/game/productionReport.ts": "7e06861dedd9b8dc59dab2b2210e58e80ca80974c237ad31d5c979a8a973a8f9",
    "src/game/rivalOperations.ts": "c6e24193a44eee89a01b3164839e84a28abb3fe5ac70bda62f5c0d74a2d0afff",
    "src/game/settlement.ts": "1f719a032b2a9615a5f2350cb8b056365c742dd8146b6ddc6d241314669dbc7d",
    "src/game/sim.ts": "7278840db05ff92c77518d1cd8fd463409f2774c26522bf688c516bedfd11389",
    "src/game/villageWorkload.ts": "9a7ecf0a7a4f760c3f606428f789c7fbf34336cc5b151baf8c66833f19899fc3",
    "src/scene/contourFields.ts": "4bbd80a2ee2b22a558956dd37eafbb8ec06d29cb10cf1491678f331f24e8bbc6",
    "src/scene/meshes.ts": "2cbacb329f9f69466ec17cb74f058ef6a7337884f91f6eb3de4176127819afbf",
    "src/ui/PlotControls.tsx": "127efac9d003067bfb61e9b8850abe92c99ae6635c64c4edbee16758ff8ac188",
    "docs/LIVESTOCK_WATER_REMAINING_GAP_2026-11-02.md": "f1ebb3b1feb0252dc48bcc0dd165866d4c0d3a76ec14a6c9cff59b08222c6e98",
    "docs/M2_07_INFORMATION_CAUSALITY_AUDIT_2026-11-02.md": "ec257cd09b60b11ca5e2646764225ce121644104430bc77ddf23ad7d770d4d30",
    "docs/PRODUCTION_CATALOGUE_UI.md": "f512e5e478c491b9200663c01f31fafe05df3f7bdf66575d64150a61c80b3664",
    "docs/RIVAL_MATERIAL_NEEDS_AUDIT_2026-11-01.json": "7984f8923242d960abd694e112e3b7c300986e7e3faddf3acb1bd6679edd097d",
    "docs/SEARCH_QUERY_PERFORMANCE_2026-11-02.md": "829c94257be2bdef131c1e5ec81829ca9de3e4cd32c85f4858126dd75b8049b7",
    "docs/WITNESSED_FRONTIER_CLAIMS_2026-11-02.md": "f94a07baf9d08b54084d74892ecd36cc24e206e7273ad174689bfea6ebebf1d9",
    "docs/WORKBOARD_OBSTRUCTION_PERFORMANCE_2026-11-01.md": "acb328d1384a30f52a538141fa58a70a4760d0dab30cfef862bf77cf45fbf355",
    "docs/metrics/information-causality-audit-2026-11-02.json": "884ffb715eeecf06f1504e4101b605a7a75e5b2913d9fe01c07bea1f7f459ac5",
    "docs/metrics/search-query-performance-2026-11-02.json": "8a8e6e9df85511f448d8860c1c90709938bf3be7c818a6ea42cac58a30d16cb5",
    "docs/metrics/unseen-secondary-town-2026-11-02.json": "cc899398855c89ec534018ede91215ff7dbd7aa9762777b82e63ddd37664187e",
    "docs/metrics/witnessed-frontier-claims-2026-11-02.json": "e6f592855a349af201e23c0dc2c38c51009c9ffa0228961359184188e968bd07",
    "docs/metrics/workboard-obstruction-performance-2026-11-01.json": "a90f4d31abbc7ee8a468c590c266b6d3478d5ee1c807afe0fa9b02d98f3fc648",
    "scripts/cleanup-review-snapshots.py": "7670e9d62bce0612ff31491329148332c748592eaf6dfb78e07836813ee3975b",
    "scripts/cleanup-review-snapshots.test.py": "394baa65826b97736b4120a69ec68a934550977a2315fe91942051e2ce011ad0",
    "scripts/combat-music-contact.test.mjs": "5bba4d4fc348f6131440cf63a38d58ad0dba613a0ee2346aa9a8e6aa3f78bc77",
    "scripts/diagnostics/native-large-field-browser.mjs": "7d3434645d4e12a72011bc069506618dbe5e5712942efff971402e29ea3a9027",
    "scripts/diagnostics/placement-clearance-repro.mjs": "80b752866130f77021aa5efd43327125cbfddc962998cdab3d369268fa17593a",
    "scripts/diagnostics/unseen-secondary-town-repro.mjs": "6f4ad30c04e66cb32998b2d82790c9c93f05e0612a8f5e47b9085561c62f0c40",
    "scripts/diagnostics/unwitnessed-frontier-repro.mjs": "b875a069ac26d123e888b3c5ff41c8657c3e1f4bf4810d0e8212578408df39fa",
    "scripts/large-contour-fields.test.mjs": "9ed41ff95b09e8f3aea6a3a2fb5fc227f2cf343db1bfa255c63f8ca3004f978f",
    "scripts/rival-construction-clearance.test.mjs": "88ad7ae0f82fafa3f510d5305a0e98507462a0fcc4cfcf58915abe7cce4d00cf",
    "scripts/v12-first-winter.test.mjs": "a719cc11573331f11875415a8d0d79f2cfcae7347ca284f7f158794048e24893",
    "src/game/combatMusic.ts": "422d6f44812b2596f5f3a1b68dff1d9892e8c64664262a0bf7a6f143ee0c4810",
    "src/game/rivalConstruction.ts": "a29c009caeed3ea239c5bce6d3f8d593f12bb70d88bb3c8819391c34584bb894"
  },
  "excluded": "Private saves/fixtures, .play copies, .qualification, screenshots/PNGs/previews, bytecode, sim.ts.orig duplicate, and generated .vercel deletions remain local."
}
```
