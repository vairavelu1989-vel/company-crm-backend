const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Home route
app.get("/", (req, res) => {
  res.send("Backend + PostgreSQL LIVE 🚀");
});

// Get users from DB
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error("DB read error:", err);
    res.status(500).json({ error: "DB read failed" });
  }
});

// Add user to DB
app.post("/users", async (req, res) => {
  try {
    const { name, department } = req.body;
    const result = await pool.query(
      "INSERT INTO users (name, department) VALUES ($1, $2) RETURNING *",
      [name, department]
    );
    console.log("User added:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "DB insert failed" });
  }
});
app.get("/init-db", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT
      )
    `);
    res.send("✅ DB initialized – users table created");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ DB init failed");
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
