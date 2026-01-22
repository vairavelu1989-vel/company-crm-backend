const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let users = [];

app.get("/", (req, res) => {
  res.send("Backend is LIVE 🚀");
});

app.get("/users", (req, res) => {
  res.json(users);
});

app.post("/users", (req, res) => {
  const user = req.body;
  users.push(user);
  console.log("User added:", user);
  res.json({ message: "User added", user });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
