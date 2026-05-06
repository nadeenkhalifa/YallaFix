const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

// GET /notifications
// Get all notifications for the user
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, title, message, type, related_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// PATCH /notifications/mark-all/read
// Mark all notifications as read (must come before /:id route)
router.patch("/mark-all/read", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true, updated_at = NOW()
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [req.user.id]
    );

    res.json({ updated: result.rows.length, notifications: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// PATCH /notifications/:id/read
// Mark notification as read
router.patch("/:id/read", async (req, res) => {
  const notificationId = req.params.id;

  try {
    // Verify notification belongs to user
    const notificationCheck = await pool.query(
      "SELECT id FROM notifications WHERE id = $1 AND user_id = $2",
      [notificationId, req.user.id]
    );
    if (!notificationCheck.rows[0]) {
      return res.status(404).json({ error: "Notification not found" });
    }

    // Mark as read
    const result = await pool.query(
      `UPDATE notifications SET is_read = true, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

module.exports = router;
