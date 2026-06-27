const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const store = require("../dataStore");

const JWT_SECRET = process.env.JWT_SECRET || "mini-instagram-secret";

// Register new user
router.post(
  "/register",
  [
    body("name").not().isEmpty().withMessage("Name is required"),
    body("username").not().isEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, username, email, password, bio, profilePicture } = req.body;

      const existingUser = await store.findUserByEmailOrUsername(email, username);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email or username already exists" });
      }

      const user = await store.createUser({
        name,
        username,
        email,
        password,
        bio: bio || "",
        profilePicture: profilePicture || "https://via.placeholder.com/150",
      });

      const userId = user.id || user._id;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: userId,
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
          followers: user.followers?.length || 0,
          following: user.following?.length || 0,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error during registration" });
    }
  }
);

// Login user
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").not().isEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await store.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isMatch = user.comparePassword
        ? await user.comparePassword(password)
        : password === user.password;
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const userId = user.id || user._id;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: userId,
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
          profilePicture: user.profilePicture,
          followers: user.followers?.length || 0,
          following: user.following?.length || 0,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error during login" });
    }
  }
);

module.exports = router;