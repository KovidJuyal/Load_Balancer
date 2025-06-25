const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // server1
// For server2 use 3002, server3 use 3003 as fallback
// Change this to 3002, 3003 accordingly

app.use(express.json());
app.use(cors());

const messagesFile = path.join(__dirname, 'messages.json');

app.get('/', (req, res) => {
  res.send('Response from Server 1'); // Change for 2, 3 accordingly
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.post('/api/contact', (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).send('Invalid input');
  }

  const entry = { name, message, timestamp: new Date().toISOString() };

  let all = [];
  if (fs.existsSync(messagesFile)) {
    all = JSON.parse(fs.readFileSync(messagesFile));
  }
  all.push(entry);
  fs.writeFileSync(messagesFile, JSON.stringify(all, null, 2));

  console.log(`📥 Contact form received: ${name} - ${message}`);
  res.send('Response from Server 1'); // Change per server
});

app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
  console.log(`✅✅ Server 1 running on port ${process.env.PORT || 3001}`);
});
