import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import type deepmerge from "deepmerge";

const require = createRequire(import.meta.url);

for (const entry of ["deepmerge", "deepmerge/dist/umd.js"]) {
  const merge: typeof deepmerge = require(entry);

  test(`${entry} does not copy __proto__ from either merge operand`, () => {
    const payload = JSON.parse('{"__proto__":{"isAdmin":true},"safe":1}');
    for (const [target, source] of [
      [payload, {}],
      [Object.create(null), payload],
      [payload, payload],
    ]) {
      const result = merge<Record<string, unknown>>(target, source);
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(result.isAdmin, undefined);
      assert.equal(Object.hasOwn(result, "__proto__"), false);
      assert.equal(result.safe, 1);
    }
  });

  test(`${entry} filters nested prototype keys while preserving arrays and symbols`, () => {
    const symbol = Symbol("metadata");
    const result = merge(
      { nested: JSON.parse('{"__proto__":{"isAdmin":true},"left":1}'), items: [1] },
      { nested: { right: 2 }, items: [2], [symbol]: "kept" },
    );
    assert.equal(Object.getPrototypeOf(result.nested), Object.prototype);
    assert.deepEqual(result.nested, { left: 1, right: 2 });
    assert.deepEqual(result.items, [1, 2]);
    assert.equal(Reflect.get(result, symbol), "kept");
  });
}
