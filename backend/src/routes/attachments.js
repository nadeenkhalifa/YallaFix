const express = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");
const path = require("path");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// POST (add attachment to a complaint)
router.post("/:complaintId", upload.single("file"), async (req, res) => {
  const complaintId = req.params.complaintId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "file is required" });
  }

  try {
    // Verify complaint exists and user has access
    const complaintCheck = await pool.query(
      "SELECT id FROM complaints WHERE id = $1 AND reporter_id = $2",
      [complaintId, req.user.id]
    );
    if (!complaintCheck.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Generate unique file path
    const ext = path.extname(file.originalname) || ".bin";
    const filePath = `${req.user.id}/${randomUUID()}${ext}`;

    // Store attachment metadata
    const result = await pool.query(
      `INSERT INTO attachments (complaint_id, file_path, file_name, file_size, mime_type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [complaintId, filePath, file.originalname, file.size, file.mimetype]
    );

    res.status(201).json({ attachment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
});

// Get all attachments for a complaint
router.get("/:complaintId", async (req, res) => {
  const complaintId = req.params.complaintId;

  try {
    // Verify complaint exists and user has access
    const complaintCheck = await pool.query(
      "SELECT id FROM complaints WHERE id = $1 AND reporter_id = $2",
      [complaintId, req.user.id]
    );
    if (!complaintCheck.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Get attachments
    const result = await pool.query(
      `SELECT id, file_path, file_name, file_size, mime_type, created_at
       FROM attachments WHERE complaint_id = $1
       ORDER BY created_at DESC`,
      [complaintId]
    );

    res.json({ attachments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// Delete an attachment
router.delete("/:id", async (req, res) => {
  const attachmentId = req.params.id;

  try {
    // Get attachment and verify user has access via complaint
    const attachmentCheck = await pool.query(
      `SELECT a.id, a.complaint_id FROM attachments a
       JOIN complaints c ON a.complaint_id = c.id
       WHERE a.id = $1 AND c.reporter_id = $2`,
      [attachmentId, req.user.id]
    );
    if (!attachmentCheck.rows[0]) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Delete attachment
    await pool.query("DELETE FROM attachments WHERE id = $1", [attachmentId]);

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

module.exports = router;
