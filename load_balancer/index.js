const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.validateStatus = (status) => status < 500; // Don't throw on 4xx

const SERVERS = [
  { url: 'https://server1-sq0g.onrender.com', healthy: true, region: 'in', name: 'server1' },
  { url: 'https://server2-o3b8.onrender.com', healthy: true, region: 'us', name: 'server2' },
  { url: 'https://server3-ctv3.onrender.com', healthy: true, region: 'eu', name: 'server3' },
];

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds (reduced frequency)
const RETRY_LIMIT = 2; // Reduced retry limit
const REQUEST_TIMEOUT = 15000; // 15 seconds

app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Simple round-robin server selection
let currentServerIndex = 0;
function getNextHealthyServer(excludeUrls = new Set()) {
  const healthyServers = SERVERS.filter(s => s.healthy && !excludeUrls.has(s.url));
  
  if (healthyServers.length === 0) {
    return null;
  }
  
  // Round robin through healthy servers
  const server = healthyServers[currentServerIndex % healthyServers.length];
  currentServerIndex++;
  return server;
}

// Enhanced request forwarding with better error handling
async function forwardRequestWithRetry(req, res, tried = new Set(), attempt = 1) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const clientId = req.headers['x-client-id'] || uuidv4();

  const server = getNextHealthyServer(tried);

  if (!server) {
    console.error(`❌ [${requestId}] No healthy servers available`);
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      requestId: requestId
    });
  }

  tried.add(server.url);
  console.log(`🔄 [${requestId}] Attempt ${attempt}/${RETRY_LIMIT}: Trying ${server.name} (${server.url})`);

  try {
    const startTime = Date.now();
    
    const result = await axios({
      method: req.method,
      url: server.url + req.originalUrl,
      data: req.body,
      headers: {
        ...req.headers,
        'x-request-id': requestId,
        'x-client-id': clientId,
        'x-forwarded-for': req.ip,
        'user-agent': req.get('user-agent') || 'LoadBalancer/1.0'
      },
      timeout: REQUEST_TIMEOUT,
      maxRedirects: 0
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] ${server.name} responded in ${duration}ms with status ${result.status}`);
    
    // Forward the response
    res.status(result.status);
    if (result.headers['content-type']) {
      res.set('content-type', result.headers['content-type']);
    }
    res.set('x-forwarded-by', server.name);
    return res.send(result.data);

  } catch (err) {
    const duration = Date.now() - Date.now();
    
    // Mark server as unhealthy if it's consistently failing
    if (err.code === 'ECONNREFUSED' || err.code === 'TIMEOUT' || err.response?.status >= 500) {
      server.healthy = false;
      console.warn(`⚠️ [${requestId}] Marking ${server.name} as unhealthy due to: ${err.message}`);
    }

    console.warn(`⚠️ [${requestId}] Error forwarding to ${server.name}: ${err.message}`);

    if (attempt < RETRY_LIMIT && tried.size < SERVERS.length) {
      return forwardRequestWithRetry(req, res, tried, attempt + 1);
    } else {
      console.error(`❌ [${requestId}] Request failed after ${attempt} attempts`);
      return res.status(502).json({ 
        error: 'Bad Gateway - All servers unavailable',
        requestId: requestId,
        attemptedServers: Array.from(tried)
      });
    }
  }
}

// Forward all API requests
app.all('/api/*', (req, res) => {
  forwardRequestWithRetry(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthyCount = SERVERS.filter(s => s.healthy).length;
  const report = {
    status: healthyCount > 0 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    servers: SERVERS.map(s => ({
      name: s.name,
      url: s.url,
      healthy: s.healthy,
      region: s.region
    })),
    healthyServers: healthyCount,
    totalServers: SERVERS.length
  };
  
  res.status(healthyCount > 0 ? 200 : 503).json(report);
});

// Enhanced health checker
async function checkServerHealth(server) {
  try {
    const response = await axios.get(`${server.url}/health`, { 
      timeout: 5000,
      validateStatus: (status) => status === 200
    });
    
    if (!server.healthy) {
      console.log(`✅ ${server.name} is back online`);
    }
    server.healthy = true;
    
  } catch (err) {
    if (server.healthy) {
      console.log(`❌ ${server.name} went offline: ${err.message}`);
    }
    server.healthy = false;
  }
}

function startHealthCheck() {
  console.log(`🏥 Starting health checks every ${HEALTH_CHECK_INTERVAL/1000}s`);
  
  setInterval(async () => {
    const healthPromises = SERVERS.map(server => checkServerHealth(server));
    await Promise.allSettled(healthPromises);
    
    const healthyCount = SERVERS.filter(s => s.healthy).length;
    console.log(`💚 Health check complete: ${healthyCount}/${SERVERS.length} servers healthy`);
  }, HEALTH_CHECK_INTERVAL);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Load Balancer running on port ${PORT}`);
  console.log(`🏥 Health check endpoint: http://localhost:${PORT}/health`);
  startHealthCheck();
});