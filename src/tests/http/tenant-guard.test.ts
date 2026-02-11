import "../setup-env";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../../app";

const TENANT = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

let app = buildApp({ authzMode: "gateway_headers" });

before(async () => {
  await app.ready();
});

after(async () => {
  await app.close();
});

test("missing tenant header returns 400 VALIDATION_FAILED", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-user-id": USER,
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "VALIDATION_FAILED");
});

test("invalid tenant header returns 400 VALIDATION_FAILED", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-tenant-id": "not-a-uuid",
      "x-user-id": USER,
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "VALIDATION_FAILED");
});

test("duplicate tenant header format is rejected", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-tenant-id": `${TENANT},${TENANT}`,
      "x-user-id": USER,
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "VALIDATION_FAILED");
});
