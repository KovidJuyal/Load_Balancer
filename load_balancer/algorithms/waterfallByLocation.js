const { isServerHealthy } = require('../healthchecker');
const { retryRequest } = require('../utils/retry');

const LOCATION_ORDER = ['in', 'us', 'eu'];

function groupServersByLocation(servers) {
  const groups = {};
  for (const server of servers) {
    const region = server.region || 'unknown';
    if (!groups[region]) groups[region] = [];
    groups[region].push(server);
  }
  return groups;
}

function getWaterfallOrder(preferred) {
  const seen = new Set();
  const ordered = [];

  if (preferred && !seen.has(preferred)) {
    ordered.push(preferred);
    seen.add(preferred);
  }

  for (const loc of LOCATION_ORDER) {
    if (!seen.has(loc)) {
      ordered.push(loc);
      seen.add(loc);
    }
  }

  return ordered;
}

async function selectServer(req, servers, tried = new Set()) {
  const location = req.headers['x-client-location']?.toLowerCase() || null;
  console.log(`🌐 Client location: ${location || 'unknown'}`);

  const grouped = groupServersByLocation(servers);
  const fallbackOrder = getWaterfallOrder(location);

  console.log(`🚿 Waterfall location order: ${fallbackOrder.join(' → ')}`);

  for (const region of fallbackOrder) {
    const regionServers = grouped[region] || [];
    console.log(`🔍 Checking region: ${region} (${regionServers.length} servers)`);

    for (const server of regionServers) {
      if (!tried.has(server.url)) {
        if (isServerHealthy(server)) {
          console.log(`✅ Selected server: ${server.url} [${region}]`);
          return server;
        } else {
          console.log(`⚠️ Server ${server.url} in region ${region} is DOWN`);
        }
      }
    }
  }

  console.log(`❌ No available servers found for client location: ${location}`);
  return null;
}

async function handleRequest(req, servers) {
  const tried = new Set();
  let server = await selectServer(req, servers, tried);
  let attempts = 0;

  while (server && attempts < 3) {
    tried.add(server.url);
    try {
      const res = await retryRequest(req, server);
      return res;
    } catch (err) {
      attempts++;
      console.log(`🔁 Retry ${attempts}: ${server.url} failed. Trying next...`);
      server = await selectServer(req, servers, tried);
    }
  }

  throw new Error('All retries failed');
}

module.exports = { handleRequest, selectServer };
