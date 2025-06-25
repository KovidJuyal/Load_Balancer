const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

// In-memory storage instead of file system
let messages = [];

// Basic root
app.get('/', (req, res) => {
  res.send('Response from Server 1'); // Change for each server
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    server: 'server1',
    timestamp: new Date().toISOString(),
    messageCount: messages.length 
  });
});

// Contact POST route
app.post('/api/contact', (req, res) => {
  try {
    const { name, message } = req.body;

    // Validate input
    if (!name || !message || typeof name !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input: Name and message are required and must be strings.' 
      });
    }

    // Prevent memory overflow
    if (messages.length > 1000) {
      messages = messages.slice(-500); // Keep last 500 messages
    }

    const entry = { 
      id: Date.now() + Math.random().toString(36).slice(2),
      name: name.trim(), 
      message: message.trim(), 
      timestamp: new Date().toISOString(),
      server: 'server1' // Change for each server
    };

    messages.push(entry);

    console.log(`📥 Contact form received from ${name}: ${message.slice(0, 50)}...`);
    
    res.json({ 
      success: true, 
      message: 'Message received successfully',
      server: 'server1',
      id: entry.id
    });

  } catch (err) {
    console.error('🚨 Unexpected server error in /api/contact:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      server: 'server1' 
    });
  }
});

// Get messages endpoint (optional)
app.get('/api/messages', (req, res) => {
  res.json({
    messages: messages.slice(-10), // Last 10 messages
    total: messages.length,
    server: 'server1'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server 1 running on port ${PORT}`);
});