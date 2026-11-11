import { Mesh, Triangle, Vector2, Vector3 } from "three";
import type { Object3D } from "three";

type Face = { mesh: Mesh; points: Vector2[] };

/** SAT on convex projected triangles; touching edges have zero area and are valid joints. */
function overlap(a: Vector2[], b: Vector2[]) {
  for (const triangle of [a, b])
    for (let edge = 0; edge < 3; edge++) {
      const start = triangle[edge]!;
      const end = triangle[(edge + 1) % 3]!;
      const axis = new Vector2(-(end.y - start.y), end.x - start.x).normalize();
      const projectA = a.map((point) => point.dot(axis));
      const projectB = b.map((point) => point.dot(axis));
      if (
        Math.min(Math.max(...projectA), Math.max(...projectB)) -
          Math.max(Math.min(...projectA), Math.min(...projectB)) <=
        0.00001
      )
        return false;
    }
  return true;
}

/** Find actual same-facing coplanar triangle intersections, including rotated parent groups. */
export function coplanarSurfaces(root: Object3D) {
  root.updateMatrixWorld(true);
  const planes = new Map<string, Face[]>();
  root.traverse((mesh) => {
    if (!(mesh instanceof Mesh)) return;
    const positions = mesh.geometry.getAttribute("position");
    const indices = mesh.geometry.getIndex();
    const count = indices?.count ?? positions.count;
    for (let index = 0; index < count; index += 3) {
      const vertices = [0, 1, 2].map((offset) =>
        new Vector3()
          .fromBufferAttribute(positions, indices ? indices.getX(index + offset) : index + offset)
          .applyMatrix4(mesh.matrixWorld),
      );
      const normal = new Triangle(vertices[0]!, vertices[1]!, vertices[2]!).getNormal(
        new Vector3(),
      );
      if (normal.lengthSq() < 0.5) continue;
      const distance = normal.dot(vertices[0]!);
      const key = [...normal.toArray(), distance].map((n) => Math.round(n * 100000)).join(":");
      const absolute = normal.toArray().map(Math.abs);
      const drop = absolute.indexOf(Math.max(...absolute));
      const points = vertices.map(
        (p) => new Vector2(p.getComponent((drop + 1) % 3), p.getComponent((drop + 2) % 3)),
      );
      const bucket = planes.get(key) ?? [];
      bucket.push({ mesh, points });
      planes.set(key, bucket);
    }
  });
  const collisions = new Set<string>();
  for (const faces of planes.values()) {
    for (let a = 0; a < faces.length; a++)
      for (let b = a + 1; b < faces.length; b++) {
        const first = faces[a]!;
        const second = faces[b]!;
        if (first.mesh === second.mesh || !overlap(first.points, second.points)) continue;
        collisions.add([first.mesh.name, second.mesh.name].sort().join(" ↔ "));
      }
  }
  return [...collisions].sort();
}
