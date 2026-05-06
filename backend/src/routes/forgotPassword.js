const express = require("express");
const crypto = require("crypto");
const pool = require("../db");
const { storeResetToken } = require("../middleware/passwordResetStore");

const router = express.Router();

router.post("/", async (req, res) => {
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

module.exports = router;
