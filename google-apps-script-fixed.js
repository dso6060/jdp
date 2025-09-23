// Fixed Google Apps Script for Justice Definitions Project Webhook
// Addresses FormData parsing and other issues

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
    console.log('Request object type:', typeof e);
    console.log('Request object keys:', e ? Object.keys(e) : 'undefined');
    
    // Handle case where e might be undefined or null
    if (!e) {
      console.log('Request object is undefined/null, creating default');
      e = { parameter: {}, postData: null };
    }
    
    // Ensure e has required properties
    if (!e.parameter) {
      e.parameter = {};
    }
    if (!e.postData) {
      e.postData = null;
    }
    
    console.log('Normalized request object:', e);
    
    // Parse the request data first
    const requestData = parseRequestData(e);
    console.log('Parsed data:', requestData);
    console.log('Parsed data type:', typeof requestData);
    console.log('Parsed data keys:', requestData ? Object.keys(requestData) : 'undefined');
    
    // Validate that we have some data
    if (!requestData || Object.keys(requestData).length === 0) {
      console.log('No data parsed from request');
      return createResponse({
        success: false,
        error: 'No data received in request'
      }, 400);
    }
    
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
    console.error('Error stack:', error.stack);
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
      version: '3.0.1',
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

// Enhanced security validation - FIXED URL VALIDATION
function validateRequest(requestData, requestObject) {
  try {
    console.log('=== VALIDATING REQUEST ===');
    console.log('Request data for validation:', requestData);
    console.log('Request data type:', typeof requestData);
    
    // Handle undefined or null requestData
    if (!requestData) {
      console.log('Request data is undefined/null');
      return { valid: false, error: 'No request data provided' };
    }
    
    // Ensure requestData is an object
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object:', typeof requestData);
      return { valid: false, error: 'Invalid request data format' };
    }
    
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
      if (typeof requestData.term !== 'string') {
        return { valid: false, error: 'Term must be a string' };
      }
      
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
    
    // FIXED: More lenient URL validation
    if (requestData.page_url) {
      if (typeof requestData.page_url !== 'string') {
        return { valid: false, error: 'Page URL must be a string' };
      }
      
      try {
        const url = new URL(requestData.page_url);
        // Only check if it's a valid URL format, don't be too strict
        if (!url.protocol || (!url.protocol.startsWith('http'))) {
          return { valid: false, error: 'Invalid page URL protocol' };
        }
      } catch (urlError) {
        console.log('URL validation error:', urlError);
        // Be more lenient - only reject obviously invalid URLs
        if (!requestData.page_url.includes('http') && !requestData.page_url.includes('www.')) {
          return { valid: false, error: 'Invalid page URL format' };
        }
      }
    }
    
    console.log('Validation passed');
    return { valid: true };
    
  } catch (error) {
    console.error('Security validation error:', error);
    console.error('Error stack:', error.stack);
    return { valid: false, error: 'Security validation failed: ' + error.toString() };
  }
}

// Enhanced rate limiting with persistence
function checkRateLimit(requestData) {
  try {
    console.log('=== CHECKING RATE LIMIT ===');
    console.log('Request data for rate limiting:', requestData);
    console.log('Request data type:', typeof requestData);
    
    // Handle undefined or null requestData
    if (!requestData) {
      console.log('Request data is undefined/null for rate limiting, allowing request');
      return { allowed: true };
    }
    
    // Ensure requestData is an object
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object for rate limiting, allowing request');
      return { allowed: true };
    }
    
    const now = Date.now();
    const hourWindow = 3600000; // 1 hour in milliseconds
    const minuteWindow = 60000; // 1 minute in milliseconds
    
    // Create identifier from request data
    const identifier = createRequestIdentifier(requestData);
    console.log('Rate limit identifier:', identifier);
    
    // Check hourly limit
    const hourKey = `hour_${Math.floor(now / hourWindow)}_${identifier}`;
    const minuteKey = `minute_${Math.floor(now / minuteWindow)}_${identifier}`;
    
    // Use PropertiesService for persistence
    const scriptProperties = PropertiesService.getScriptProperties();
    
    // Get current counts
    const hourCount = parseInt(scriptProperties.getProperty(hourKey) || '0');
    const minuteCount = parseInt(scriptProperties.getProperty(minuteKey) || '0');
    
    console.log('Current counts - Hour:', hourCount, 'Minute:', minuteCount);
    console.log('Limits - Hour:', CONFIG.MAX_REQUESTS_PER_HOUR, 'Minute:', CONFIG.MAX_REQUESTS_PER_MINUTE);
    
    // Check limits
    if (hourCount >= CONFIG.MAX_REQUESTS_PER_HOUR) {
      const retryAfter = hourWindow - (now % hourWindow);
      console.log('Hourly rate limit exceeded');
      return {
        allowed: false,
        retryAfter: retryAfter,
        reason: 'Hourly rate limit exceeded'
      };
    }
    
    if (minuteCount >= CONFIG.MAX_REQUESTS_PER_MINUTE) {
      const retryAfter = minuteWindow - (now % minuteWindow);
      console.log('Minute rate limit exceeded');
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
    
    console.log('Rate limit check passed');
    return { allowed: true };
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    console.error('Error stack:', error.stack);
    // If rate limiting fails, allow the request
    return { allowed: true };
  }
}

