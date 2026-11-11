import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compileStyle, parse } from "vue/compiler-sfc";

test("ready-state fallback CSS never hides the shared gallery stage", () => {
  const filename = new URL("../components/team/MemberScene.vue", import.meta.url);
  const { descriptor } = parse(readFileSync(filename, "utf8"));
  const style = descriptor.styles.find((entry) => entry.scoped);
  assert.ok(style);
  const compiled = compileStyle({
    source: style.content,
    filename: filename.pathname,
    id: "data-v-test",
    scoped: true,
  });
  assert.equal(compiled.errors.length, 0);
  assert.doesNotMatch(compiled.code, /\.team-stage:has\([^{}]+\)\s*\{\s*display:\s*none/);
  assert.match(compiled.code, /\.member-scene__fallback\s*\{\s*display:\s*none/);
});
