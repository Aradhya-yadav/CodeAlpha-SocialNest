const test = require("node:test");
const assert = require("node:assert/strict");
const store = require("../dataStore");

test("creates users and posts in the in-memory store", async () => {
  store.reset();

  const user = await store.createUser({
    name: "Test User",
    username: "testuser",
    email: "test@example.com",
    password: "secret123",
    bio: "Hello",
    profilePicture: "https://example.com/pic.jpg",
  });

  assert.equal(user.username, "testuser");
  assert.notEqual(user.password, "secret123");

  const post = await store.createPost({
    author: user.id,
    image: "https://example.com/post.jpg",
    caption: "First post",
  });

  assert.equal(post.caption, "First post");

  const feed = await store.getFeedPosts();
  assert.equal(feed.length, 1);
  assert.equal(feed[0].caption, "First post");
});
