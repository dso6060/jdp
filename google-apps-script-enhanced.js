// Enhanced Google Apps Script for Justice Definitions Project Webhook
// Complete, production-ready version with enhanced security

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  SHEET_ID: '1H9xMQbnky7cDUaqlGVXeNwg5S9S57pxKE3MsyrhIyug', // Your Google Sheet ID
  
  // Security Configuration
  SECURITY: {
    ENABLE_ACCESS_KEY_VALIDATION: false, // Set to true to enable access key validation
    ACCESS_KEY: 'jdp-secure-key-2024', // Change this to your own secret key
    ALLOWED_ORIGINS: [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'brave-extension://'
    ],
    LOG_REQUESTS: true
  },
  
  // Rate Limiting Configuration
  RATE_LIMIT_ENABLED: true,
  MAX_REQUESTS_PER_HOUR: 1000,
  MAX_REQUESTS_PER_MINUTE: 30
};

// Main function to handle POST requests
function doPost(e) {
  try {
    console.log('=== POST REQUEST STARTED ===');
    console.log('Request object:', e);
    
    // Handle case where e might be undefined
    if (!e) {
      console.log('Request object is undefined, creating default');
      e = { parameter: {}, postData: null };
    }
    
    // Parse the request data first
    const requestData = parseRequestData(e);
    console.log('Parsed data:', requestData);
    
    // Security validation
    const securityResult = validateRequest(requestData, e);
    if (!securityResult.valid) {
      console.log('Security validation failed:', securityResult.error);
      return createResponse({
        success: false,
        error: securityResult.error
      }, 401);
    }
    
    // Check rate limiting
    if (CONFIG.RATE_LIMIT_ENABLED) {
      const rateLimitResult = checkRateLimit(requestData);
      if (!rateLimitResult.allowed) {
        console.log('Rate limit exceeded:', rateLimitResult);
        return createResponse({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }, 429);
      }
    }
    
    // Validate required fields
    if (!requestData.term) {
      return createResponse({
        success: false,
        error: 'Missing required field: term'
      }, 400);
    }
    
    // Store data in Google Sheet
    const result = storeInSheet(requestData);
    console.log('Store result:', result);
    
    if (result.success) {
      // Log successful request
      if (CONFIG.SECURITY.LOG_REQUESTS) {
        logRequest(requestData, true, 'Request stored successfully');
      }
      
      return createResponse({
        success: true,
        message: 'Request stored successfully',
        row: result.row
      }, 200);
    } else {
      return createResponse({
        success: false,
        error: 'Failed to store request: ' + result.error
      }, 500);
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse({
      success: false,
      error: 'Internal server error: ' + error.toString()
    }, 500);
  }
}

// Handle GET requests (for testing and health checks)
function doGet(e) {
  try {
    console.log('=== GET REQUEST STARTED ===');
    console.log('Request object:', e);
    
    // Handle case where e might be undefined
    if (!e) {
      console.log('Request object is undefined, creating default');
      e = { parameter: {} };
    }
    
    // Return health status
    return createResponse({
      success: true,
      message: 'Justice Definitions Project Webhook is running',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      rateLimitEnabled: CONFIG.RATE_LIMIT_ENABLED,
      securityEnabled: CONFIG.SECURITY.ENABLE_ACCESS_KEY_VALIDATION
    }, 200);
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({
      success: false,
      error: 'Internal server error: ' + error.toString()
    }, 500);
  }
}

// Handle OPTIONS requests (for CORS preflight)
function doOptions(e) {
  console.log('=== OPTIONS REQUEST (CORS PREFLIGHT) ===');
  return createResponse({
    success: true,
    message: 'CORS preflight successful'
  }, 200);
}

// Enhanced security validation
function validateRequest(requestData, requestObject) {
  try {
    // Check access key if validation is enabled
    if (CONFIG.SECURITY.ENABLE_ACCESS_KEY_VALIDATION) {
      if (!requestData.access_key) {
        return { valid: false, error: 'Access key required' };
      }
      
      if (requestData.access_key !== CONFIG.SECURITY.ACCESS_KEY) {
        return { valid: false, error: 'Invalid access key' };
      }
    }
    
    // Validate term length and content
    if (requestData.term) {
      if (requestData.term.length < 2) {
        return { valid: false, error: 'Term too short' };
      }
      
      if (requestData.term.length > 100) {
        return { valid: false, error: 'Term too long' };
      }
      
      // Basic XSS protection
      if (requestData.term.includes('<script') || requestData.term.includes('javascript:')) {
        return { valid: false, error: 'Invalid term content' };
      }
    }
    
    // Validate page URL
    if (requestData.page_url) {
      try {
        new URL(requestData.page_url);
      } catch (urlError) {
        return { valid: false, error: 'Invalid page URL' };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('Security validation error:', error);
    return { valid: false, error: 'Security validation failed' };
  }
}

// Enhanced rate limiting with persistence
function checkRateLimit(requestData) {
  try {
    const now = Date.now();
    const hourWindow = 3600000; // 1 hour in milliseconds
    const minuteWindow = 60000; // 1 minute in milliseconds
    
    // Create identifier from request data
    const identifier = createRequestIdentifier(requestData);
    
    // Check hourly limit
    const hourKey = `hour_${Math.floor(now / hourWindow)}_${identifier}`;
    const minuteKey = `minute_${Math.floor(now / minuteWindow)}_${identifier}`;
    
    // Use PropertiesService for persistence
    const scriptProperties = PropertiesService.getScriptProperties();
    
    // Get current counts
    const hourCount = parseInt(scriptProperties.getProperty(hourKey) || '0');
    const minuteCount = parseInt(scriptProperties.getProperty(minuteKey) || '0');
    
    // Check limits
    if (hourCount >= CONFIG.MAX_REQUESTS_PER_HOUR) {
      const retryAfter = hourWindow - (now % hourWindow);
      return {
        allowed: false,
        retryAfter: retryAfter,
        reason: 'Hourly rate limit exceeded'
      };
    }
    
    if (minuteCount >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      const retryAfter = minuteWindow - (now % minuteWindow);
      return {
        allowed: false,
        retryAfter: retryAfter,
        reason: 'Minute rate limit exceeded'
      };
    }
    
    // Increment counters
    scriptProperties.setProperty(hourKey, (hourCount + 1).toString());
    scriptProperties.setProperty(minuteKey, (minuteCount + 1).toString());
    
    // Clean up old entries (keep only last 2 hours)
    const cutoff = now - (2 * hourWindow);
    const allProperties = scriptProperties.getProperties();
    for (const key in allProperties) {
      if (key.startsWith('hour_') || key.startsWith('minute_')) {
        const timestamp = parseInt(key.split('_')[1]) * (key.startsWith('hour_') ? hourWindow : minuteWindow);
        if (timestamp < cutoff) {
          scriptProperties.deleteProperty(key);
        }
      }
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request
    return { allowed: true };
  }
}

// Create request identifier for rate limiting
function createRequestIdentifier(requestData) {
  // Use a combination of term and page URL to create identifier
  const term = requestData.term || 'unknown';
  const pageUrl = requestData.page_url || 'unknown';
  
  // Create a simple hash-like identifier
  return `${term.substring(0, 10)}_${pageUrl.substring(0, 20)}`.replace(/[^a-zA-Z0-9_]/g, '');
}

// Enhanced request logging
function logRequest(requestData, success, message) {
  if (!CONFIG.SECURITY.LOG_REQUESTS) {
    return;
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    term: requestData.term,
    page_url: requestData.page_url,
    success: success,
    message: message,
    access_key_provided: !!requestData.access_key
  };
  
  console.log('JDP Request Log:', JSON.stringify(logEntry));
  
  // Optionally store logs in a separate sheet
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let logSheet = spreadsheet.getSheetByName('Request Logs');
    
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet('Request Logs');
      logSheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Term', 'Page URL', 'Success', 'Message', 'Access Key Provided']
      ]);
      logSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    }
    
    logSheet.appendRow([
      logEntry.timestamp,
      logEntry.term,
      logEntry.page_url,
      logEntry.success,
      logEntry.message,
      logEntry.access_key_provided
    ]);
  } catch (error) {
    console.error('Failed to log to sheet:', error);
  }
}

