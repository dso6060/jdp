// Justice Definitions Project - Google Apps Script Webhook
// Open Source Version - Replace placeholders with your own values
// 
// This script handles webhook requests from the browser extension,
// validates them, logs geographic data, and stores requests in Google Sheets.
//
// SETUP INSTRUCTIONS:
// 1. Create a new Google Apps Script project
// 2. Replace all placeholder values below with your own
// 3. Deploy as web app with execute permissions for "Anyone"
// 4. Share your Google Sheet with the service account email
//
// IMPORTANT: Keep your secrets secure and never commit them to public repositories!

// Configuration - Replace with your own values
const CONFIG = {
  // Google Sheets Configuration
  // Replace with your Google Sheet ID (found in the URL)
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
  
  // Service Account Configuration (Optional - for enhanced security)
  // Create a service account in Google Cloud Console and download the JSON key
  SERVICE_ACCOUNT: {
    CLIENT_EMAIL: 'your-service-account@your-project.iam.gserviceaccount.com',
    PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n',
    PROJECT_ID: 'your-google-cloud-project-id'
  },
  
  // Security Configuration
  SECURITY: {
    // Enable access key validation (recommended for production)
    ENABLE_ACCESS_KEY_VALIDATION: true,
    // Replace with your own secure access key
    ACCESS_KEY: 'your_secure_access_key_here',
    ALLOWED_ORIGINS: [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'brave-extension://'
    ],
    LOG_REQUESTS: true,
    LOG_IP_ADDRESSES: true,
    LOG_GEOGRAPHY: true
  },
  
  // Rate Limiting Configuration
  RATE_LIMIT_ENABLED: true,
  MAX_REQUESTS_PER_HOUR: 1000,
  MAX_REQUESTS_PER_MINUTE: 30,
  
  // Geographic Logging Configuration
  GEOGRAPHIC_LOGGING: {
    ENABLED: true,
    GEOLOCATION_API: 'https://ipapi.co/',
    LOG_NON_INDIA_REQUESTS: true,
    LOG_ALL_REQUESTS: false
  }
};

// Main function to handle POST requests
function doPost(e) {
  try {
    console.log('=== POST REQUEST STARTED ===');
    console.log('Request object:', e);
    
    // Handle case where e might be undefined or null
    if (!e) {
      console.log('Request object is null/undefined, creating default');
      e = { parameter: {}, postData: null };
    }
    
    // Ensure e has required properties
    if (!e.parameter) {
      console.log('Parameter object missing, creating default');
      e.parameter = {};
    }
    if (!e.postData) {
      console.log('PostData missing, creating default');
      e.postData = null;
    }
    
    // Get client IP address
    const clientIP = getClientIP(e);
    console.log('Client IP:', clientIP);
    
    // Parse the request data first
    const requestData = parseRequestData(e);
    console.log('Parsed data:', requestData);
    
    // Validate that we have some data
    if (!requestData || Object.keys(requestData).length === 0) {
      console.log('No data parsed from request');
      return createResponse({
        success: false,
        error: 'No data received in request'
      }, 400);
    }
    
    // Get geographic data
    const geoData = getGeographicData(clientIP);
    console.log('Geographic data:', geoData);
    
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
      const rateLimitResult = checkRateLimit(requestData, clientIP);
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
    
    // Store data in Google Sheet with all logs consolidated
    const result = storeInSheet(requestData, geoData, clientIP);
    console.log('Store result:', result);
    
    if (result.success) {
      console.log('=== REQUEST SUCCESSFUL ===');
      const successResponse = {
        success: true,
        message: 'Request stored successfully',
        row: result.row,
        timestamp: new Date().toISOString()
      };
      console.log('Success response:', successResponse);
      return createResponse(successResponse, 200);
    } else {
      console.log('=== REQUEST FAILED ===');
      const errorResponse = {
        success: false,
        error: 'Failed to store request: ' + result.error,
        timestamp: new Date().toISOString()
      };
      console.log('Error response:', errorResponse);
      return createResponse(errorResponse, 500);
    }
    
  } catch (error) {
    console.error('=== CRITICAL ERROR ===');
    console.error('Error processing request:', error);
    console.error('Error stack:', error.stack);
    const criticalErrorResponse = {
      success: false,
      error: 'Internal server error: ' + error.toString(),
      timestamp: new Date().toISOString()
    };
    console.log('Critical error response:', criticalErrorResponse);
    return createResponse(criticalErrorResponse, 500);
  }
}