// Create request identifier for rate limiting
function createRequestIdentifier(requestData) {
  try {
    console.log('=== CREATING REQUEST IDENTIFIER ===');
    console.log('Request data for identifier:', requestData);
    
    // Handle undefined or null requestData
    if (!requestData) {
      console.log('Request data is undefined/null for identifier, using default');
      return 'unknown_request';
    }
    
    // Ensure requestData is an object
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object for identifier, using default');
      return 'unknown_request';
    }
    
    // Use a combination of term and page URL to create identifier
    const term = requestData.term || 'unknown';
    const pageUrl = requestData.page_url || 'unknown';
    
    console.log('Term for identifier:', term);
    console.log('Page URL for identifier:', pageUrl);
    
    // Create a simple hash-like identifier
    const identifier = `${term.substring(0, 10)}_${pageUrl.substring(0, 20)}`.replace(/[^a-zA-Z0-9_]/g, '');
    console.log('Generated identifier:', identifier);
    
    return identifier;
    
  } catch (error) {
    console.error('Error creating request identifier:', error);
    return 'error_identifier';
  }
}

// Enhanced request logging
function logRequest(requestData, success, message) {
  try {
    if (!CONFIG.SECURITY.LOG_REQUESTS) {
      return;
    }
    
    console.log('=== LOGGING REQUEST ===');
    console.log('Request data for logging:', requestData);
    console.log('Success:', success);
    console.log('Message:', message);
    
    // Handle undefined or null requestData
    if (!requestData) {
      console.log('Request data is undefined/null for logging');
      requestData = {};
    }
    
    // Ensure requestData is an object
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object for logging');
      requestData = {};
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      term: requestData.term || 'unknown',
      page_url: requestData.page_url || 'unknown',
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
    
  } catch (error) {
    console.error('Error in logRequest:', error);
  }
}

// FIXED: Parse request data from different sources including FormData
function parseRequestData(e) {
  let data = {};
  
  try {
    console.log('=== PARSING REQUEST DATA ===');
    console.log('Request object for parsing:', e);
    console.log('Request object type:', typeof e);
    
    // Handle undefined e
    if (!e) {
      console.log('Request object is undefined, returning empty data');
      return data;
    }
    
    // Ensure parameter object exists
    if (!e.parameter) {
      console.log('Parameter object is undefined, creating empty object');
      e.parameter = {};
    }
    
    console.log('Parameter object:', e.parameter);
    console.log('Parameter keys:', Object.keys(e.parameter));
    
    // Try to get data from POST body first
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
      } else if (e.postData.type && e.postData.type.includes('multipart/form-data')) {
        // FIXED: Handle FormData (multipart/form-data)
        console.log('Processing FormData (multipart/form-data)');
        
        // For FormData, the data might be in parameters or we need to parse differently
        // Google Apps Script handles FormData differently
        if (e.parameter) {
          // FormData fields are often available in e.parameter
          data = { ...e.parameter };
        } else {
          // Fallback: try to parse the raw content
          const content = e.postData.contents;
          const lines = content.split('\r\n');
          let currentField = null;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('Content-Disposition: form-data; name="')) {
              const match = line.match(/name="([^"]+)"/);
              if (match) {
                currentField = match[1];
              }
            } else if (currentField && line.trim() && !line.startsWith('Content-')) {
              data[currentField] = line.trim();
              currentField = null;
            }
          }
        }
      }
    }
    
    // ALWAYS check URL parameters as fallback (this is where FormData often ends up)
    console.log('Checking URL parameters as fallback...');
    if (e.parameter) {
      if (e.parameter.term && !data.term) {
        data.term = e.parameter.term;
        console.log('Got term from parameters:', data.term);
      }
      if (e.parameter.page_url && !data.page_url) {
        data.page_url = e.parameter.page_url;
        console.log('Got page_url from parameters:', data.page_url);
      }
      if (e.parameter.timestamp && !data.timestamp) {
        data.timestamp = e.parameter.timestamp;
        console.log('Got timestamp from parameters:', data.timestamp);
      }
      if (e.parameter.access_key && !data.access_key) {
        data.access_key = e.parameter.access_key;
        console.log('Got access_key from parameters:', data.access_key);
      }
    }
    
    // If we still don't have data, try to get it from the request object directly
    if (Object.keys(data).length === 0) {
      console.log('No data found in postData or parameters, checking request object directly...');
      if (e.term) data.term = e.term;
      if (e.page_url) data.page_url = e.page_url;
      if (e.timestamp) data.timestamp = e.timestamp;
      if (e.access_key) data.access_key = e.access_key;
    }
    
    // Add metadata
    data.received_at = new Date().toISOString();
    data.source = 'enhanced_webhook';
    
    console.log('Final parsed data:', data);
    console.log('Final parsed data keys:', Object.keys(data));
    return data;
    
  } catch (error) {
    console.error('Error parsing request data:', error);
    console.error('Error stack:', error.stack);
    return {};
  }
}

// Store data in Google Sheet
function storeInSheet(data) {
  try {
    console.log('=== STORING IN SHEET ===');
    console.log('Data to store:', data);
    console.log('Data type:', typeof data);
    
    // Handle undefined or null data
    if (!data) {
      console.log('Data is undefined/null, creating default data');
      data = {};
    }
    
    // Ensure data is an object
    if (typeof data !== 'object') {
      console.log('Data is not an object, creating default data');
      data = {};
    }
    
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
    
    // Prepare row data with additional fields - handle undefined values
    const rowData = [
      data.timestamp ? new Date(data.timestamp) : new Date(),
      data.term || 'unknown',
      data.page_url || 'unknown',
      'Received',
      data.source || 'enhanced_webhook',
      data.received_at ? new Date(data.received_at) : new Date(),
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
    console.error('Error stack:', error.stack);
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
