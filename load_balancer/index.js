const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { selectServer, getHealthyServers } = require('./utils/loadBalancerCore');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const PORT = process.env.PORT || 5000;

const SERVERS = [
  { url: 'https://server1-sq0g.onrender.com', healthy: true, region: 'in', name: 'server1' },
  { url: 'https://server2-o3b8.onrender.com', healthy: true, region: 'us', name: 'server2' },
  { url: 'https://server3-ctv3.onrender.com', healthy: true, region: 'eu', name: 'server3' },
];

const HEALTH_CHECK_INTERVAL = 30000;
const RETRY_LIMIT = 2;
const REQUEST_TIMEOUT = 15000;

// Serve the professional dashboard frontend
app.use(express.static(path.join(__dirname, '../frontend')));

async function forwardRequestWithRetry(req, res, tried = new Set(), attempt = 1) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const clientId = req.headers['x-client-id'] || uuidv4();
  const server = selectServer(req, SERVERS, tried);

  if (!server) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      requestId
    });
  }

  tried.add(server.url);

  try {
    const result = await axios({
      method: req.method,
      url: server.url + req.originalUrl,
      data: req.body,
      headers: {
        ...req.headers,
        'x-request-id': requestId,
        'x-client-id': clientId
      },
      timeout: REQUEST_TIMEOUT
    });

    res.status(result.status).json({
      ...result.data,
      server: server.name,
      forwardedBy: 'LoadBalancer'
    });

  } catch (err) {
    server.healthy = false;

    if (attempt < RETRY_LIMIT && tried.size < SERVERS.length) {
      return forwardRequestWithRetry(req, res, tried, attempt + 1);
    }

    return res.status(502).json({
      error: 'All servers failed',
      requestId,
      attempted: Array.from(tried)
    });
  }
}

// Handle POST contact form (connect frontend)
app.post('/api/contact', (req, res) => {
  forwardRequestWithRetry(req, res);
});

// Health route
app.get('/health', (req, res) => {
  const healthyCount = SERVERS.filter(s => s.healthy).length;
  res.json({
    status: healthyCount > 0 ? 'healthy' : 'unhealthy',
    healthyServers: healthyCount,
    totalServers: SERVERS.length,
    servers: SERVERS
  });
});

// Health checker loop
function startHealthCheck() {
  setInterval(async () => {
    for (let server of SERVERS) {
      try {
        const response = await axios.get(`${server.url}/health`, {
          timeout: 3000,
          validateStatus: status => status === 200
        });
        server.healthy = true;
      } catch (err) {
        server.healthy = false;
      }
    }
  }, HEALTH_CHECK_INTERVAL);
}

app.listen(PORT, () => {
  console.log(`🚀 Load Balancer running at http://localhost:${PORT}`);
  startHealthCheck();
});
