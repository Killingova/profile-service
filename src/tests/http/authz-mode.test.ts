import "../setup-env";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { buildApp } from "../../app";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "33333333-3333-4333-8333-333333333333";
const USER = "22222222-2222-4222-8222-222222222222";

let gatewayApp = buildApp({ authzMode: "gateway_headers" });
let jwtApp = buildApp({ authzMode: "service_jwt" });

before(async () => {
  await gatewayApp.ready();
  await jwtApp.ready();
});

after(async () => {
  await gatewayApp.close();
  await jwtApp.close();
});

test("gateway_headers mode blocks Authorization header", async () => {
  const response = await gatewayApp.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-tenant-id": TENANT_A,
      "x-user-id": USER,
      authorization: "Bearer any",
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "AUTH_CONTEXT_INVALID");
});

test("gateway_headers mode requires x-user-id", async () => {
  const response = await gatewayApp.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-tenant-id": TENANT_A,
    },
  });

  assert.equal(response.statusCode, 401);
  const body = response.json();
  assert.equal(body.error.code, "MISSING_AUTH");
});

test("service_jwt mode rejects x-user-id smuggling", async () => {
  const response = await jwtApp.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-tenant-id": TENANT_A,
      "x-user-id": USER,
    },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json();
  assert.equal(body.error.code, "AUTH_CONTEXT_INVALID");
});

test("service_jwt mode enforces tenant mismatch as 403", async () => {
  const token = jwt.sign(
    {
      sub: USER,
      tid: TENANT_A,
      typ: "access",
    },
    process.env.SERVICE_JWT_PUBLIC_OR_HS_SECRET!,
    {
      algorithm: "HS256",
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      expiresIn: "5m",
    },
  );

  const response = await jwtApp.inject({
    method: "GET",
    url: "/profiles/me",
    headers: {
      "x-tenant-id": TENANT_B,
      authorization: `Bearer ${token}`,
    },
  });

  assert.equal(response.statusCode, 403);
  const body = response.json();
  assert.equal(body.error.code, "TENANT_MISMATCH");
});
