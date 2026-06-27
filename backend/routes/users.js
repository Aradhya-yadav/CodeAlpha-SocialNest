const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const store = require("../dataStore");

router.get("/profile", auth, async (req, res) => {
  try {
    const user = await store.getUserProfile(req.userId);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const user = await store.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const { bio, profilePicture, name } = req.body;
    const user = await store.updateUser(req.userId, { bio, profilePicture, name });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/search/:query", async (req, res) => {
  try {
    const users = await store.searchUsers(req.params.query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;