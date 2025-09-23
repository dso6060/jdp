// Configuration file for Justice Definitions Project Extension
// This file now fetches configuration from the secure server

// Default configuration (fallback)
const DEFAULT_CONFIG = {
  // External Resource URLs
  API_URL: "https://jdc-definitions.wikibase.wiki/w/api.php",
  
  // Webhook Configuration (now server-side)
  WEBHOOK: {
    ENABLED: true,
    TIMEOUT: 10000,
    ENDPOINT: `${WEBHOOK_SERVER_URL}/webhook`
  },
  
  // API Configuration
  API: {
    TIMEOUT: 15000
  },
  
  // Display Configuration
  DISPLAY: {
    MAX_CHARS: 140,
    EXTENDED_CHARS: 200,
    MAX_EXTENDED_CHARS: 250,
    MIN_WORD_COUNT: 4
  },
  
  // Extension Metadata
  EXTENSION: {
    NAME: "Justice Definitions Project",
    VERSION: "0.9.0",
    DESCRIPTION: "Make legal language accessible by connecting webpage selections to the Justice Definitions Project"
  }
};

// Server configuration URL (update this to your deployed server)
const CONFIG_SERVER_URL = "https://script.google.com/macros/s/AKfycbxGFWi9vIqBin1MdJwEr1N2iwqdaYRpG_i6WqKp8aB3RUxgpsx7As2svt25JPUxkbGU/exec";

// Webhook server URL (update this to your deployed server)
const WEBHOOK_SERVER_URL = "https://script.google.com/macros/s/AKfycbxGFWi9vIqBin1MdJwEr1N2iwqdaYRpG_i6WqKp8aB3RUxgpsx7As2svt25JPUxkbGU/exec"; // Using Google Apps Script as fallback

// Rate limiting storage
const rateLimitStore = {
  requests: new Map(),
  lastCleanup: Date.now()
};

// Rate limiting function
function checkClientRateLimit() {
  const now = Date.now();
  const windowSize = 60000; // 1 minute
  const maxRequests = 30; // per minute
  
  // Clean up old entries every 5 minutes
  if (now - rateLimitStore.lastCleanup > 300000) {
    for (const [key, timestamp] of rateLimitStore.requests.entries()) {
      if (now - timestamp > windowSize) {
        rateLimitStore.requests.delete(key);
      }
    }
    rateLimitStore.lastCleanup = now;
  }
  
  // Count requests in current window
  const windowStart = now - windowSize;
  const recentRequests = Array.from(rateLimitStore.requests.values())
    .filter(timestamp => timestamp > windowStart).length;
  
  if (recentRequests >= maxRequests) {
    return false;
  }
  
  // Record this request
  rateLimitStore.requests.set(now, now);
  return true;
}

// Fetch configuration from server
async function fetchServerConfig() {
  try {
    // Check client-side rate limiting first
    if (!checkClientRateLimit()) {
      console.warn('Client rate limit exceeded, using default config');
      return DEFAULT_CONFIG;
    }
    
    const response = await fetch(CONFIG_SERVER_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`Server config fetch failed: ${response.status}`);
    }
    
    const serverConfig = await response.json();
    console.log('Server configuration loaded successfully');
    
    // Add webhook endpoint to the configuration
    const configWithWebhook = { 
      ...DEFAULT_CONFIG, 
      ...serverConfig,
      WEBHOOK: {
        ...DEFAULT_CONFIG.WEBHOOK,
        ...serverConfig.WEBHOOK,
        ENDPOINT: `${WEBHOOK_SERVER_URL}/webhook`
      }
    };
    
    return configWithWebhook;
  } catch (error) {
    console.warn('Failed to fetch server configuration, using defaults:', error.message);
    return DEFAULT_CONFIG;
  }
}

// Initialize configuration
let CONFIG = DEFAULT_CONFIG;

// Load server configuration asynchronously
fetchServerConfig().then(serverConfig => {
  CONFIG = serverConfig;
  console.log('Configuration updated from server');
});

// Make config available globally for extension
window.EXTENSION_CONFIG = CONFIG;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
