// Express server for Justice Definitions Project Extension
// Provides secure configuration and rate limiting

const express = require('express');
const cors = require('cors');
const { CONFIG, checkRateLimit, validateAccessKey, logRequest } = require('./config-server');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = CONFIG.SECURITY.ALLOWED_ORIGINS.some(allowedOrigin => 
      origin.startsWith(allowedOrigin)
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request identifier middleware
app.use((req, res, next) => {
  // Use IP + User-Agent as identifier for rate limiting
  req.identifier = `${req.ip}_${req.get('User-Agent')?.slice(0, 50) || 'unknown'}`;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: CONFIG.EXTENSION.VERSION 
  });
});

// Configuration endpoint (public, no sensitive data)
app.get('/config', (req, res) => {
  // Rate limiting check
  const rateLimitResult = checkRateLimit(req.identifier);
  if (!rateLimitResult.allowed) {
    logRequest(req.identifier, '/config', false, { 
      reason: rateLimitResult.reason,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter
    });
  }
  
  // Return public configuration (no sensitive data)
  const publicConfig = {
    API_URL: CONFIG.API_URL,
    API: CONFIG.API,
    DISPLAY: CONFIG.DISPLAY,
    EXTENSION: CONFIG.EXTENSION,
    RATE_LIMITING: {
      ENABLED: CONFIG.RATE_LIMITING.ENABLED,
      REQUESTS_PER_MINUTE: CONFIG.RATE_LIMITING.REQUESTS_PER_MINUTE,
      REQUESTS_PER_HOUR: CONFIG.RATE_LIMITING.REQUESTS_PER_HOUR
    }
  };
  
  logRequest(req.identifier, '/config', true, { 
    userAgent: req.get('User-Agent'),
    ip: req.ip 
  });
  
  res.json(publicConfig);
});

// Webhook endpoint with access key validation
app.post('/webhook', (req, res) => {
  // Rate limiting check
  const rateLimitResult = checkRateLimit(req.identifier);
  if (!rateLimitResult.allowed) {
    logRequest(req.identifier, '/webhook', false, { 
      reason: rateLimitResult.reason,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter
    });
  }
  
  // Access key validation
  const providedKey = req.body.access_key || req.headers['x-access-key'];
  if (!validateAccessKey(providedKey)) {
    logRequest(req.identifier, '/webhook', false, { 
      reason: 'Invalid access key',
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    
    return res.status(401).json({
      error: 'Invalid access key'
    });
  }
  
  // Validate required fields
  const { term, page_url, timestamp } = req.body;
  if (!term || !page_url || !timestamp) {
    logRequest(req.identifier, '/webhook', false, { 
      reason: 'Missing required fields',
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    
    return res.status(400).json({
      error: 'Missing required fields: term, page_url, timestamp'
    });
  }
  
  // Forward to Google Apps Script (your existing webhook)
  const webhookData = {
    term,
    page_url,
    timestamp,
    access_key: providedKey
  };
  
  // Make request to Google Apps Script
  fetch(CONFIG.WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookData)
  })
  .then(response => {
    if (response.ok) {
      logRequest(req.identifier, '/webhook', true, { 
        term,
        userAgent: req.get('User-Agent'),
        ip: req.ip 
      });
      
      res.json({ 
        success: true, 
        message: 'Request submitted successfully' 
      });
    } else {
      throw new Error(`Webhook responded with status: ${response.status}`);
    }
  })
  .catch(error => {
    console.error('Webhook forwarding error:', error);
    
    logRequest(req.identifier, '/webhook', false, { 
      reason: 'Webhook forwarding failed',
      error: error.message,
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });
    
    res.status(500).json({
      error: 'Failed to submit request'
    });
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  logRequest(req.identifier, req.path, false, { 
    reason: 'Server error',
    error: error.message,
    userAgent: req.get('User-Agent'),
    ip: req.ip 
  });
  
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Justice Definitions Project server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Rate limiting: ${CONFIG.RATE_LIMITING.ENABLED ? 'enabled' : 'disabled'}`);
  console.log(`Access key validation: ${CONFIG.SECURITY.ENABLE_ACCESS_KEY_VALIDATION ? 'enabled' : 'disabled'}`);
});
