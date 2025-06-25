let currentIndex = -1;
let currentWeight = 0;

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function maxWeight(servers) {
    return Math.max(...servers.map(s => s.weight));
}

function gcdWeight(servers) {
    return servers.reduce((acc, server) => gcd(acc, server.weight), servers[0].weight);
}

function getNextServer(servers) {
    while (true) {
        currentIndex = (currentIndex + 1) % servers.length;
        if (currentIndex === 0) {
            currentWeight -= gcdWeight(servers);
            if (currentWeight <= 0) {
                currentWeight = maxWeight(servers);
                if (currentWeight === 0) return null;
            }
        }

        const server = servers[currentIndex];
        if (server.weight >= currentWeight && server.alive) {
            return server;
        }
    }
}

module.exports = getNextServer;
