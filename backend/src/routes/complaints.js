const express = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");
const path = require("path");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const validStatuses = ["open", "in_progress", "resolved", "closed"];

router.use(requireAuth);

// POST /api/complaints
// Submit a new complaint (Community Member)
router.post("/", requireRole("Community Member"), upload.single("photo"), async (req, res) => {
  const { description, category_id, location_id } = req.body;
  const file = req.file;

  if (!description) {
    return res.status(400).json({ error: "description is required" });
  }

  try {
    let photoPath = null;
    if (file) {
      const ext = path.extname(file.originalname) || ".jpg";
      photoPath = `complaints/${req.user.id}/${randomUUID()}${ext}`;
    }

    const result = await pool.query(
      `INSERT INTO complaints (reporter_id, description, category_id, location_id, status, image_url, created_at)
       VALUES ($1, $2, $3, $4, 'open', $5, NOW())
       RETURNING *`,
      [req.user.id, description, category_id || null, location_id || null, photoPath]
    );

    res.status(201).json({ complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

// GET /api/complaints
// Get all complaints (Facility Manager)
router.get("/", requireRole("Facility Manager", "Admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.description, c.status, c.category_id, c.location_id,
              c.assigned_worker_id, c.reporter_id, c.created_at, c.updated_at,
              u.name AS reporter_name, u.email AS reporter_email
       FROM complaints c
       JOIN users u ON c.reporter_id = u.id
       ORDER BY c.created_at DESC`
    );
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// GET /api/complaints/my
// Get complaints submitted by the logged-in Community Member
router.get("/my", requireRole("Community Member"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name AS reporter_name, u.email AS reporter_email
       FROM complaints c
       JOIN users u ON c.reporter_id = u.id
       WHERE c.reporter_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your complaints" });
  }
});

// GET /api/complaints/:id
// Get details of a specific complaint
router.get("/:id", async (req, res) => {
  try {
    const isMember = req.user.role === "Community Member";
    const query = isMember
      ? `SELECT c.*, u.name AS reporter_name, u.email AS reporter_email,
                w.name AS assigned_worker_name, w.email AS assigned_worker_email
         FROM complaints c
         JOIN users u ON c.reporter_id = u.id
         LEFT JOIN users w ON c.assigned_worker_id = w.id
         WHERE c.id = $1 AND c.reporter_id = $2`
      : `SELECT c.*, u.name AS reporter_name, u.email AS reporter_email,
                w.name AS assigned_worker_name, w.email AS assigned_worker_email
         FROM complaints c
         JOIN users u ON c.reporter_id = u.id
         LEFT JOIN users w ON c.assigned_worker_id = w.id
         WHERE c.id = $1`;

    const values = isMember ? [req.params.id, req.user.id] : [req.params.id];
    const complaintResult = await pool.query(query, values);

    if (!complaintResult.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const commentsResult = await pool.query(
      `SELECT c.id, c.comment, c.author_id, u.name AS author_name, c.created_at
       FROM comments c
       JOIN users u ON c.author_id = u.id
       WHERE c.complaint_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    const attachmentsResult = await pool.query(
      `SELECT id, file_path, file_name, mime_type, file_size, created_at
       FROM attachments
       WHERE complaint_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({
      complaint: complaintResult.rows[0],
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch complaint details" });
  }
});

// PUT /api/complaints/:id/status
// Update the status of a complaint (FM / Worker)
router.put("/:id/status", requireRole("Facility Manager", "Worker", "Admin"), async (req, res) => {
  const { status } = req.body;
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status is required and must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const result = await pool.query(
      `UPDATE complaints SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json({ complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update complaint status" });
  }
});

// PUT /api/complaints/:id/assign
// Assign a complaint to a worker (Facility Manager)
router.put("/:id/assign", requireRole("Facility Manager", "Admin"), async (req, res) => {
  const { worker_id } = req.body;
  if (!worker_id) {
    return res.status(400).json({ error: "worker_id is required" });
  }

  try {
    const workerExists = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'Worker'",
      [worker_id]
    );
    if (!workerExists.rows[0]) {
      return res.status(400).json({ error: "Worker not found" });
    }

    const result = await pool.query(
      `UPDATE complaints SET assigned_worker_id = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [worker_id, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json({ complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign complaint" });
  }
});

// PUT /api/complaints/:id/close
// Close a resolved complaint (Facility Manager)
router.put("/:id/close", requireRole("Facility Manager", "Admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE complaints SET status = 'closed', updated_at = NOW(), closed_at = NOW()
       WHERE id = $1 AND status = 'resolved' RETURNING *`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: "Complaint not found or not in resolved state" });
    }

    res.json({ complaint: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close complaint" });
  }
});

// POST /api/complaints/:id/comments
// Add a comment to a complaint (Worker)
router.post("/:id/comments", requireRole("Worker"), async (req, res) => {
  const { comment } = req.body;
  if (!comment) {
    return res.status(400).json({ error: "comment is required" });
  }

  try {
    const complaintExists = await pool.query("SELECT id FROM complaints WHERE id = $1", [req.params.id]);
    if (!complaintExists.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const result = await pool.query(
      `INSERT INTO comments (complaint_id, author_id, comment, created_at)
       VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [req.params.id, req.user.id, comment]
    );

    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// POST /api/complaints/:id/photo
// Upload a completion photo (Worker)
router.post("/:id/photo", requireRole("Worker"), upload.single("photo"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "photo is required" });
  }

  try {
    const complaintExists = await pool.query("SELECT id FROM complaints WHERE id = $1", [req.params.id]);
    if (!complaintExists.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const ext = path.extname(file.originalname) || ".jpg";
    const filePath = `complaints/${req.params.id}/photos/${req.user.id}/${randomUUID()}${ext}`;
    const result = await pool.query(
      `INSERT INTO attachments (complaint_id, file_path, file_name, file_size, mime_type, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [req.params.id, filePath, file.originalname, file.size, file.mimetype]
    );

    res.status(201).json({ photo: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

// DELETE /api/complaints/:id
// Delete a complaint (Facility Manager)
router.delete("/:id", requireRole("Facility Manager", "Admin"), async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM complaints WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete complaint" });
  }
});

module.exports = router;
