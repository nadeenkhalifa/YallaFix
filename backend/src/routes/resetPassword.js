const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const { verifyResetToken, deleteResetToken } = require("../middleware/passwordResetStore");

const router = express.Router();

router.post("/", async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: "email, token, and newPassword are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const userId = verifyResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const result = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND email = $2",
      [userId, email]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: "Invalid reset request" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    deleteResetToken(token);

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

module.exports = router;
