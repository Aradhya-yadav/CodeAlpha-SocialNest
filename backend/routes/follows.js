const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const store = require("../dataStore");

// Follow a user
router.post("/:userId/follow", auth, async (req, res) => {
  try {
    const userToFollow = await store.getUserById(req.params.userId);
    const currentUser = await store.getUserById(req.userId);

    if (!userToFollow) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.userId === req.params.userId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    const alreadyFollowing = (currentUser.following || []).some((id) => id.toString() === req.params.userId);
    if (alreadyFollowing) {
      return res.status(400).json({ message: "You are already following this user" });
    }

    const updated = await store.followUser(req.userId, req.params.userId);
    const targetUser = updated?.targetUser || userToFollow;

    res.json({
      message: "Successfully followed user",
      user: {
        id: targetUser.id || targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        profilePicture: targetUser.profilePicture,
        followers: targetUser.followers?.length || 0,
        following: targetUser.following?.length || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Unfollow a user
router.post("/:userId/unfollow", auth, async (req, res) => {
  try {
    const userToUnfollow = await store.getUserById(req.params.userId);
    const currentUser = await store.getUserById(req.userId);

    if (!userToUnfollow) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = (currentUser.following || []).some((id) => id.toString() === req.params.userId);
    if (!isFollowing) {
      return res.status(400).json({ message: "You are not following this user" });
    }

    const updated = await store.unfollowUser(req.userId, req.params.userId);
    const targetUser = updated?.targetUser || userToUnfollow;

    res.json({
      message: "Successfully unfollowed user",
      user: {
        id: targetUser.id || targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        profilePicture: targetUser.profilePicture,
        followers: targetUser.followers?.length || 0,
        following: targetUser.following?.length || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Check if following
router.get("/check/:userId", auth, async (req, res) => {
  try {
    const currentUser = await store.getUserById(req.userId);
    const isFollowing = (currentUser.following || []).some((id) => id.toString() === req.params.userId);

    res.json({ isFollowing });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;