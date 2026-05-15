const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../db");
const { storeResetToken, verifyResetToken, deleteResetToken } = require("../middleware/passwordResetStore");

const router = express.Router();

// POST /forgotPassword
// Request password reset
router.post("/forgotPassword", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (!result.rows[0]) {
      return res.json({ message: "If the email exists, a reset token has been generated" });
    }

    const resetToken = crypto.randomBytes(24).toString("hex");
    storeResetToken(result.rows[0].id, resetToken);

    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      message: "Password reset token generated",
      resetToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to request password reset" });
  }
});

// POST /resetPassword
// Reset password with token
router.post("/resetPassword", async (req, res) => {
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
      "UPDATE users SET password = $1 WHERE id = $2",
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