// Handle GET requests (for testing and health checks)
function doGet(e) {
  try {
    console.log('=== GET REQUEST STARTED ===');
    
    // Handle case where e might be undefined
    if (!e) {
      e = { parameter: {} };
    }
    
    // Return health status
    return createResponse({
      success: true,
      message: 'Justice Definitions Project Webhook is running',
      version: '1.0.0-open-source',
      timestamp: new Date().toISOString(),
      rateLimitEnabled: CONFIG.RATE_LIMIT_ENABLED,
      securityEnabled: CONFIG.SECURITY.ENABLE_ACCESS_KEY_VALIDATION,
      geographicLogging: CONFIG.GEOGRAPHIC_LOGGING.ENABLED
    }, 200);
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({
      success: false,
      error: 'Internal server error: ' + error.toString()
    }, 500);
  }
}

// Get client IP address from request
function getClientIP(e) {
  try {
    // Handle case where e might be undefined
    if (!e) {
      return 'unknown';
    }
    
    console.log('Request object for IP detection:', e);
    console.log('All parameters:', e.parameter);
    
    // Method 1: Try to extract IP from the request data itself (from background script)
    if (e.postData && e.postData.contents) {
      try {
        const requestData = JSON.parse(e.postData.contents);
        if (requestData && requestData.client_ip) {
          console.log('Client IP from request data:', requestData.client_ip);
          return requestData.client_ip;
        }
      } catch (parseError) {
        console.log('Could not parse request data for IP:', parseError.message);
      }
    }
    
    // Method 2: Use a service to get the server's IP (Google Apps Script server IP)
    // This is the most reliable method for Google Apps Script
    try {
      const response = UrlFetchApp.fetch('https://httpbin.org/ip', {
        method: 'GET',
        muteHttpExceptions: true,
        timeout: 3000
      });
      
      if (response.getResponseCode() === 200) {
        const ipData = JSON.parse(response.getContentText());
        if (ipData && ipData.origin) {
          console.log('Server IP detected via httpbin:', ipData.origin);
          // Return just the IP without prefix for geolocation lookup
          return ipData.origin;
        }
      }
    } catch (httpbinError) {
      console.log('Httpbin service failed:', httpbinError.message);
    }
    
    // Method 3: Try to get IP from request headers (if available)
    const ip = e.parameter?.ip || 
               e.parameter?.client_ip ||
               e.parameter?.remote_addr ||
               e.parameter?.x_forwarded_for ||
               e.parameter?.x_real_ip ||
               e.parameter?.cf_connecting_ip ||
               'unknown';
    
    console.log('Client IP from parameters:', ip);
    
    // If we got a valid IP from parameters, return it
    if (ip && ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
      return ip;
    }
    
    console.log('No valid client IP found, returning unknown');
    return 'unknown';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return 'unknown';
  }
}

// Cache for geolocation data to avoid repeated API calls
const geolocationCache = {};

// Function to clean up old cache entries
function cleanupGeolocationCache() {
  const now = Date.now();
  const maxCacheAge = 5 * 60 * 1000; // 5 minutes
  
  for (const [key, value] of Object.entries(geolocationCache)) {
    if (now - value.timestamp > maxCacheAge) {
      delete geolocationCache[key];
      console.log('Cleaned up expired cache entry for IP:', key);
    }
  }
}

