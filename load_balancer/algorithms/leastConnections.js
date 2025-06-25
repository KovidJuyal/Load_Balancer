let serverStats = [];

function init(serverUrls) {
  serverStats = serverUrls.map(url => ({ url, activeConnections: 0 }));
}

function markRequestStart(serverUrl) {
  const server = serverStats.find(s => s.url === serverUrl);
  if (server) server.activeConnections++;
  logConnections();
}

function markRequestEnd(serverUrl) {
  const server = serverStats.find(s => s.url === serverUrl);
  if (server && server.activeConnections > 0) server.activeConnections--;
  logConnections();
}

function getNextServer(healthyUrls) {
  const healthyStats = serverStats.filter(s => healthyUrls.includes(s.url));
  if (healthyStats.length === 0) return null;
  healthyStats.sort((a, b) => a.activeConnections - b.activeConnections);
  return healthyStats[0].url;
}

function logConnections() {
  console.log(`\n📊 Active Connections:`);
  serverStats.forEach(s => {
    console.log(`- ${s.url} => ${s.activeConnections} connections`);
  });
}

module.exports = {
  init,
  getNextServer,
  markRequestStart,
  markRequestEnd
};
