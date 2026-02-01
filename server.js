const express = require("express");
const { Pool } = require("pg");
const Redis = require("ioredis");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/* =========================
   PostgreSQL Connection
========================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* =========================
   Redis (Upstash)
========================= */
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

/* =========================
   Routes
========================= */

// Home
app.get("/", (req, res) => {
  res.send("Backend + PostgreSQL + Redis LIVE 🚀");
});

// Get users (with Redis cache)
app.get("/users", async (req, res) => {
  try {
    const cached = await redis.get("users");

    if (cached) {
      console.log("Serving from Redis cache");
      return res.json(JSON.parse(cached));
    }

    const result = await pool.query("SELECT * FROM users");

    await redis.set("users", JSON.stringify(result.rows), "EX", 60);
    console.log("Serving from DB, cache updated");

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// Add user
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

    await redis.del("users");

    res.json({
      message: "User added",
      user: result.rows[0]
    });
  } catch (err) {
    console.error("DB INSERT ERROR:", err.message);
    res.status(500).json({ error: "DB insert failed" });
  }
});

// Register (JWT step)
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});


// Debug tables
app.get("/debug-tables", async (req, res) => {
  const result = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
  );
  res.json(result.rows);
});
app.get("/fix-users-table", async (req, res) => {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password TEXT
  `);
  res.send("Password column added");
});
app.get("/reset-users", async (req, res) => {
  await pool.query("DELETE FROM users");
  res.send("Users cleared");
});
app.get("/ping", (req, res) => {
  res.send("NEW CODE DEPLOYED");
});
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
