const express = require("express");
const pool = require("../../db");
const requireAuth = require("../../middleware/requireAuth");
const { requireRole } = require("../../middleware/requireRole");
const { logActivity } = require("../../helpers/notify");

const router = express.Router();
router.use(requireAuth);

// GET /api/admin/categories - public to all authenticated users
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM categories ORDER BY name`);
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/admin/categories - Admin only
router.post("/", requireRole("Admin"), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *`,
      [name.trim(), description || null]
    );
    await logActivity(req.user.id, "category_created", "category", result.rows[0].id, name);
    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Category already exists" });
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/admin/categories/:id - Admin only
router.put("/:id", requireRole("Admin"), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `UPDATE categories SET name = $1, description = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), description || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Category not found" });
    res.json({ category: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/admin/categories/:id - Admin only
router.delete("/:id", requireRole("Admin"), async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Category not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

module.exports = router;
