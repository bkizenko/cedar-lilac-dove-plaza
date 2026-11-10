import * as THREE from "three";
import type { Game } from "../game/sim";
import type { HousingMaterials } from "../game/housingTypes";
export const HOUSING_PACKET_ART = { capacityPerKind: 512, groundOffset: 0.22 } as const;
/** Only authoritative finite reserved packets; no free building-stock props. */
export class HousingPacketLayer {
  private meshes: Record<keyof HousingMaterials, THREE.InstancedMesh>;
  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  constructor(scene: THREE.Scene) {
    this.meshes = {
      wood: new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.13, 0.13, 1, 5).rotateZ(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x806044, roughness: 1 }),
        HOUSING_PACKET_ART.capacityPerKind,
      ),
      stone: new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.3, 0),
        new THREE.MeshStandardMaterial({ color: 0x92918b, roughness: 1 }),
        HOUSING_PACKET_ART.capacityPerKind,
      ),
      plantFibre: new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.19, 0.13, 0.72, 7).rotateZ(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xb6a16b, roughness: 1 }),
        HOUSING_PACKET_ART.capacityPerKind,
      ),
    };
    for (const mesh of Object.values(this.meshes)) {
      mesh.count = 0;
      mesh.name = "actual-housing-packets";
      mesh.raycast = () => {};
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
  }
  sync(g: Game) {
    const counts = { wood: 0, stone: 0, plantFibre: 0 },
      draw = (materials: HousingMaterials, x: number, y: number, z: number) => {
        let slot = 0;
        for (const k of ["wood", "stone", "plantFibre"] as const) {
          if (materials[k] <= 0 || counts[k] >= HOUSING_PACKET_ART.capacityPerKind) continue;
          this.position.set(x + (slot++ - 0.5) * 0.3, y, z);
          this.scale.setScalar(0.65 + Math.min(1, materials[k] / 8) * 0.35);
          this.matrix.compose(this.position, this.rotation, this.scale);
          this.meshes[k].setMatrixAt(counts[k]++, this.matrix);
        }
      };
    for (const u of g.state.units) {
      if (u.hp <= 0 || u.shelterId || !u.housingCargo || (u.team !== 0 && !g.visibleAt(u.x, u.z)))
        continue;
      draw(
        u.housingCargo.materials,
        u.x - Math.sin(u.facing) * 0.45,
        u.y + 1.1,
        u.z - Math.cos(u.facing) * 0.45,
      );
    }
    for (const b of g.state.buildings) {
      const p = b.renovation;
      if (
        !p ||
        p.parcel.kind !== "ground" ||
        (b.team !== 0 && !g.visibleAt(p.parcel.x, p.parcel.z))
      )
        continue;
      draw(
        p.packet,
        p.parcel.x,
        g.height(p.parcel.x, p.parcel.z) + HOUSING_PACKET_ART.groundOffset,
        p.parcel.z,
      );
    }
    for (const mesh of Object.values(this.meshes)) {
      const k = (Object.keys(this.meshes) as (keyof HousingMaterials)[]).find(
        (k) => this.meshes[k] === mesh,
      )!;
      mesh.count = counts[k];
      mesh.visible = mesh.count > 0;
      if (mesh.count) mesh.instanceMatrix.needsUpdate = true;
    }
  }
  dispose() {
    for (const mesh of Object.values(this.meshes)) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
