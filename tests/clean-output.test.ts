import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/clean-output.ts", import.meta.url));

function runCleanup(root: string) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
}

test("cleanup removes only build output and can run twice", async () => {
  const root = await mkdtemp(join(tmpdir(), "ruina-clean-"));
  try {
    for (const directory of ["dist", ".output", ".cache/nuxt", ".nuxt", "public"])
      await mkdir(join(root, directory), { recursive: true });
    await writeFile(join(root, "public", "keep.txt"), "source asset");
    await writeFile(join(root, ".cache", "keep.txt"), "other cache");
    assert.equal(runCleanup(root).status, 0);
    assert.equal(runCleanup(root).status, 0);
    assert.deepEqual((await readdir(root)).sort(), [".cache", "public"]);
    assert.equal(await readFile(join(root, "public", "keep.txt"), "utf8"), "source asset");
    assert.equal(await readFile(join(root, ".cache", "keep.txt"), "utf8"), "other cache");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleanup reports an invalid cache path instead of claiming success", async () => {
  const root = await mkdtemp(join(tmpdir(), "ruina-clean-"));
  try {
    await writeFile(join(root, ".cache"), "not a directory");
    const result = runCleanup(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ENOTDIR/);
    assert.match(result.stderr, /\.cache/);
    assert.equal(await readFile(join(root, ".cache"), "utf8"), "not a directory");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleanup unlinks output symlinks without deleting their source", async () => {
  const root = await mkdtemp(join(tmpdir(), "ruina-clean-"));
  try {
    const source = join(root, "source");
    await mkdir(source);
    await writeFile(join(source, "keep.txt"), "original");
    await symlink(source, join(root, "dist"), "junction");
    assert.equal(runCleanup(root).status, 0);
    assert.equal(await readFile(join(source, "keep.txt"), "utf8"), "original");
    assert.deepEqual(await readdir(root), ["source"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
