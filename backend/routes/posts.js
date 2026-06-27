const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const store = require("../dataStore");

// Create a new post
router.post(
  "/",
  auth,
  [
    body("image").not().isEmpty().withMessage("Image URL is required"),
    body("caption").optional({ nullable: true }).trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { image, caption, mood } = req.body;
      const post = await store.createPost({
        author: req.userId,
        image,
        caption: caption || "",
        mood: mood || "",
      });

      res.status(201).json(post);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Get all posts (feed)
router.get("/", async (req, res) => {
  try {
    const posts = await store.getFeedPosts();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get feed of followed users
router.get("/feed", auth, async (req, res) => {
  try {
    const user = await store.getUserById(req.userId);

    if (!user || (user.following || []).length === 0) {
      const posts = await store.getFeedPosts();
      return res.json(posts);
    }

    const posts = await store.getFeedPosts();
    const filteredPosts = posts.filter((post) => (user.following || []).some((followingId) => followingId.toString() === (post.author?.id || post.author)?.toString()));

    res.json(filteredPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get posts by user
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await store.getPostsByUser(req.params.userId);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get single post
router.get("/:id", async (req, res) => {
  try {
    const post = await store.getPostById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Like a post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await store.toggleLike(req.params.id, req.userId, true);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Unlike a post
router.post("/:id/unlike", auth, async (req, res) => {
  try {
    const post = await store.toggleLike(req.params.id, req.userId, false);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a post
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await store.getPostById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.author?.id?.toString() !== req.userId && post.author?.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await store.deletePost(req.params.id);

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;