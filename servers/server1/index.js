const express = require("express");
const app = express();
const PORT = 3001;

app.get("/", (req, res) => {
  res.json({ server: "Server 1", status: "OK" });
});

app.listen(PORT, () => {
  console.log(`Server 1 running at http://localhost:${PORT}`);
});