// Parse request data from different sources
function parseRequestData(e) {
  let data = {};
  
  try {
    console.log('=== PARSING REQUEST DATA ===');
    console.log('Request object for parsing:', e);
    
    // Handle undefined e
    if (!e) {
      console.log('Request object is undefined, returning empty data');
      return data;
    }
    
    // Ensure parameter object exists
    if (!e.parameter) {
      e.parameter = {};
    }
    
    // Try to get data from POST body
    if (e.postData && e.postData.contents) {
      console.log('PostData contents:', e.postData.contents);
      console.log('PostData type:', e.postData.type);
      
      if (e.postData.type === 'application/json') {
        data = JSON.parse(e.postData.contents);
      } else if (e.postData.type === 'application/x-www-form-urlencoded') {
        // Parse form data
        const params = e.postData.contents.split('&');
        params.forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            data[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        });
      }
    }
    
    // Fallback to URL parameters
    if (!data.term && e.parameter.term) {
      data.term = e.parameter.term;
    }
    if (!data.page_url && e.parameter.page_url) {
      data.page_url = e.parameter.page_url;
    }
    if (!data.timestamp && e.parameter.timestamp) {
      data.timestamp = e.parameter.timestamp;
    }
    if (!data.access_key && e.parameter.access_key) {
      data.access_key = e.parameter.access_key;
    }
    
    // Add metadata
    data.received_at = new Date().toISOString();
    data.source = 'enhanced_webhook';
    
    console.log('Final parsed data:', data);
    return data;
    
  } catch (error) {
    console.error('Error parsing request data:', error);
    return {};
  }
}

