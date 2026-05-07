const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../db");
const { validRoles } = require("../middleware/requireRole");

const router = express.Router();

// POST register
// Register a new user
router.post("/", async (req, res) => {
  const { email, password, name, role } = req.body;
  const normalizedRole = role || "reporter";

  // Validate input
  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password, and name are required" });
  }

  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, name, role`,
      [email, hashedPassword, name, normalizedRole]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

module.exports = router;
