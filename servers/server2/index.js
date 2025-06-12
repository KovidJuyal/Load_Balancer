const express = require("express");
const app = express();
const PORT = 3002;

app.get("/", (req, res) => {
  res.json({ server: "Server 2", status: "OK" });
});

app.listen(PORT, () => {
  console.log(`Server 2 running at http://localhost:${PORT}`);
});
