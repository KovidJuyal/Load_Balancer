const express = require("express");
const app = express();
const PORT = 3003;

app.get("/", (req, res) => {
  res.json({ server: "Server 3", status: "OK" });
});

app.listen(PORT, () => {
  console.log(`Server 3 running at http://localhost:${PORT}`);
});
