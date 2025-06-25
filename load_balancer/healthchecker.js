const axios = require('axios');
const { strategy } = require('./config');
const algorithm = require(`./algorithms/${strategy}`);

// Exported for use in algorithms
function isServerHealthy(server) {
  return server.alive === true;
}

function start(servers, interval = 5000) {
  setInterval(async () => {
    for (const server of servers) {
      try {
        const response = await axios.get(`${server.url}/health`, { timeout: 1000 });
        const isHealthy = response.status >= 200 && response.status < 300;

        if (!server.alive && isHealthy) {
          console.log(`🟢 ${server.url} is back online.`);
        }

        server.alive = isHealthy;
        algorithm.updateServerHealth?.(server.url, isHealthy);
      } catch (error) {
        if (server.alive) {
          console.log(`🔴 ${server.url} is DOWN.`);
        }

        server.alive = false;
        algorithm.updateServerHealth?.(server.url, false);
      }
    }
  }, interval);
}

module.exports = {
  start,
  isServerHealthy
};
