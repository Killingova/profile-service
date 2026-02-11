import "../setup-env";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../../app";

let app = buildApp({ authzMode: "gateway_headers" });

before(async () => {
  await app.ready();
});

after(async () => {
  await app.close();
});

test("not found returns stable json envelope", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/does-not-exist",
  });

  assert.equal(response.statusCode, 404);
  const body = response.json();
  assert.equal(body.status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
  assert.equal(typeof body.request_id, "string");
});

test("health live works without tenant/auth", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/health/live",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, "alive");
});
