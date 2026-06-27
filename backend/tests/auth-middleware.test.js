const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const store = require("../dataStore");
const auth = require("../middleware/auth");

test("auth middleware allows fallback users when MongoDB is unavailable", async () => {
  store.reset();

  const user = await store.createUser({
    name: "Auth User",
    username: "authuser",
    email: "auth@example.com",
    password: "secret123",
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "mini-instagram-secret", { expiresIn: "1h" });

  let nextCalled = false;
  const req = {
    header: (name) => (name === "Authorization" ? `Bearer ${token}` : undefined),
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {},
  };

  await auth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.userId, user.id);
  assert.equal(req.user.username, user.username);
});
