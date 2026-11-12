import { createTeamGallery } from "./team-gallery";
import type { SkinSource } from "./team-skin";

type Session = {
  canvas: HTMLCanvasElement;
  gallery: Awaited<ReturnType<typeof createTeamGallery>>;
  dispose: () => void;
};
let session: Promise<Session> | undefined;
let notify: (() => void) | undefined;

/** HMR replaces the gallery modules; release the old context instead of stacking renderers. */
function discardActiveSession() {
  const current = session;
  session = undefined;
  notify = undefined;
  if (!current) return;
  void current
    .then(({ dispose }) => dispose())
    .catch((error: unknown) => {
      console.warn("Team gallery HMR cleanup failed", error);
    });
}

/** One suspended WebGL session per tab, not one renderer per route visit. */
export async function acquireTeamGallery(skins: SkinSource[], invalidate: () => void) {
  notify = invalidate;
  if (!session) {
    const canvas = document.createElement("canvas");
    const pending: Promise<Session> = createTeamGallery(canvas, skins, () => notify?.())
      .then((gallery) => {
        let disposed = false;
        const discard = () => {
          if (disposed) return;
          disposed = true;
          canvas.removeEventListener("webglcontextlost", discard);
          window.removeEventListener("pagehide", onPageHide);
          if (session === pending) {
            session = undefined;
            notify = undefined;
          }
          canvas.remove();
          gallery.dispose();
        };
        const onPageHide = (event: PageTransitionEvent) => {
          if (!event.persisted) discard();
        };
        canvas.addEventListener("webglcontextlost", discard);
        window.addEventListener("pagehide", onPageHide);
        return { canvas, gallery, dispose: discard };
      })
      .catch((error: unknown) => {
        if (session === pending) session = undefined;
        throw error;
      });
    session = pending;
  }
  const current = await session;
  return {
    canvas: current.canvas,
    gallery: current.gallery,
    release() {
      if (notify !== invalidate) return;
      notify = undefined;
      current.canvas.remove();
    },
  };
}

if (import.meta.hot) {
  // Own a hot boundary so Vite actually invokes dispose for this cached module.
  // Then remount the importing Vue component to acquire the fresh session.
  import.meta.hot.accept(() => import.meta.hot?.invalidate());
  import.meta.hot.dispose(discardActiveSession);
}
