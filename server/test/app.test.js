const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../src/app");

let server;
let baseUrl;

before(async () => {
    await new Promise((resolve) => {
        server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
    });
});

test("root endpoint reports that the finance API is running", async () => {
    const response = await fetch(baseUrl);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        message: "Welcome to the AI Personal Finance Coach API!"
    });
});

test("finance endpoints require a bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/expense`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { detail: "Not authenticated" });
});

test("invalid bearer tokens are rejected without querying user data", async () => {
    const response = await fetch(`${baseUrl}/api/expense`, {
        headers: { authorization: "Bearer invalid-token" }
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { detail: "Could not validate credentials" });
});

test("invalid authentication input returns a validation error", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" })
    });
    const body = await response.json();
    assert.equal(response.status, 422);
    assert.ok(Array.isArray(body.detail));
});

test("unknown endpoints return a JSON 404", async () => {
    const response = await fetch(`${baseUrl}/not-a-route`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { detail: "Not Found" });
});
