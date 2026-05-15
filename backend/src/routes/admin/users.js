const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../../db");
const requireAuth = require("../../middleware/requireAuth");
const { requireRole } = require("../../middleware/requireRole");
const { logActivity } = require("../../helpers/notify");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("Admin"));

// GET /api/admin/users
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/admin/users - Create a new user
router.post("/", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password and role are required" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, is_active`,
      [name, email, hash, role]
    );
    await logActivity(req.user.id, "user_created", "user", result.rows[0].id, `role=${role}`);
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already in use" });
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT /api/admin/users/:id/status - Activate / deactivate
router.put("/:id/status", async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active must be boolean" });
  }
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active`,
      [is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    await logActivity(req.user.id, is_active ? "user_activated" : "user_deactivated", "user", parseInt(req.params.id));
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// PUT /api/admin/users/:id/role - Change user role
router.put("/:id/role", async (req, res) => {
  const { role } = req.body;
  const validRoles = ["Community Member", "Facility Manager", "Worker", "Admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(", ")}` });
  }
  try {
    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, is_active`,
      [role, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    await logActivity(req.user.id, "role_changed", "user", parseInt(req.params.id), `role=${role}`);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// POST /api/admin/users/:id/reset-password
router.post("/:id/reset-password", async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: "new_password must be at least 6 characters" });
  }
  try {
    const hash = await bcrypt.hash(new_password, 10);
    const result = await pool.query(
      `UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name, email`,
      [hash, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "User not found" });
    await logActivity(req.user.id, "password_reset", "user", parseInt(req.params.id));
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

module.exports = router;