// Store data in Google Sheet
function storeInSheet(data) {
  try {
    console.log('=== STORING IN SHEET ===');
    console.log('Data to store:', data);
    
    // Check if SHEET_ID is configured
    if (CONFIG.SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
      return { success: false, error: 'SHEET_ID not configured. Please update CONFIG.SHEET_ID with your Google Sheet ID.' };
    }
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = spreadsheet.getSheetByName('Definition Requests');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating new sheet: Definition Requests');
      sheet = spreadsheet.insertSheet('Definition Requests');
      
      // Add headers with additional columns for enhanced security
      sheet.getRange(1, 1, 1, 7).setValues([
        ['Timestamp', 'Term', 'Page URL', 'Status', 'Source', 'Received At', 'Access Key Used']
      ]);
      
      // Format headers
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 7).setBackground('#4285f4');
      sheet.getRange(1, 1, 1, 7).setFontColor('white');
    }
    
    // Prepare row data with additional fields
    const rowData = [
      new Date(data.timestamp || new Date()),
      data.term || '',
      data.page_url || '',
      'Received',
      data.source || 'enhanced_webhook',
      new Date(data.received_at || new Date()),
      data.access_key ? 'Yes' : 'No'
    ];
    
    console.log('Row data to append:', rowData);
    
    // Add data to sheet
    sheet.appendRow(rowData);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 7);
    
    console.log('Data stored successfully at row:', sheet.getLastRow());
    return { success: true, row: sheet.getLastRow() };
    
  } catch (error) {
    console.error('Error storing in sheet:', error);
    return { success: false, error: error.toString() };
  }
}