// Get geographic data for IP address with caching and rate limiting
function getGeographicData(ip) {
  try {
    // Handle undefined or invalid IP
    if (!ip || ip === 'unknown' || ip === 'undefined') {
      console.log('Invalid IP address provided:', ip);
      return {
        ip: 'unknown',
        country: 'unknown',
        region: 'unknown',
        city: 'unknown',
        isIndia: false,
        timestamp: new Date().toISOString()
      };
    }
    
    if (!CONFIG.GEOGRAPHIC_LOGGING.ENABLED) {
      return {
        ip: ip,
        country: 'unknown',
        region: 'unknown',
        city: 'unknown',
        isIndia: false,
        timestamp: new Date().toISOString()
      };
    }
    
    // Check cache first
    const cacheKey = ip;
    if (geolocationCache[cacheKey]) {
      const cachedData = geolocationCache[cacheKey];
      const cacheAge = Date.now() - cachedData.timestamp;
      const maxCacheAge = 5 * 60 * 1000; // 5 minutes
      
      if (cacheAge < maxCacheAge) {
        console.log('Using cached geolocation data for IP:', ip);
        return cachedData;
      } else {
        console.log('Cache expired for IP:', ip, 'age:', cacheAge);
        delete geolocationCache[cacheKey];
      }
    }
    
    console.log('Fetching geographic data for IP:', ip);
    
    // Clean up old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupGeolocationCache();
    }
    
    try {
      // Try multiple geolocation services for better reliability
      const services = [
        {
          name: 'ipapi.co',
          url: `https://ipapi.co/${ip}/json/`,
          parser: (data) => ({
            country: data.country_name,
            region: data.region,
            city: data.city
          })
        },
        {
          name: 'ip-api.com',
          url: `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,query`,
          parser: (data) => ({
            country: data.country,
            region: data.regionName,
            city: data.city
          })
        }
      ];
      
      for (const service of services) {
        try {
          console.log(`Trying geolocation service: ${service.name}`);
          console.log(`API URL: ${service.url}`);
          
          const response = UrlFetchApp.fetch(service.url, {
            method: 'GET',
            muteHttpExceptions: true,
            timeout: 5000
          });
          
          const responseCode = response.getResponseCode();
          console.log(`${service.name} response code:`, responseCode);
          
          if (responseCode === 200) {
            const responseText = response.getContentText();
            console.log(`${service.name} response text:`, responseText);
            
            if (responseText) {
              const geoData = JSON.parse(responseText);
              console.log(`${service.name} parsed data:`, geoData);
              
              // Check for errors in response
              if (geoData.error || geoData.status === 'fail') {
                console.log(`${service.name} returned error:`, geoData.message || geoData.reason);
                continue; // Try next service
              }
              
              // Parse data using service-specific parser
              const parsed = service.parser(geoData);
              console.log(`${service.name} parsed result:`, parsed);
              
              // Check if we got valid data
              if (parsed.country && parsed.country !== 'unknown') {
                const result = {
                  ip: geoData.ip || geoData.query || ip,
                  country: parsed.country,
                  region: parsed.region || 'unknown',
                  city: parsed.city || 'unknown',
                  isIndia: parsed.country === 'India',
                  timestamp: new Date().toISOString(),
                  source: service.name
                };
                
                // Cache the successful result
                geolocationCache[cacheKey] = result;
                console.log(`Success with ${service.name}:`, result);
                return result;
              }
            }
          } else {
            console.log(`${service.name} failed with status:`, responseCode);
          }
        } catch (serviceError) {
          console.log(`${service.name} error:`, serviceError.message);
          continue; // Try next service
        }
      }
      
      // If all services failed, return unknown
      console.log('All geolocation services failed, returning unknown');
      return {
        ip: ip,
        country: 'unknown',
        region: 'unknown',
        city: 'unknown',
        isIndia: false,
        timestamp: new Date().toISOString(),
        source: 'all_services_failed'
      };
    } catch (apiError) {
      // Handle API-specific errors (rate limiting, network issues, etc.)
      console.log('Geographic API request failed:', apiError.message);
      return {
        ip: ip,
        country: 'unknown',
        region: 'unknown',
        city: 'unknown',
        isIndia: false,
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('Error in getGeographicData:', error);
    return {
      ip: ip || 'unknown',
      country: 'unknown',
      region: 'unknown',
      city: 'unknown',
      isIndia: false,
      timestamp: new Date().toISOString()
    };
  }
}

// Enhanced security validation
function validateRequest(requestData, requestObject) {
  try {
    console.log('=== VALIDATING REQUEST ===');
    console.log('Request data for validation:', requestData);
    
    // Handle undefined or null requestData
    if (!requestData) {
      console.log('Request data is undefined/null');
      return { valid: false, error: 'No request data provided' };
    }
    
    // Ensure requestData is an object
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object');
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
    
    // URL validation
    if (requestData.page_url) {
      if (typeof requestData.page_url !== 'string') {
        return { valid: false, error: 'Page URL must be a string' };
      }
      
      const url = requestData.page_url.trim();
      if (url.length < 5) {
        return { valid: false, error: 'Page URL too short' };
      }
      
      if (!url.includes('.') && !url.includes('://')) {
        return { valid: false, error: 'Page URL format invalid' };
      }
    }
    
    console.log('Validation passed');
    return { valid: true };
    
  } catch (error) {
    console.error('Security validation error:', error);
    return { valid: false, error: 'Security validation failed: ' + error.toString() };
  }
}

// Enhanced rate limiting with IP-based tracking
function checkRateLimit(requestData, clientIP) {
  try {
    console.log('=== CHECKING RATE LIMIT ===');
    console.log('Request data for rate limiting:', requestData);
    console.log('Client IP:', clientIP);
    
    if (!requestData) {
      console.log('Request data is undefined/null for rate limiting, allowing request');
      return { allowed: true };
    }
    
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object for rate limiting, allowing request');
      return { allowed: true };
    }
    
    const now = Date.now();
    const hourWindow = 3600000; // 1 hour in milliseconds
    const minuteWindow = 60000; // 1 minute in milliseconds
    
    // Create identifier from request data and IP
    const identifier = createRequestIdentifier(requestData, clientIP);
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
    return { allowed: true };
  }
}

