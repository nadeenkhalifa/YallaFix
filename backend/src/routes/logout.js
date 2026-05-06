const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { addBlacklistedToken } = require("../middleware/tokenBlacklist");

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  addBlacklistedToken(token);
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
