export interface SkinSource {
  remote: string;
  local: string;
}

export async function loadSkinWithFallback<T>(
  source: SkinSource,
  load: (url: string) => Promise<T>,
): Promise<T> {
  try {
    return await load(source.remote);
  } catch (remoteError) {
    try {
      return await load(source.local);
    } catch (localError) {
      throw new AggregateError([remoteError, localError], "Neither skin source could be loaded");
    }
  }
}

const SKIN_LOAD_TIMEOUT_MS = 1500;

function decodeSkinImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) {
        image.src = "";
        reject(error);
      } else resolve(image);
    };
    const timer = window.setTimeout(
      () => finish(new Error(`Skin request timed out: ${url}`)),
      SKIN_LOAD_TIMEOUT_MS,
    );
    image.onerror = () => finish(new Error(`Skin image failed to load: ${url}`));
    image.onload = async () => {
      try {
        await image.decode();
        if (image.naturalWidth !== 64 || ![32, 64].includes(image.naturalHeight))
          throw new Error(`Invalid Minecraft skin dimensions: ${url}`);
        finish();
      } catch {
        finish(new Error(`Skin image failed to decode: ${url}`));
      }
    };
    image.src = url;
  });
}

export function loadSkinImage(source: SkinSource) {
  return loadSkinWithFallback(source, decodeSkinImage);
}
