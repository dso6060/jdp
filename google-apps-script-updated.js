// Updated Google Apps Script for Justice Definitions Project Webhook
// This version is compatible with the new secure server architecture

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  SHEET_ID: '15mdKhoJuhdzpeSCL0STRLFI5umMaDF5CCf0D5qiWbOY', // Replace with your actual Google Sheet ID
  // ACCESS_KEY is now handled by the secure server - no longer needed here
  RATE_LIMIT_ENABLED: true,
  MAX_REQUESTS_PER_HOUR: 1000
};

// Rate limiting storage (in-memory)
const rateLimitStore = {};

// Main function to handle POST requests
function doPost(e) {
  try {
    console.log('=== POST REQUEST STARTED ===');
    console.log('Request object:', e);
    console.log('Request type:', typeof e);
    
    // Handle case where e might be undefined
    if (!e) {
      console.log('Request object is undefined, creating default');
      e = { parameter: {}, postData: null };
    }
    
    // Parse the request data first
    const requestData = parseRequestData(e);
    console.log('Parsed data:', requestData);
    
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
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      rateLimitEnabled: CONFIG.RATE_LIMIT_ENABLED
    }, 200);
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({
      success: false,
      error: 'Internal server error: ' + error.toString()
    }, 500);
  }
}

// Rate limiting function
function checkRateLimit(requestData) {
  try {
    const now = Date.now();
    const hourWindow = 3600000; // 1 hour in milliseconds
    const hourKey = `hour_${Math.floor(now / hourWindow)}`;
    
    // Initialize rate limit store if needed
    if (!rateLimitStore[hourKey]) {
      rateLimitStore[hourKey] = 0;
    }
    
    // Check if we've exceeded the hourly limit
    if (rateLimitStore[hourKey] >= CONFIG.MAX_REQUESTS_PER_HOUR) {
      const retryAfter = hourWindow - (now % hourWindow);
      return {
        allowed: false,
        retryAfter: retryAfter,
        reason: 'Hourly rate limit exceeded'
      };
    }
    
    // Increment the counter
    rateLimitStore[hourKey]++;
    
    // Clean up old entries (keep only last 2 hours)
    const cutoff = now - (2 * hourWindow);
    for (const key in rateLimitStore) {
      if (key.startsWith('hour_')) {
        const timestamp = parseInt(key.split('_')[1]) * hourWindow;
        if (timestamp < cutoff) {
          delete rateLimitStore[key];
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

// Parse request data from different sources - UPDATED VERSION
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
    
    // Try to get data from POST body (now expecting JSON from our secure server)
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
    
    // Add metadata
    data.received_at = new Date().toISOString();
    data.source = 'secure_server'; // Indicates this came through our secure server
    
    console.log('Final parsed data:', data);
    return data;
    
  } catch (error) {
    console.error('Error parsing request data:', error);
    return {};
  }
}

// Store data in Google Sheet - ENHANCED VERSION
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
      
      // Add headers with additional columns for new architecture
      sheet.getRange(1, 1, 1, 6).setValues([
        ['Timestamp', 'Term', 'Page URL', 'Status', 'Source', 'Received At']
      ]);
      
      // Format headers
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 6).setBackground('#4285f4');
      sheet.getRange(1, 1, 1, 6).setFontColor('white');
    }
    
    // Prepare row data with additional fields
    const rowData = [
      new Date(data.timestamp || new Date()),
      data.term || '',
      data.page_url || '',
      'Received',
      data.source || 'direct', // Track if request came through secure server
      new Date(data.received_at || new Date())
    ];
    
    console.log('Row data to append:', rowData);
    
    // Add data to sheet
    sheet.appendRow(rowData);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 6);
    
    console.log('Data stored successfully at row:', sheet.getLastRow());
    return { success: true, row: sheet.getLastRow() };
    
  } catch (error) {
    console.error('Error storing in sheet:', error);
    return { success: false, error: error.toString() };
  }
}

// Create HTTP response - UPDATED VERSION
function createResponse(data, statusCode) {
  const response = {
    ...data,
    status: statusCode,
    timestamp: new Date().toISOString()
  };
  
  console.log('=== SENDING RESPONSE ===');
  console.log('Response:', response);
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test function to verify the script works
function testWebhook() {
  console.log('=== TESTING WEBHOOK ===');
  
  const testData = {
    term: 'test term',
    page_url: 'https://example.com',
    timestamp: new Date().toISOString(),
    source: 'test'
  };
  
  console.log('Testing webhook with data:', testData);
  
  const result = storeInSheet(testData);
  console.log('Test result:', result);
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
  const hourKey = `hour_${Math.floor(now / hourWindow)}`;
  
  return {
    currentHour: hourKey,
    requestsThisHour: rateLimitStore[hourKey] || 0,
    maxRequestsPerHour: CONFIG.MAX_REQUESTS_PER_HOUR,
    rateLimitEnabled: CONFIG.RATE_LIMIT_ENABLED,
    allEntries: rateLimitStore
  };
}

// Function to clear rate limit data (for testing)
function clearRateLimitData() {
  for (const key in rateLimitStore) {
    delete rateLimitStore[key];
  }
  console.log('Rate limit data cleared');
  return { success: true, message: 'Rate limit data cleared' };
}
