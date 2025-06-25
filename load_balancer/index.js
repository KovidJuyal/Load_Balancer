const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const log = require('./logger');
const { selectServer, getHealthyServers } = require('./loadBalancerCore');

dotenv.config();
const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

const SERVERS = [
  { url: 'https://server1-sq0g.onrender.com', healthy: true, region: 'in' },
  { url: 'https://server2-o3b8.onrender.com', healthy: true, region: 'us' },
  { url: 'https://server3-ctv3.onrender.com', healthy: true, region: 'eu' },
];

const HEALTH_CHECK_INTERVAL = 5000; // ms
const RETRY_LIMIT = 3;

app.use(express.json());
app.use(morgan('dev'));

// Serve frontend form to simulate clients
app.use(express.static(path.join(__dirname, 'public')));

// Retry forwarding with failover
// async function forwardRequestWithRetry(req, res, tried = new Set(), attempt = 1) {
//   const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//   req.headers['x-request-id'] = requestId;
async function forwardRequestWithRetry(req, res, tried = new Set(), attempt = 1) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const clientId = req.headers['x-client-id'] || uuidv4();

  req.headers['x-request-id'] = requestId;
  req.headers['x-client-id'] = clientId; 

  const server = selectServer(req, SERVERS, tried);

  if (!server) {
    log('error', `[${requestId}] No healthy servers available`);
    return res.status(503).send('Service Unavailable: No healthy servers');
  }

  tried.add(server.url);
  log('event', `[${requestId}] Retry ${attempt}/${RETRY_LIMIT}: Trying ${server.url}`);

  try {
    const result = await axios({
      method: req.method,
      url: server.url + req.originalUrl,
      data: req.body,
      headers: req.headers,
    });
    log('success', `${server.url} responded in ${result.elapsedTime || 'N/A'}ms with status ${result.status}`);
    return res.status(result.status).send(result.data);
  } catch (err) {
    log('warn', `[${requestId}] Error forwarding to ${server.url}: ${err.message}`);

    if (attempt < RETRY_LIMIT) {
      return forwardRequestWithRetry(req, res, tried, attempt + 1);
    } else {
      log('error', `[${requestId}] Request failed after ${RETRY_LIMIT} attempts`);
      return res.status(500).send('Internal Server Error');
    }
  }
}

// Forward all API requests to backend servers
app.all('/api/*', (req, res) => {
  forwardRequestWithRetry(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const report = SERVERS.map(s => ({
    url: s.url,
    healthy: s.healthy,
  }));
  res.json(report);
});

// Health checker function
function startHealthCheck() {
  setInterval(async () => {
    for (let server of SERVERS) {
      try {
        await axios.get(`${server.url}/health`);
        server.healthy = true;
        log('health', `${server.url} is UP.`);
      } catch {
        server.healthy = false;
        log('health', `${server.url} is DOWN.`);
      }
    }
  }, HEALTH_CHECK_INTERVAL);
}

app.listen(PORT, () => {
  log('success', `Load Balancer running at http://localhost:${PORT}`);
  log('health', `Health check: http://localhost:${PORT}/health`);
  startHealthCheck();
});