// Create request identifier for rate limiting (includes IP)
function createRequestIdentifier(requestData, clientIP) {
  try {
    console.log('=== CREATING REQUEST IDENTIFIER ===');
    console.log('Request data for identifier:', requestData);
    console.log('Client IP for identifier:', clientIP);
    
    if (!requestData) {
      console.log('Request data is undefined/null for identifier, using default');
      return `unknown_request_${clientIP || 'unknown'}`;
    }
    
    if (typeof requestData !== 'object') {
      console.log('Request data is not an object for identifier, using default');
      return `unknown_request_${clientIP || 'unknown'}`;
    }
    
    const term = requestData.term || 'unknown';
    const pageUrl = requestData.page_url || 'unknown';
    
    // Create identifier with IP for better tracking
    const identifier = `${term.substring(0, 10)}_${pageUrl.substring(0, 20)}_${clientIP || 'unknown'}`.replace(/[^a-zA-Z0-9_]/g, '');
    console.log('Generated identifier:', identifier);
    
    return identifier;
    
  } catch (error) {
    console.error('Error creating request identifier:', error);
    return `error_identifier_${clientIP || 'unknown'}`;
  }
}

// Parse request data from different sources including FormData
function parseRequestData(e) {
  let data = {};
  
  try {
    console.log('=== PARSING REQUEST DATA ===');
    console.log('Request object for parsing:', e);
    
    if (!e) {
      console.log('Request object is undefined, returning empty data');
      return data;
    }
    
    if (!e.parameter) {
      console.log('Parameter object is undefined, creating empty object');
      e.parameter = {};
    }
    
    console.log('Parameter object:', e.parameter);
    
    // Try to get data from POST body first
    if (e.postData && e.postData.contents) {
      console.log('PostData contents:', e.postData.contents);
      console.log('PostData type:', e.postData.type);
      
      if (e.postData.type === 'application/json') {
        data = JSON.parse(e.postData.contents);
      } else if (e.postData.type === 'application/x-www-form-urlencoded') {
        const params = e.postData.contents.split('&');
        params.forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            data[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        });
      } else if (e.postData.type && e.postData.type.includes('multipart/form-data')) {
        console.log('Processing FormData (multipart/form-data)');
        
        if (e.parameter) {
          data = { ...e.parameter };
        } else {
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
    
    // Check URL parameters as fallback
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
    data.source = 'open_source_webhook_v1';
    
    console.log('Final parsed data:', data);
    return data;
    
  } catch (error) {
    console.error('Error parsing request data:', error);
    return {};
  }
}

// Store data in Google Sheet with all logs consolidated
function storeInSheet(data, geoData, clientIP) {
  try {
    console.log('=== STORING IN SHEET ===');
    
    if (!data) {
      data = {};
    }
    
    if (typeof data !== 'object') {
      data = {};
    }
    
    // Check if SHEET_ID is configured
    if (CONFIG.SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
      return { success: false, error: 'SHEET_ID not configured. Please update CONFIG.SHEET_ID with your Google Sheet ID.' };
    }
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = spreadsheet.getSheetByName('Request Definition');
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating new sheet: Request Definition');
      sheet = spreadsheet.insertSheet('Request Definition');
      
      // Add comprehensive headers for all logging data
      sheet.getRange(1, 1, 1, 13).setValues([
        ['ID', 'Term', 'Page URL', 'Status', 'Received At', 'Client IP', 'Country', 'Region', 'City', 'Is India', 'Validation Status', 'Rate Limit Status', 'Access Key Used']
      ]);
      
      // Format headers
      sheet.getRange(1, 1, 1, 13).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 13).setBackground('#4285f4');
      sheet.getRange(1, 1, 1, 13).setFontColor('white');
    }
    
    // Generate Request ID (incremental)
    const requestId = sheet.getLastRow(); // This will be the next row number
    
    // Prepare comprehensive row data with all logging information
    const rowData = [
      requestId,
      data.term || 'unknown',
      data.page_url || 'unknown',
      'Received',
      data.received_at ? new Date(data.received_at) : new Date(),
      clientIP || 'unknown',
      geoData?.country || 'unknown',
      geoData?.region || 'unknown',
      geoData?.city || 'unknown',
      geoData?.isIndia || false,
      'Validated',
      'Allowed',
      data.access_key ? 'Yes' : 'No'
    ];
    
    // Add data to sheet
    sheet.appendRow(rowData);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 13);
    
    console.log('Data stored successfully at row:', sheet.getLastRow());
    return { success: true, row: sheet.getLastRow() };
    
  } catch (error) {
    console.error('Error storing in sheet:', error);
    return { success: false, error: error.toString() };
  }
}

