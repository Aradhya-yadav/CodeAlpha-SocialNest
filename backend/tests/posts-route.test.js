const test = require("node:test");
const assert = require("node:assert/strict");
const postsRouter = require("../routes/posts");

test("feed route is registered before the dynamic post-id route", () => {
  const routePaths = postsRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  const feedIndex = routePaths.indexOf("/feed");
  const idIndex = routePaths.indexOf("/:id");

  assert.notEqual(feedIndex, -1, "feed route should be registered");
  assert.notEqual(idIndex, -1, "post-id route should be registered");
  assert.ok(feedIndex < idIndex, "feed route should be registered before the dynamic :id route");
});
