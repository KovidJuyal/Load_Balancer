let currentIndex = 0;

function getNextServer(servers) {
    if (servers.length === 0) return null;
    const server = servers[currentIndex % servers.length];
    currentIndex++;
    return server;
}

module.exports = getNextServer;
