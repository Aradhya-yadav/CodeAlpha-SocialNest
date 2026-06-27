const express = require("express");
const path = require("path");
const connectDB = require("./db");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

// =====================
// MIDDLEWARE
// =====================
app.use(express.json({ limit: "10mb" }));

app.use(cors({
  origin: "*", // later replace with your Vercel URL for security
}));

// =====================
// DATABASE INIT
// =====================
const store = require("./dataStore");

async function init() {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    await store.ensureSeed();
    console.log("✅ Database seeded");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
}

// =====================
// API ROUTES
// =====================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/follows", require("./routes/follows"));

// =====================
// HEALTH CHECK ROUTE
// =====================
app.get("/", (req, res) => {
  res.json({
    message: " SocialNest Backend Running 🚀",
    status: "OK"
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;
// const API_URL = "http://localhost:5000/api";

init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});