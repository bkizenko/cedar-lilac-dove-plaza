# Fresh world sequence and coastline recheck — 2026-11-02

Fresh games now consume a persisted permutation of the 32-bit seed space rather than unchecked random draws. Sequential allocations cannot collide before exhaustion. A reload continues the sequence; blocked writes retain an in-memory cursor. Explicit seeds retain signed integer normalization and reproduce old worlds; save reconstruction does not consume a new seed.

The uniqueness guarantee covers the allocator in one sequential browser profile, not storage deletion, concurrent tabs or different profiles. It does not imply that every possible terrain is perceptually unique. V15 coastline rejection remains .045 normalized radial RMS across rotations/reflections and rescaling. Stronger perceptual variation and broad campaign inspection remain open.

17/17 automated checks pass: seven allocator cases, two actual Game reset/save cases, and eight existing V15 geography/coastline cases (including 120 layout variants). Build and typecheck pass. No generation algorithm changed, preserving existing V15 terrain bytes.

Browser QA generated two Standard Archipelago worlds: seeds 312452992 and -1935090127. They differed in island count and terrain composition; eight biome regions and actual lakes/rivers remained present. Desktop render checked at 1440×900 with no console errors. The original QA village returned with 800 food, 36 wood and 14 stone after leaving testing. User's live browser village was not manipulated.

QA also found Test lab opened a blank panel because its menu button skipped startTestSession. The button now creates the protected test copy before opening, and aborts opening if saving the original fails. Actual new-world generation and return were exercised through these controls.

Full first-release acceptance remains 24/98 (24.49%), hearthwild-first-release-gates-v1. This batch does not close a broader campaign gate.
