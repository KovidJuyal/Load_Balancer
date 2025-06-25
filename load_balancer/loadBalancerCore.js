const crypto = require('crypto');
const waterfallByLocation = require('./algorithms/waterfallByLocation');

let virtualNodes = [];
const virtualNodeCount = 100;

/**
 * Hash a value to a 32-bit unsigned int
 */
function hash(value) {
  return parseInt(crypto.createHash('md5').update(value).digest('hex').substring(0, 8), 16);
}

/**
 * Setup the consistent hash ring
 */
function setupHashRing(servers) {
  virtualNodes = [];
  for (let server of servers) {
    for (let i = 0; i < virtualNodeCount; i++) {
      const vnodeId = `${server.url}#${i}`;
      virtualNodes.push({ hash: hash(vnodeId), server });
    }
  }
  virtualNodes.sort((a, b) => a.hash - b.hash);
}

/**
 * Select the next server clockwise on the hash ring
 */
function getNextServer(clientId) {
  const clientHash = hash(clientId);
  for (let vnode of virtualNodes) {
    if (vnode.hash >= clientHash) return vnode.server;
  }
  return virtualNodes[0]?.server; // Wrap around
}

/**
 * Filter healthy servers only
 */
function getHealthyServers(servers) {
  return servers.filter(s => s.healthy);
}

/**
 * Select a server using consistent hashing, skipping tried servers
 */
function consistentHashing(clientId, healthyServers, tried = new Set()) {
  setupHashRing(healthyServers);
  let server = getNextServer(clientId);
  if (!server || tried.has(server.url)) {
    for (let vnode of virtualNodes) {
      if (!tried.has(vnode.server.url)) {
        return vnode.server;
      }
    }
    return null;
  }
  return server;
}

/**
 * Dispatcher to select algorithm dynamically
 */
function selectServer(req, servers, tried = new Set()) {
  const algo = process.env.LOAD_BALANCING_ALGO || 'consistent_hashing';

  const healthy = getHealthyServers(servers);

  if (algo === 'waterfall_by_location') {
    const location = req.headers['x-client-location'] || 'default';
    return waterfallByLocation.selectServer(location, healthy, tried);
  }

  // Default to consistent hashing
  const clientId = req.headers['x-client-id'] || 'default';
  return consistentHashing(clientId, healthy, tried);
}

module.exports = {
  getHealthyServers,
  selectServer,
  hash
};
