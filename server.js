const express = require("express");
const { Pool } = require("pg");
const Redis = require("ioredis");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Redis
const redis = new Redis(process.env.REDIS_URL);

redis.on("connect", () => {
  console.log("Redis connected ✅");
});

redis.on("error", (err) => {
  console.error("Redis error ❌", err);
});

// Home
app.get("/", (req, res) => {
  res.send("Backend + PostgreSQL + Redis LIVE 🚀");
});

// GET users (WITH CACHE)
app.get("/users", async (req, res) => {
  try {
    // 1️⃣ Check Redis cache
    const cached = await redis.get("users");

    if (cached) {
      console.log("Serving from Redis cache ⚡");
      return res.json(JSON.parse(cached));
    }

    // 2️⃣ If cache miss → DB
    const result = await pool.query("SELECT * FROM users");

    // 3️⃣ Save to Redis (60 sec)
    await redis.set("users", JSON.stringify(result.rows), "EX", 60);

    console.log("Serving from DB, cache saved 🗄️");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// POST user (CLEAR CACHE)
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

    // Clear cache
    await redis.del("users");

    res.json({
      message: "User added",
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "DB insert failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
