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
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
      [name, email]
    );

    res.json({
      message: "User added",
      user: result.rows[0]
    });
  } catch (err) {
    console.error("DB INSERT ERROR:", err.message);
    res.status(500).json({ error: "DB insert failed" });
  }
});

app.get("/debug-tables", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
