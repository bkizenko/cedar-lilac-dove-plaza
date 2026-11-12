# Preserved candidate for Claude integration review

Grok leads execution; Claude owns conflicts. Whole branch review only. Candidate source hashes verified against its existing qualification manifest. No built release or new gate credit. Do not promote based solely on component checks.

```json
{
  "base": "3266af2ce2af25e3ff0bd1229d32250ad996ff01",
  "state": "24/24focused+retainedtests andNode24typecheckPASS; rootintegration/build/browser pending",
  "files": [
    {
      "path": "src/scene/fixedOrbitCollision.ts",
      "new": true,
      "sha256": "6e96d1df8339f9ae77d2458e46148719ebf51d418afb16a4e9bb91b54bda18bb",
      "baseSha256": null
    },
    {
      "path": "src/scene/world.ts",
      "new": false,
      "sha256": "146b6a42506bfaab543ff093f07184935dab9799d56541a6cb41a24f6502be77",
      "baseSha256": "a6cf091dc1cb78936723e6c54d0cec1da7e8b3fc045bb6d70964784d8a058a8b"
    },
    {
      "path": "scripts/fixed-camera-collision.test.mjs",
      "new": true,
      "sha256": "402d14446b71b70d2d3beb86e93f1e9eb16de0fce87c54f5cadb12b89e4ef9ed",
      "baseSha256": null
    },
    {
      "path": "scripts/camera-clearance.test.mjs",
      "new": false,
      "sha256": "7bd640074b70c626a1456722c2cc1405517aa0ce922feb012eea765bea859a81",
      "baseSha256": "8d0d1dd39515e53b2e5fb68ca2c2a1acd197b18f639c5ce80a92496aab45adb3"
    }
  ],
  "patch": "fixed-camera-collision.patch",
  "patchSha256": "e0eb9683f6f6b8f1b50a9b122041bb3ba21bfc1c623cb94f3b225dca24950de3",
  "userPolicy": "Zoom/pan never automatically change rendered view angle. Terrain collides with physical camera; reject unsafe motion at last safe rigidpose. Explicitmanualrightdrag yaw/pitch remains supported.",
  "runtimeChanges": [
    "world.ts switches only camera leaf/hook/reset; existing pan/zoom limits andmanualinput controls retained",
    "Accepted rigid focus/distance/orbit feeds back to WorldView so repeatedblockedwheel/pan cannot accumulate through terrain",
    "Halfmetre swept-eye sampling with near-planefootprint and2mclearance; bounded512steps/8192heightqueries, binary boundaryrefinement",
    "Cold/restored/invalidatedpose uses bounded same-angle14\u2013230mdistance search; never verticalraise/automatictilt/overheadfallback",
    "Mountains may occlude target naturally; noforcedsightlineclearance",
    "Impossible same-angle request explicitly returns no pose; caller retains priorcamera while usercanchangeorbit/position; no fabricatedfullclearance"
  ],
  "checks": {
    "newCurrentCollisionCases": 8,
    "retainedCameraCases": 16,
    "distinctPassed": 24,
    "distinctTotal": 24,
    "typecheck": "PASS supportedNode24",
    "newTestLog": "FIXED_CAMERA_TEST.log (7cases before native addition)",
    "finalTestLog": "FIXED_CAMERA_ALL_TEST.log (24/24distinct)",
    "typecheckLog": "FIXED_CAMERA_TYPECHECK.log",
    "heavyLaneReleased": true
  },
  "actualWorldViewCoverage": [
    "flatzoom exact renderedpitch/yaw",
    "mountainblockedzoom +repeatinput +reverse",
    "direct/keyboard mountainpanblocking and reverse",
    "manualyaw/pitch preserved",
    "cold/restoredcamera insidehill sameanglesafedistance",
    "terrainrevision invalidation/stationaryzeroqueries",
    "unchanged nativeV18mountainpan/zoom physicalclearance"
  ],
  "testPolicy": "Historical TerrainCameraClearance leaf remains unchanged and tested; one actualWorldView mountain expectation updated fromforcedrayvisibility tophysicalclearance+exactangle pernewuserrequest.",
  "preservation": [
    "No canonicalheldscene/game edits",
    "No terrain/camera inputhandler changes",
    "No art/worldgeneration/navigation/curd/NPC edits",
    "No build/browser or publication by thislane"
  ],
  "limits": [
    "Root must render/browsercheck frozencombined build beforepublication.",
    "No FPS/fullcampaign or98gatecredit.",
    "Camera collision is physicaleye/nearplane safety, not forcing target visibility throughterrain."
  ]
}
```
