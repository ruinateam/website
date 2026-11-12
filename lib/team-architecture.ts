import { Group, Mesh } from "three";
import type { BufferGeometry, Material } from "three";
import { GALLERY_CENTERS } from "./team-cinema";
import { GALLERY_FLOOR, purpurBox, purpurSlab } from "./team-purpur";

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
  geometries.set("slab", purpurSlab());
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
    block(room, ...GALLERY_FLOOR.surface.center, ...GALLERY_FLOOR.surface.size, surfaces.shadow);
    if (index === 0) {
      pillar(room, -18, -12, 6);
      pillar(room, 18, -13, 24);
    } else if (index === 1) {
      pillar(room, -18, -13, 27);
      pillar(room, 18, -11, 6);
    } else {
      pillar(room, -17, -14, 18);
      pillar(room, 18, -12, 6);
      block(room, -3, 1.5, 1, 12, 3, 12, surfaces.shadow);
    }
  });
  return { root, geometries: new Set(geometries.values()) };
}
