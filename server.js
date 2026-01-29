const express = require("express");
const { Pool } = require("pg");
const Redis = require("ioredis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/* ===============================
   PostgreSQL Connection
================================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ===============================
   Redis Connection
================================ */
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

/* ===============================
   Routes
================================ */

// Home
app.get("/", (req, res) => {
  res.send("Backend + PostgreSQL + Redis LIVE 🚀");
});

/* ---------- GET USERS (WITH CACHE) ---------- */
app.get("/users", async (req, res) => {
  try {
    // 1️⃣ Check Redis cache
    const cachedUsers = await redis.get("users");

    if (cachedUsers) {
      console.log("Serving users from Redis cache");
      return res.json(JSON.parse(cachedUsers));
    }

    // 2️⃣ Fetch from DB
    const result = await pool.query("SELECT * FROM users");

    // 3️⃣ Save to Redis for 60 seconds
    await redis.set("users", JSON.stringify(result.rows), "EX", 60);

    console.log("Serving users from DB, cache updated");
    res.json(result.rows);
  } catch (err) {
    console.error("DB read error:", err);
    res.status(500).json({ error: "DB read failed" });
  }
});

/* ---------- ADD USER ---------- */
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

    // 🧹 Clear cache after insert
    await redis.del("users");

    res.json({
      message: "User added",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("DB INSERT ERROR:", err.message);
    res.status(500).json({ error: "DB insert failed" });
  }
});

/* ---------- DEBUG TABLES ---------- */
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

/* ===============================
   Server Start
================================ */
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
