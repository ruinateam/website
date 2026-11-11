import { randomUUID } from "node:crypto";
import { rename, rm } from "node:fs/promises";
import { join } from "node:path";

const outputDirectories = ["dist", ".output", ".cache/nuxt", ".nuxt"];
const lockedFileCodes = new Set(["EBUSY", "EPERM", "EACCES"]);

function fileErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return;
  return typeof error.code === "string" ? error.code : undefined;
}

/** Rename first to release the build path; fall back to direct removal on Windows locks. */
async function removeOutputDirectory(directory: string) {
  const renamedDirectory = `${directory}__old_${randomUUID()}`;
  let removalPath = renamedDirectory;
  try {
    await rename(directory, renamedDirectory);
  } catch (error) {
    const code = fileErrorCode(error);
    if (code === "ENOENT") return;
    if (!code || !lockedFileCodes.has(code)) throw error;
    removalPath = directory;
  }

  await rm(removalPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
}

async function main() {
  for (const directory of outputDirectories) {
    try {
      await removeOutputDirectory(join(process.cwd(), directory));
    } catch (error) {
      throw new Error(`Cannot clean build output "${directory}"`, { cause: error });
    }
  }
}

main().catch((error: unknown) => {
  console.error("[clean] failed:", error);
  process.exitCode = 1;
});
