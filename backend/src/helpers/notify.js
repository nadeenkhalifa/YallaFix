const pool = require('../db');

async function createNotification(userId, title, body, complaintId = null) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, complaint_id) VALUES ($1, $2, $3, $4)`,
      [userId, title, body, complaintId]
    );
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

async function logActivity(userId, action, entityType = null, entityId = null, details = null) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, details]
    );
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = { createNotification, logActivity };