// Create HTTP response - FIXED VERSION without setHeaders
function createResponse(data, statusCode) {
  const response = {
    ...data,
    status: statusCode,
    timestamp: new Date().toISOString()
  };
  
  console.log('=== SENDING RESPONSE ===');
  console.log('Response:', response);
  
  // Google Apps Script doesn't support setHeaders, so we return the response directly
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function to verify the script works
function testWebhook() {
  console.log('=== TESTING ENHANCED WEBHOOK ===');
  
  const testData = {
    term: 'test legal term',
    page_url: 'https://example.com',
    timestamp: new Date().toISOString(),
    access_key: CONFIG.SECURITY.ACCESS_KEY,
    source: 'test'
  };
  
  console.log('Testing webhook with data:', testData);
  
  const result = storeInSheet(testData);
  console.log('Test result:', result);
  return result;
}

// Test function for security validation
function testSecurity() {
  console.log('=== TESTING SECURITY VALIDATION ===');
  
  const testData = {
    term: 'test term',
    page_url: 'https://example.com',
    access_key: CONFIG.SECURITY.ACCESS_KEY
  };
  
  const result = validateRequest(testData, {});
  console.log('Security test result:', result);
  return result;
}

// Test function for rate limiting
function testRateLimit() {
  console.log('=== TESTING RATE LIMITING ===');
  
  const testData = {
    term: 'rate limit test',
    page_url: 'https://example.com',
    timestamp: new Date().toISOString()
  };
  
  const result = checkRateLimit(testData);
  console.log('Rate limit test result:', result);
  return result;
}

// Function to get current rate limit status
function getRateLimitStatus() {
  const now = Date.now();
  const hourWindow = 3600000;
  const minuteWindow = 60000;
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();
  
  const hourKeys = Object.keys(allProperties).filter(key => key.startsWith('hour_'));
  const minuteKeys = Object.keys(allProperties).filter(key => key.startsWith('minute_'));
  
  return {
    currentHour: Math.floor(now / hourWindow),
    currentMinute: Math.floor(now / minuteWindow),
    totalHourlyEntries: hourKeys.length,
    totalMinuteEntries: minuteKeys.length,
    maxRequestsPerHour: CONFIG.MAX_REQUESTS_PER_HOUR,
    maxRequestsPerMinute: CONFIG.MAX_REQUESTS_PER_MINUTE,
    rateLimitEnabled: CONFIG.RATE_LIMIT_ENABLED
  };
}

// Function to clear rate limit data (for testing)
function clearRateLimitData() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const allProperties = scriptProperties.getProperties();
  
  for (const key in allProperties) {
    if (key.startsWith('hour_') || key.startsWith('minute_')) {
      scriptProperties.deleteProperty(key);
    }
  }
  
  console.log('Rate limit data cleared');
  return { success: true, message: 'Rate limit data cleared' };
}

// Function to update security configuration
function updateSecurityConfig() {
  console.log('=== CURRENT SECURITY CONFIGURATION ===');
  console.log('Access Key Validation:', CONFIG.SECURITY.ENABLE_ACCESS_KEY_VALIDATION);
  console.log('Allowed Origins:', CONFIG.SECURITY.ALLOWED_ORIGINS);
  console.log('Request Logging:', CONFIG.SECURITY.LOG_REQUESTS);
  console.log('Rate Limiting:', CONFIG.RATE_LIMIT_ENABLED);
  console.log('Max Requests/Hour:', CONFIG.MAX_REQUESTS_PER_HOUR);
  console.log('Max Requests/Minute:', CONFIG.MAX_REQUESTS_PER_MINUTE);
  
  return {
    security: CONFIG.SECURITY,
    rateLimiting: {
      enabled: CONFIG.RATE_LIMIT_ENABLED,
      maxPerHour: CONFIG.MAX_REQUESTS_PER_HOUR,
      maxPerMinute: CONFIG.MAX_REQUESTS_PER_MINUTE
    }
  };
}