// Create HTTP response with CORS headers
function createResponse(data, statusCode) {
  // Ensure data is always an object
  if (!data || typeof data !== 'object') {
    data = {
      success: false,
      error: 'Invalid response data',
      timestamp: new Date().toISOString()
    };
  }
  
  const response = {
    ...data,
    status: statusCode || 200,
    timestamp: new Date().toISOString()
  };
  
  console.log('=== SENDING RESPONSE ===');
  console.log('Response data:', response);
  
  try {
    const jsonString = JSON.stringify(response);
    console.log('JSON string length:', jsonString.length);
    console.log('JSON string preview:', jsonString.substring(0, 200) + '...');
    
    // Validate JSON string
    if (!jsonString || jsonString.trim() === '') {
      throw new Error('Empty JSON string generated');
    }
    
    // Test JSON parsing to ensure it's valid
    JSON.parse(jsonString);
    
    return ContentService
      .createTextOutput(jsonString)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error creating JSON response:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback response - ensure it's always valid JSON
    const fallbackResponse = {
      success: false,
      error: 'Response formatting error: ' + error.message,
      timestamp: new Date().toISOString(),
      status: 500
    };
    
    try {
      const fallbackJson = JSON.stringify(fallbackResponse);
      return ContentService
        .createTextOutput(fallbackJson)
        .setMimeType(ContentService.MimeType.JSON);
    } catch (fallbackError) {
      console.error('Critical error in fallback response:', fallbackError);
      // Last resort - return minimal valid JSON
      return ContentService
        .createTextOutput('{"success":false,"error":"Critical response error","timestamp":"' + new Date().toISOString() + '"}')
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}

// Test functions for development and debugging
function testWebhook() {
  const testData = {
    term: 'test term',
    page_url: 'https://example.com',
    access_key: 'your_secure_access_key_here', // Replace with your actual key
    timestamp: new Date().toISOString()
  };
  
  const mockRequest = {
    postData: {
      contents: JSON.stringify(testData),
      type: 'application/json'
    },
    parameter: {}
  };
  
  const result = doPost(mockRequest);
  console.log('Test result:', result.getContent());
  return result.getContent();
}

function testGeolocation() {
  const result = getGeographicData('8.8.8.8');
  console.log('Geolocation test result:', result);
  return result;
}
