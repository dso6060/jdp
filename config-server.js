// Server-side configuration for Justice Definitions Project Extension
// This file should be hosted on your server and fetched by the extension

const CONFIG = {
  // External Resource URLs (fetched from server)
  WEBHOOK_URL: process.env.WEBHOOK_URL || "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
  API_URL: process.env.API_URL || "https://jdc-definitions.wikibase.wiki/w/api.php",
  
  // Webhook Configuration
  WEBHOOK: {
    ENABLED: process.env.WEBHOOK_ENABLED !== 'false',
    TIMEOUT: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000,
    // Access key is now server-side only - not exposed to client
  },
  
  // API Configuration
  API: {
    TIMEOUT: parseInt(process.env.API_TIMEOUT) || 15000
  },
  
  // Rate Limiting Configuration
  RATE_LIMITING: {
    ENABLED: process.env.ENABLE_RATE_LIMITING !== 'false',
    REQUESTS_PER_MINUTE: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE) || 30,
    REQUESTS_PER_HOUR: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR) || 1000,
    WINDOW_SIZE_MS: 60000, // 1 minute
    HOUR_WINDOW_SIZE_MS: 3600000 // 1 hour
  },
  
  // Display Configuration
  DISPLAY: {
    MAX_CHARS: parseInt(process.env.MAX_CHARS) || 140,
    EXTENDED_CHARS: parseInt(process.env.EXTENDED_CHARS) || 200,
    MAX_EXTENDED_CHARS: parseInt(process.env.MAX_EXTENDED_CHARS) || 250,
    MIN_WORD_COUNT: parseInt(process.env.MIN_WORD_COUNT) || 4
  },
  
  // Security Configuration
  SECURITY: {
    ENABLE_ACCESS_KEY_VALIDATION: process.env.ENABLE_ACCESS_KEY_VALIDATION !== 'false',
    LOG_REQUESTS: process.env.LOG_REQUESTS !== 'false',
    ALLOWED_ORIGINS: [
      'chrome-extension://',
      'moz-extension://',
      'https://jdc-definitions.wikibase.wiki'
    ]
  },
  
  // Extension Metadata
  EXTENSION: {
    NAME: "Justice Definitions Project",
    VERSION: "0.9.0",
    DESCRIPTION: "Make legal language accessible by connecting webpage selections to the Justice Definitions Project"
  }
};

// Rate limiting storage (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map();

// Rate limiting middleware
function checkRateLimit(identifier) {
  if (!CONFIG.RATE_LIMITING.ENABLED) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const minuteKey = `${identifier}_minute_${Math.floor(now / CONFIG.RATE_LIMITING.WINDOW_SIZE_MS)}`;
  const hourKey = `${identifier}_hour_${Math.floor(now / CONFIG.RATE_LIMITING.HOUR_WINDOW_SIZE_MS)}`;
  
  // Check minute limit
  const minuteCount = rateLimitStore.get(minuteKey) || 0;
  if (minuteCount >= CONFIG.RATE_LIMITING.REQUESTS_PER_MINUTE) {
    return { 
      allowed: false, 
      reason: 'Rate limit exceeded (per minute)',
      retryAfter: CONFIG.RATE_LIMITING.WINDOW_SIZE_MS - (now % CONFIG.RATE_LIMITING.WINDOW_SIZE_MS)
    };
  }
  
  // Check hour limit
  const hourCount = rateLimitStore.get(hourKey) || 0;
  if (hourCount >= CONFIG.RATE_LIMITING.REQUESTS_PER_HOUR) {
    return { 
      allowed: false, 
      reason: 'Rate limit exceeded (per hour)',
      retryAfter: CONFIG.RATE_LIMITING.HOUR_WINDOW_SIZE_MS - (now % CONFIG.RATE_LIMITING.HOUR_WINDOW_SIZE_MS)
    };
  }
  
  // Increment counters
  rateLimitStore.set(minuteKey, minuteCount + 1);
  rateLimitStore.set(hourKey, hourCount + 1);
  
  // Clean up old entries (simple cleanup every 100 requests)
  if (Math.random() < 0.01) {
    const cutoff = now - (2 * CONFIG.RATE_LIMITING.HOUR_WINDOW_SIZE_MS);
    for (const [key, value] of rateLimitStore.entries()) {
      if (key.includes('_minute_') || key.includes('_hour_')) {
        const timestamp = parseInt(key.split('_').pop()) * (key.includes('_minute_') ? CONFIG.RATE_LIMITING.WINDOW_SIZE_MS : CONFIG.RATE_LIMITING.HOUR_WINDOW_SIZE_MS);
        if (timestamp < cutoff) {
          rateLimitStore.delete(key);
        }
      }
    }
  }
  
  return { allowed: true };
}

// Access key validation
function validateAccessKey(providedKey) {
  if (!CONFIG.SECURITY.ENABLE_ACCESS_KEY_VALIDATION) {
    return true;
  }
  
  const expectedKey = process.env.WEBHOOK_ACCESS_KEY;
  if (!expectedKey) {
    console.warn('WEBHOOK_ACCESS_KEY not set in environment variables');
    return false;
  }
  
  return providedKey === expectedKey;
}

// Request logging
function logRequest(identifier, endpoint, success, details = {}) {
  if (!CONFIG.SECURITY.LOG_REQUESTS) {
    return;
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    identifier,
    endpoint,
    success,
    userAgent: details.userAgent,
    ip: details.ip,
    ...details
  };
  
  console.log('JDP Request:', JSON.stringify(logEntry));
}

// Export for use in server endpoints
module.exports = {
  CONFIG,
  checkRateLimit,
  validateAccessKey,
  logRequest
};
