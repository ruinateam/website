import { Group, Mesh } from "three";
import type { BufferGeometry, Material } from "three";
import { GALLERY_CENTERS } from "./team-cinema";
import { GALLERY_FLOOR, purpurBox, purpurSlab, purpurStairs } from "./team-purpur";

interface ArchitectureSurfaces {
  block: Material;
  cap: Material;
  shadow: Material;
  column: Material[];
}

/** Renderer-independent assembly: the exact production geometry is also audited in tests. */
export function createPurpurArchitecture(surfaces: ArchitectureSurfaces) {
  const root = new Group();
  root.name = "Purpur gallery";
  const geometries = new Map<string, BufferGeometry>();
  const stairGeometry = purpurStairs();
  geometries.set("slab", purpurSlab());
  geometries.set("stairs", stairGeometry);
  const block = (
    parent: Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    surface: Material | Material[] = surfaces.block,
  ) => {
    const key = `${w}:${h}:${d}`;
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = w === 6 && h === 3 && d === 6 ? geometries.get("slab")! : purpurBox(w, h, d);
      geometries.set(key, geometry);
    }
    const mesh = new Mesh(geometry, surface);
    mesh.name = `${parent.name}/block(${x},${y},${z};${w},${h},${d})`;
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const pillar = (parent: Group, x: number, z: number, height: number, lean = 0) => {
    const group = new Group();
    group.name = `${parent.name}/pillar(${x},${z})`;
    group.position.set(x, 0, z);
    group.rotation.z = lean;
    block(group, 0, 1.5, 0, 9, 3, 9, surfaces.cap);
    block(group, 0, (height + 3) / 2, 0, 6, height - 3, 6, surfaces.column);
    block(group, 0, height + 1.5, 0, 9, 3, 9, surfaces.cap);
    parent.add(group);
  };
  const stairs = (parent: Group, x: number, z: number, count: number) => {
    for (let step = 0; step < count; step++) {
      const mesh = new Mesh(stairGeometry, step % 2 ? surfaces.block : surfaces.cap);
      mesh.name = `${parent.name}/stairs(${x},${z})/${step}`;
      mesh.position.set(x + step * 6, 3 + step * 6, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      if (step > 0) block(parent, mesh.position.x, step * 3, z, 6, step * 6, 6, surfaces.shadow);
    }
  };

  GALLERY_CENTERS.forEach((center, index) => {
    const room = new Group();
    room.name = `room-${index}`;
    room.position.x = center;
    root.add(room);
    block(
      room,
      ...GALLERY_FLOOR.foundation.center,
      ...GALLERY_FLOOR.foundation.size,
      surfaces.shadow,
    );
    block(room, ...GALLERY_FLOOR.surface.center, ...GALLERY_FLOOR.surface.size);
    for (let n = 0; n < 8; n++)
      block(
        room,
        -24 + n * 6,
        -1.5,
        18 + (n % 3 ? 0 : 3),
        6,
        3,
        6,
        n % 2 ? surfaces.shadow : surfaces.block,
      );
    if (index === 0) {
      pillar(room, -28, -14, 36);
      pillar(room, 28, -18, 42);
      pillar(room, -17, -18, 27, -0.32);
      block(room, -14.5, 3, -15, 15, 6, 6);
      stairs(room, 15, -8, 3);
      const lintel = block(room, -21, 10.5, -12, 6, 18, 6, surfaces.column);
      lintel.rotation.z = -Math.PI / 2 - 0.16;
    } else if (index === 1) {
      pillar(room, -27, -18, 42);
      pillar(room, 22, -18, 30, 0.17);
      const brokenArch = block(room, -12, 47.25, -18, 36, 6, 9, surfaces.cap);
      brokenArch.rotation.z = -0.08;
      block(room, 15, 29, -27, 12, 3, 9, surfaces.cap);
      stairs(room, 18, -12, 3);
      block(room, 22, 3, 18, 12, 6, 9);
    } else {
      pillar(room, -27, -20, 36, -0.19);
      pillar(room, 29, -24, 48);
      stairs(room, 12, -16, 4);
      block(room, -4, 1.5, 1, 18, 3, 18, surfaces.cap);
      const fallen = block(room, -20, 5, -10, 6, 18, 6, surfaces.column);
      fallen.rotation.z = -Math.PI / 2 - 0.25;
    }
    // Near-plane piers only sit on handoff boundaries, not on settled portrait sightlines.
    if (index < 2) pillar(room, 34, 23, index === 0 ? 33 : 24);
    block(room, -32, 1.5, 34, 12, 3, 12, surfaces.shadow);
  });
  return { root, geometries: new Set(geometries.values()) };
}
