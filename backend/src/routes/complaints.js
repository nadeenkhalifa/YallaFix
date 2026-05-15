const express = require("express");
const multer = require("multer");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");
const { createNotification, logActivity } = require("../helpers/notify");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const validStatuses = ["open", "in_progress", "resolved", "closed"];

// Reusable SELECT fragment — always JOIN categories & locations so names come back
const SELECT_COMPLAINT = `
  SELECT c.*,
         cat.name  AS category,
         loc.name  AS location,
         loc.building AS location_building,
         u.name    AS reporter_name,
         w.name    AS assigned_worker_name,
         (SELECT COUNT(*) FROM confirmations WHERE complaint_id = c.id) AS confirmation_count`;

const FROM_COMPLAINT = `
  FROM complaints c
  LEFT JOIN categories cat ON c.category_id  = cat.id
  LEFT JOIN locations  loc ON c.location_id  = loc.id
  JOIN  users u ON c.reporter_id      = u.id
  LEFT JOIN users w ON c.assigned_worker_id = w.id`;

router.use(requireAuth);

// POST /api/complaints
router.post("/", requireRole("Community Member"), upload.single("photo"), async (req, res) => {
  const { description, category_id, location_id, room_number } = req.body;
  if (!description) return res.status(400).json({ error: "description is required" });
  if (!location_id) return res.status(400).json({ error: "location is required" });
  try {
    let imageUrl = null;
    if (req.file) {
      imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }
    const result = await pool.query(
      `INSERT INTO complaints (reporter_id, description, category_id, location_id, image_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW()) RETURNING id`,
      [req.user.id, description, category_id || null, location_id, imageUrl]
    );
    const full = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} WHERE c.id = $1`,
      [result.rows[0].id]
    );
    await logActivity(req.user.id, "complaint_created", "complaint", result.rows[0].id, description.slice(0, 80));
    res.status(201).json({ complaint: full.rows[0] });
  } catch (err) {
    console.error("POST /complaints error:", err);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

// GET /api/complaints/my
router.get("/my", requireRole("Community Member"), async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_COMPLAINT},
       (SELECT COUNT(*) FROM confirmations WHERE complaint_id = c.id AND user_id = $1) AS user_confirmed
       ${FROM_COMPLAINT}
       WHERE c.reporter_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error("GET /my error:", err);
    res.status(500).json({ error: "Failed to fetch your complaints" });
  }
});

// GET /api/complaints/assigned
router.get("/assigned", requireRole("Worker"), async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT}
       WHERE c.assigned_worker_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error("GET /assigned error:", err);
    res.status(500).json({ error: "Failed to fetch assigned complaints" });
  }
});

// GET /api/complaints
router.get("/", requireRole("Facility Manager", "Admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} ORDER BY c.created_at DESC`
    );
    res.json({ complaints: result.rows });
  } catch (err) {
    console.error("GET /complaints error:", err);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// GET /api/complaints/:id
router.get("/:id", async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: "Complaint not found" });
  try {
    const result = await pool.query(
      `${SELECT_COMPLAINT},
       (SELECT COUNT(*) FROM confirmations WHERE complaint_id = c.id AND user_id = $2) AS user_confirmed
       ${FROM_COMPLAINT}
       WHERE c.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Complaint not found" });

    const commentsResult = await pool.query(
      `SELECT cm.*, u.name AS author_name
       FROM comments cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.complaint_id = $1
       ORDER BY cm.created_at ASC`,
      [req.params.id]
    );
    res.json({ complaint: result.rows[0], comments: commentsResult.rows });
  } catch (err) {
    console.error("GET /:id error:", err);
    res.status(500).json({ error: "Failed to fetch complaint details" });
  }
});

// POST /api/complaints/:id/confirm
router.post("/:id/confirm", requireRole("Community Member"), async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO confirmations (complaint_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    const count = await pool.query(`SELECT COUNT(*) FROM confirmations WHERE complaint_id = $1`, [req.params.id]);
    res.json({ confirmed: true, confirmation_count: count.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to confirm complaint" });
  }
});

// DELETE /api/complaints/:id/confirm
router.delete("/:id/confirm", requireRole("Community Member"), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM confirmations WHERE complaint_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const count = await pool.query(`SELECT COUNT(*) FROM confirmations WHERE complaint_id = $1`, [req.params.id]);
    res.json({ confirmed: false, confirmation_count: count.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove confirmation" });
  }
});

// POST /api/complaints/:id/comments
router.post("/:id/comments", async (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ error: "comment is required" });
  const isOfficial = req.user.role === "Facility Manager" || req.user.role === "Admin";
  try {
    const result = await pool.query(
      `INSERT INTO comments (complaint_id, user_id, text, is_official, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [req.params.id, req.user.id, comment, isOfficial]
    );
    const complaint = await pool.query(`SELECT reporter_id FROM complaints WHERE id = $1`, [req.params.id]);
    if (complaint.rows[0] && isOfficial) {
      await createNotification(
        complaint.rows[0].reporter_id,
        "Official Update on Your Complaint",
        comment.slice(0, 100),
        parseInt(req.params.id)
      );
    }
    await logActivity(req.user.id, "comment_added", "complaint", parseInt(req.params.id));
    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// PUT /api/complaints/:id/status
router.put("/:id/status", requireRole("Facility Manager", "Worker", "Admin"), async (req, res) => {
  const { status } = req.body;
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }
  try {
    const result = await pool.query(
      `UPDATE complaints SET status = $1 WHERE id = $2 RETURNING reporter_id`,
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Complaint not found" });
    const reporterId = result.rows[0].reporter_id;
    if (reporterId) {
      const message = status === 'resolved' ? 'Your issue has been resolved!' : `Your complaint status changed to: ${status.replace("_", " ")}`;
      await createNotification(
        reporterId,
        "Complaint Status Updated",
        message,
        parseInt(req.params.id)
      );
    }
    await logActivity(req.user.id, "status_changed", "complaint", parseInt(req.params.id), status);
    const full = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} WHERE c.id = $1`,
      [req.params.id]
    );
    res.json({ complaint: full.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// PUT /api/complaints/:id/assign
router.put("/:id/assign", requireRole("Facility Manager", "Admin"), async (req, res) => {
  const { worker_id } = req.body;
  if (!worker_id) return res.status(400).json({ error: "worker_id is required" });
  try {
    const result = await pool.query(
      `UPDATE complaints SET assigned_worker_id = $1 WHERE id = $2 RETURNING description, reporter_id`,
      [worker_id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Complaint not found" });
    await createNotification(
      worker_id,
      "New Complaint Assigned to You",
      `You have been assigned a complaint: ${result.rows[0].description.slice(0, 80)}`,
      parseInt(req.params.id)
    );
    await logActivity(req.user.id, "worker_assigned", "complaint", parseInt(req.params.id), `worker_id=${worker_id}`);
    const full = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} WHERE c.id = $1`,
      [req.params.id]
    );
    res.json({ complaint: full.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to assign complaint" });
  }
});

// POST /api/complaints/:id/proof
router.post("/:id/proof", requireRole("Worker"), upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "photo is required" });
  try {
    const proofUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await pool.query(
      `UPDATE complaints SET proof_image_url = $1 WHERE id = $2 AND assigned_worker_id = $3 RETURNING id`,
      [proofUrl, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Complaint not found or not assigned to you" });
    await logActivity(req.user.id, "proof_uploaded", "complaint", parseInt(req.params.id));
    const full = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} WHERE c.id = $1`,
      [req.params.id]
    );
    res.json({ complaint: full.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload proof" });
  }
});

// POST /api/complaints/:id/merge
router.post("/:id/merge", requireRole("Facility Manager", "Admin"), async (req, res) => {
  const { parent_id } = req.body;
  if (!parent_id) return res.status(400).json({ error: "parent_id is required" });
  if (parseInt(parent_id) === parseInt(req.params.id)) {
    return res.status(400).json({ error: "Cannot merge a complaint into itself" });
  }
  try {
    const parent = await pool.query(`SELECT id FROM complaints WHERE id = $1`, [parent_id]);
    if (!parent.rows[0]) return res.status(404).json({ error: "Parent complaint not found" });
    await pool.query(
      `UPDATE complaints SET parent_complaint_id = $1, is_merged = TRUE, status = 'closed' WHERE id = $2`,
      [parent_id, req.params.id]
    );
    await logActivity(req.user.id, "complaints_merged", "complaint", parseInt(req.params.id), `merged into #${parent_id}`);
    const full = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} WHERE c.id = $1`,
      [req.params.id]
    );
    res.json({ complaint: full.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to merge complaint" });
  }
});

// PUT /api/complaints/:id/close
router.put("/:id/close", requireRole("Facility Manager", "Admin"), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE complaints SET status = 'closed' WHERE id = $1 AND status = 'resolved' RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ error: "Complaint not found or not resolved" });
    const full = await pool.query(
      `${SELECT_COMPLAINT} ${FROM_COMPLAINT} WHERE c.id = $1`,
      [req.params.id]
    );
    res.json({ complaint: full.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close complaint" });
  }
});

// DELETE /api/complaints/:id
router.delete("/:id", requireRole("Facility Manager", "Admin"), async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM complaints WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Complaint not found" });
    await logActivity(req.user.id, "complaint_deleted", "complaint", parseInt(req.params.id));
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete complaint" });
  }
});

module.exports = router;
