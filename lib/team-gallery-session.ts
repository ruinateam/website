import { createTeamGallery } from "./team-gallery";
import type { SkinSource } from "./team-skin";

type Session = {
  canvas: HTMLCanvasElement;
  gallery: Awaited<ReturnType<typeof createTeamGallery>>;
};
let session: Promise<Session> | undefined;
let notify: (() => void) | undefined;

/** One suspended WebGL session per tab, not one renderer per route visit. */
export async function acquireTeamGallery(skins: SkinSource[], invalidate: () => void) {
  notify = invalidate;
  if (!session) {
    const canvas = document.createElement("canvas");
    session = createTeamGallery(canvas, skins, () => notify?.())
      .then((gallery) => {
        const discard = () => {
          canvas.removeEventListener("webglcontextlost", discard);
          window.removeEventListener("pagehide", onPageHide);
          gallery.dispose();
          session = undefined;
        };
        const onPageHide = (event: PageTransitionEvent) => {
          if (!event.persisted) discard();
        };
        canvas.addEventListener("webglcontextlost", discard);
        window.addEventListener("pagehide", onPageHide);
        return { canvas, gallery };
      })
      .catch((error: unknown) => {
        session = undefined;
        throw error;
      });
  }
  const current = await session;
  return {
    ...current,
    release() {
      if (notify !== invalidate) return;
      notify = undefined;
      current.canvas.remove();
    },
  };
}
