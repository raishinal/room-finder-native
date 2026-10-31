import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, dependencies = {}, globals = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (!(name in dependencies))
        throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return exports;
}
function client() {
  const storage = new Map();
  let respond;
  let request;
  const api = loadModule(
    "../src/lib/api.ts",
    {
      "react-native": { Platform: { OS: "ios" } },
      "expo-secure-store": {
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device",
        getItemAsync: async (key) => storage.get(key),
        setItemAsync: async (key, value) => storage.set(key, value),
        deleteItemAsync: async (key) => storage.delete(key),
      },
    },
    {
      process: { env: { EXPO_PUBLIC_APP_ENV: "production" } },
      AbortController,
      FormData,
      setTimeout,
      clearTimeout,
      fetch: async (url, options) => {
        request = { url, ...options };
        return respond(url, options);
      },
    },
  );
  return {
    api,
    storage,
    response: (fn) => {
      respond = fn;
    },
    request: () => request,
  };
}
test("native token is kept in OS storage and attached as a Sanctum bearer header", async () => {
  const c = client();
  await c.api.saveToken("test-token");
  c.response(async () => ({
    ok: true,
    json: async () => ({ data: { id: 1 } }),
  }));
  await c.api.api("/user");
  assert.equal(
    c.request().url,
    "https://room-finder.roshanlama.com.np/api/v1/user",
  );
  assert.equal(c.request().headers.Authorization, "Bearer test-token");
  assert.equal(c.storage.size, 1);
  await c.api.saveToken(null);
  assert.equal(c.storage.size, 0);
});
test("revoked token clears storage and notifies the session", async () => {
  const c = client();
  let expired = false;
  await c.api.saveToken("revoked");
  c.api.onExpired(() => {
    expired = true;
  });
  c.response(async () => ({
    ok: false,
    status: 401,
    json: async () => ({ message: "Unauthenticated." }),
  }));
  await assert.rejects(c.api.api("/user"), (error) => error.status === 401);
  assert.equal(c.storage.size, 0);
  assert.equal(expired, true);
});
test("422 field errors survive while transport failures keep the credential", async () => {
  const c = client();
  await c.api.saveToken("valid");
  c.response(async () => ({
    ok: false,
    status: 422,
    json: async () => ({
      message: "Invalid dates.",
      errors: { starts_on: ["Unavailable."] },
    }),
  }));
  await assert.rejects(
    c.api.api("/finder/listings/1/requests", "POST", { people: 2 }),
    (error) =>
      error.status === 422 && error.errors.starts_on[0] === "Unavailable.",
  );
  c.response(async () => {
    throw new Error("Offline");
  });
  await assert.rejects(
    c.api.api("/user"),
    (error) => error.status === 0 && error.message.includes("connection"),
  );
  assert.equal(c.storage.size, 1);
});
test("multipart requests leave boundary generation to fetch", async () => {
  const c = client();
  c.response(async () => ({ ok: true, json: async () => ({ data: {} }) }));
  const form = new FormData();
  form.append("name", "Courtyard");
  await c.api.api("/owner/properties", "POST", form);
  assert.equal(c.request().headers["Content-Type"], undefined);
  assert.equal(c.request().body, form);
});
test("query encoding retains falsey numeric values and escapes search text", () => {
  const c = client();
  assert.equal(
    c.api.query({ search: "Patan & garden", max_price: 0, page: 2, mode: "" }),
    "?search=Patan%20%26%20garden&max_price=0&page=2",
  );
});
test("privileged roles never imply owner/finder access; dashboard precedence matches reference", () => {
  const rules = loadModule("../src/lib/workflows.ts");
  assert.equal(rules.canAccess({ roles: ["admin"] }, "owner"), false);
  assert.equal(rules.canAccess({ roles: ["superadmin"] }, "finder"), false);
  assert.equal(rules.canAccess({ roles: ["admin", "owner"] }, "owner"), true);
  assert.equal(rules.homeWorkspace({ roles: ["finder", "owner"] }), "owner");
  assert.equal(
    rules.homeWorkspace({ roles: ["finder", "owner", "admin"] }),
    "admin",
  );
});
test("booking controls respect actor, arrival cutoff, and departure completion", () => {
  const { activityActions } = loadModule("../src/lib/workflows.ts");
  const booking = {
    kind: "bookings",
    status: "pending",
    starts_on: "2030-01-10",
    ends_on: "2030-01-12",
  };
  const states = (record, owner, today) =>
    Array.from(activityActions(record, owner, today), ([status]) => status);
  assert.deepEqual(states(booking, true, "2030-01-01"), [
    "confirmed",
    "rejected",
    "cancelled",
  ]);
  assert.deepEqual(states(booking, false, "2030-01-01"), ["cancelled"]);
  assert.deepEqual(states(booking, false, "2030-01-10"), []);
  assert.deepEqual(
    states({ ...booking, status: "confirmed" }, true, "2030-01-12"),
    ["completed"],
  );
});
test("only finders accept tenancy offers; only owners end active tenancies", () => {
  const { activityActions } = loadModule("../src/lib/workflows.ts");
  assert.equal(
    activityActions(
      { kind: "tenancies", status: "offered" },
      true,
      "2030-01-01",
    ).length,
    0,
  );
  assert.equal(
    activityActions(
      { kind: "tenancies", status: "offered" },
      false,
      "2030-01-01",
    )[0][0],
    "active",
  );
  assert.equal(
    activityActions(
      { kind: "tenancies", status: "active" },
      true,
      "2030-01-01",
    )[0][0],
    "ended",
  );
  assert.equal(
    activityActions(
      { kind: "tenancies", status: "active" },
      false,
      "2030-01-01",
    ).length,
    0,
  );
});
