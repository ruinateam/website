import { AmbientLight, DirectionalLight, Mesh, Scene, SpotLight } from "three";

/** Three r156 compile() also visits non-renderable skinview groups with .material. */
export function galleryCompileScene(scene: Scene) {
  const compiled = new Scene();
  compiled.fog = scene.fog;
  scene.traverseVisible((object) => {
    if (
      object instanceof Mesh ||
      object instanceof AmbientLight ||
      object instanceof DirectionalLight ||
      object instanceof SpotLight
    )
      compiled.add(object.clone(false));
  });
  return compiled;
}
