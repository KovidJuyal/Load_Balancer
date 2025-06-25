// load_balancer/algorithms/consistentHashing.js

const crypto = require('crypto');

let ring = [];
let serverMap = new Map();
let aliveServers = new Set();

/**
 * Hash function to convert a string to a numeric hash
 */
function hashString(str) {
    const hash = crypto.createHash('sha256').update(str).digest('hex');
    return parseInt(hash.substring(0, 8), 16); // Use 32-bit portion of hash
}

/**
 * Initializes the consistent hashing ring
 */
function init(servers) {
    ring = [];
    serverMap.clear();
    aliveServers = new Set(servers);

    for (const server of servers) {
        const hash = hashString(server);
        ring.push({ hash, server });
        serverMap.set(server, hash);
    }

    // Sort ring by hash
    ring.sort((a, b) => a.hash - b.hash);
}

/**
 * Selects the next server for a given clientId,
 * skipping unhealthy servers by walking clockwise around the ring
 */
function getNextServer(hash) {
    const keys = [...hashRing.keys()].sort(); // sorted keys
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] >= hash) {
            const selected = hashRing.get(keys[i]);
            if (selected?.server && selected.alive) return selected.server;
        }
    }

    // Wrap around to the beginning if not found
    for (let i = 0; i < keys.length; i++) {
        const selected = hashRing.get(keys[i]);
        if (selected?.server && selected.alive) return selected.server;
    }

    return null; // Nothing found
}


/**
 * Called when request starts – can be used to track metrics
 */
function markRequestStart(serverUrl) {
    // Optional: Add logging or tracking if needed
}

/**
 * Called when request ends – can be used to track metrics
 */
function markRequestEnd(serverUrl) {
    // Optional: Add logging or tracking if needed
}

/**
 * Updates health status for a server (called from health checker)
 */
function updateServerHealth(serverUrl, isAlive) {
    if (isAlive) {
        aliveServers.add(serverUrl);
    } else {
        aliveServers.delete(serverUrl);
    }
}

module.exports = {
    init,
    getNextServer,
    markRequestStart,
    markRequestEnd,
    updateServerHealth,
    selectServer: (servers, req) => {
        const clientId = req.headers['x-client-id'] || req.ip || 'default';
        const selected = getNextServer(clientId);
        return selected ? { url: selected } : null;
    }
};
