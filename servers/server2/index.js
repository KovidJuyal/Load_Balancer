const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002; // Change to 3002 for server2, 3003 for server3

app.use(express.json());
app.use(cors());

const messagesFile = path.join(__dirname, 'messages.json');

// Basic root
app.get('/', (req, res) => {
  res.send('Response from Server 2'); // Change for each server
});

// Health check
app.get('/health', (req, res) => {
  res.send('OK');
});

// Contact POST route
app.post('/api/contact', (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).send('Invalid input: Name and message required.');
    }

    const entry = { name, message, timestamp: new Date().toISOString() };
    let all = [];

    // Safely read and parse the file
    if (fs.existsSync(messagesFile)) {
      try {
        const content = fs.readFileSync(messagesFile, 'utf-8');
        all = JSON.parse(content);
        if (!Array.isArray(all)) all = [];
      } catch (err) {
        console.error('⚠️ Failed to parse messages.json. Resetting file.', err);
        all = [];
      }
    }

    all.push(entry);

    // Safely write the file
    try {
      fs.writeFileSync(messagesFile, JSON.stringify(all, null, 2));
    } catch (err) {
      console.error('❌ Error writing to messages.json:', err);
      return res.status(500).send('Could not store message');
    }

    console.log(`📥 Contact form received: ${name} - ${message}`);
    res.send('Response from Server 2'); // Change per server
  } catch (err) {
    console.error('🚨 Unexpected server error in /api/contact:', err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
