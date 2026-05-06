const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();
router.use(requireAuth);

// Get all assignments for user's complaints
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.complaint_id, a.staff_id, a.status, a.created_at, a.updated_at
       FROM assignments a
       JOIN complaints c ON a.complaint_id = c.id
       WHERE c.reporter_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json({ assignments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// Get specific assignment
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.description, c.reporter_id
       FROM assignments a
       JOIN complaints c ON a.complaint_id = c.id
       WHERE a.id = $1 AND c.reporter_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
});

// POST assignments (assign a complaint to a staff member)
// Assign a complaint to a staff member
router.post("/", requireRole("Facility Manager", "Worker", "Admin"), async (req, res) => {
  const { complaint_id, staff_id } = req.body;

  if (!complaint_id || !staff_id) {
    return res.status(400).json({ error: "complaint_id and staff_id are required" });
  }

  try {
    // Check if complaint exists and belongs to user
    const complaintCheck = await pool.query(
      "SELECT id FROM complaints WHERE id = $1 AND reporter_id = $2",
      [complaint_id, req.user.id]
    );
    if (!complaintCheck.rows[0]) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Create assignment
    const result = await pool.query(
      `INSERT INTO assignments (complaint_id, staff_id, status, created_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [complaint_id, staff_id]
    );

    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// PATCH (update assignment status)
router.patch("/:id/status", requireRole("Facility Manager", "Worker", "Admin"), async (req, res) => {
  const { status } = req.body;
  const assignmentId = req.params.id;

  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }

  const validStatuses = ["pending", "in_progress", "completed", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    const result = await pool.query(
      `UPDATE assignments SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, assignmentId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.json({ assignment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

module.exports = router;
