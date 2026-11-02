# Stable release storage correction

The4f54bb0 rollout encountered ENOSPC while retaining an older lazily loaded asset. The current pointer stayed on9dba399 and its health endpoint remained live. Saves and source files were not changed by the failed promotion.

The disk initially had only173MiB available. Generated immutable release outputs occupied20GiB because every promotion copied the accumulated historical assets. Byte-and-permission-identical files were consolidated across141 generated release folders using hard links:36,111 duplicate files and20,709,584,014 logical bytes reclaimed. Every release path and file content remains available; no release, village/save or source was deleted. Available filesystem space rose to about20GiB.

The4f54bb0 output was checked against its fresh build, the incomplete historical asset was corrected, and452 old assets were retained via links before atomic promotion. The health endpoint now confirms4f54bb0. CPU benchmark measurements in the preceding batch were completed before this storage correction; no browser-speed improvement from disk recovery is asserted.

The normal publisher now calls retainReleaseAssets for old graphics, music and licenses. It shares immutable old files without overwriting any fresh build file. Cross-device/unsupported-link cases fall back to exclusive copies; other failures propagate before pointer promotion. Existing old pages can still request their lazy assets. Fresh build outputs remain independent of mutable build directories.

Three checks pass: nested asset/audio/license retention with identical inodes and no save copying; fresh-name precedence and no-predecessor publishing; the actual publish command in an isolated temporary project, including complete promotion and old audio retention. This script-only follow-up does not change runtime source or require a new game build. Overall remains24/98=24.49%, baseline hearthwild-first-release-gates-v1; goal scope remains open.
