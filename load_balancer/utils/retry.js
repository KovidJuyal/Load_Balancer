const axios = require('axios');

async function retryRequest(req, server, attempt = 1, maxRetries = 3) {
  try {
    const fullUrl = server.url + (req.originalUrl || '/');
    console.log(`🌐 Attempting ${req.method} to ${fullUrl}`);

    const response = await axios({
      method: req.method,
      url: fullUrl,
      headers: req.headers,
      data: req.body,
      timeout: 3000  // Increased from 2000
    });

    return response;
  } catch (err) {
    if (attempt < maxRetries) {
      console.log(`🔁 Retry ${attempt} failed for ${server.url}. Retrying...`);
      return retryRequest(req, server, attempt + 1, maxRetries);
    } else {
      console.log(`❌ All ${maxRetries} retries failed for ${server.url}`);
      throw err;
    }
  }
}

module.exports = { retryRequest };
