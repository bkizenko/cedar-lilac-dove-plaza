# Hearthwild 3D wonder review

These original GLB models are static architectural blockouts for shape and scale review. They use metre units with Y up. The scene names, material groups and authored part names are embedded in each asset.

| Asset | Triangles | Material batches | Bytes |
| --- | ---: | ---: | ---: |
| ring-observatory.glb | 2,820 | 4 | 277,496 |
| crescent-harbor.glb | 2,256 | 5 | 222,628 |
| cascade-gardens.glb | 5,436 | 6 | 533,948 |

The preview shows the actual exported GLB meshes rendered with Three.js. The observatory has open arches and an interrupted entry ring. The harbor leaves its central basin empty for water and boats. The gardens use open arcades, planted terraces, a water spine and separate stair flights.

The GLBs passed header, scene, node, mesh and buffer checks and loaded in a desktop browser without errors. Future game integration needs terrain contacts, physical entrances, collision, construction phases, material cost, animation, texture atlases and distance detail levels. The current game continues to use its existing assets.

Recreate the models from the repository with `node scripts/art/export-wonder-blockouts.mjs`.
