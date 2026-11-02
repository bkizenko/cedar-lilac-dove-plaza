# Minimap terrain-cache integrated batch

Base:37d183e. **35/35 named integrated checks (100%)**, zero skips, typecheck and production build pass. Full acceptance remains **32/98 (32.65%)**, frozen hearthwild-first-release-gates-v1. No new whole gate is claimed.

The combined checks cover exact static terrain input validation, native/cached/fresh pixel equality, actual excavation geometry mutations, map coordinates/water/fog/camera, textile production, delayed import ownership and playback. Actual production browser imported the controlled native textile village using normal UI, reported a successful protected-checkpoint result, accepted minimap keyboard pan and Home, resumed at1x and paused again with a clean captured error console. Screenshot:screenshots/minimap-static-terrain-desktop.png. Browser FPS and large-village periodic spikes were not measured in this review.

Public native controlled callback timing showed terrain preparation1.937→0.305ms for unchanged ground, preserving exact pixels and full saved state. The display/fog/camps/camera still update at500ms. Exact input copies cost about2.1MiB at the maximum supported map. The historical48ms map peak was not reproduced, and this component improvement does not prove all buffering is fixed. Seasonal terrain repaint and vegetation LOD remain separate.
