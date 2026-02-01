const express = require("express");
const { Pool } = require("pg");
const Redis = require("ioredis");
const bcrypt = require("bcryptjs");

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
   Redis Connection
========================= */
const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
});

redis.on("connect", () => console.log("Redis connected successfully"));
redis.on("error", (err) => console.error("Redis error:", err));

/* =========================
   ROUTES
========================= */

app.get("/", (req, res) => {
  res.send("Backend LIVE 🚀");
});

app.get("/__proof", (req, res) => {
  res.send("SERVER.JS UPDATED");
});

/* ---------- REGISTER ---------- */
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1,$2,$3)",
      [name, email, hashedPassword]
    );

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("REGISTER ERROR:", err.message);
    res.status(500).json({ error: "Register failed" });
  }
});

/* ---------- USERS ---------- */
app.get("/users", async (req, res) => {
  try {
    const cached = await redis.get("users");
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query("SELECT id, name, email FROM users");
    await redis.set("users", JSON.stringify(result.rows), "EX", 60);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load users" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
