import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { loadSkinWithFallback } from "../lib/team-skin";

test("skin source policy prefers remote, falls back on failure and reports both failures", async () => {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? "");
    response.statusCode = request.url === "/missing" ? 503 : 200;
    response.end(request.url === "/remote" ? "official" : "snapshot");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const load = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  };
  try {
    assert.equal(
      await loadSkinWithFallback({ remote: `${base}/remote`, local: `${base}/local` }, load),
      "official",
    );
    assert.deepEqual(requests.splice(0), ["/remote"]);
    assert.equal(
      await loadSkinWithFallback({ remote: `${base}/missing`, local: `${base}/local` }, load),
      "snapshot",
    );
    assert.deepEqual(requests.splice(0), ["/missing", "/local"]);
    await assert.rejects(
      loadSkinWithFallback({ remote: `${base}/missing`, local: `${base}/missing` }, load),
      AggregateError,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
