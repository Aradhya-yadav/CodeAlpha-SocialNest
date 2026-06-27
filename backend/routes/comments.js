const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { body, validationResult } = require("express-validator");
const store = require("../dataStore");

// Create a comment
router.post(
  "/",
  auth,
  [
    body("post").not().isEmpty().withMessage("Post ID is required"),
    body("text")
      .not()
      .isEmpty()
      .withMessage("Comment text is required")
      .trim()
      .isLength({ max: 300 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { post, text } = req.body;
      const existingPost = await store.getPostById(post);
      if (!existingPost) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = await store.addComment(post, req.userId, text);
      res.status(201).json(comment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete a comment
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await store.deleteComment(req.params.id, req.userId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error(error);
    if (error.message === "Unauthorized") {
      return res.status(403).json({ message: "You can only delete your own comments." });
    }
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;