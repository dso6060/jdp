// Google Apps Script for Justice Definitions Project Webhook
// This script handles incoming requests from the browser extension
// and stores them in a Google Sheet with proper authentication

// Configuration
const CONFIG = {
  // Google Sheet ID - Replace with your actual sheet ID
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',
  
  // Sheet name where data will be stored
  SHEET_NAME: 'Definition Requests',
  
  // Access key for authentication (change this to a secure random string)
  ACCESS_KEY: 'JDP_2024_SECURE_KEY_CHANGE_THIS',
  
  // Allowed origins (for CORS if needed)
  ALLOWED_ORIGINS: ['chrome-extension://', 'https://jdc-definitions.wikibase.wiki']
};

// Main function to handle POST requests
function doPost(e) {
  try {
    // Log the incoming request for debugging
    console.log('Incoming request:', e);
    
    // Check authentication
    if (!authenticateRequest(e)) {
      return createResponse('Unauthorized', 401);
    }
    
    // Parse the request data
    const requestData = parseRequestData(e);
    
    // Validate required fields
    if (!requestData.term || !requestData.page_url || !requestData.timestamp) {
      return createResponse('Missing required fields', 400);
    }
    
    // Store data in Google Sheet
    const result = storeInSheet(requestData);
    
    if (result.success) {
      return createResponse('Request stored successfully', 200);
    } else {
      return createResponse('Failed to store request', 500);
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse('Internal server error', 500);
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  try {
    // Check authentication
    if (!authenticateRequest(e)) {
      return createResponse('Unauthorized', 401);
    }
    
    // Return basic info
    return createResponse('Justice Definitions Project Webhook is running', 200);
    
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse('Internal server error', 500);
  }
}

// Authenticate the request
function authenticateRequest(e) {
  try {
    // Check for access key in parameters or headers
    const accessKey = e.parameter.access_key || 
                     e.parameter.accessKey || 
                     e.parameter.key ||
                     (e.postData && JSON.parse(e.postData.contents).access_key);
    
    if (!accessKey || accessKey !== CONFIG.ACCESS_KEY) {
      console.log('Authentication failed - invalid or missing access key');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
}

// Parse request data from different sources
function parseRequestData(e) {
  let data = {};
  
  try {
    // Try to get data from POST body
    if (e.postData && e.postData.contents) {
      if (e.postData.type === 'application/json') {
        data = JSON.parse(e.postData.contents);
      } else if (e.postData.type === 'application/x-www-form-urlencoded') {
        // Parse form data
        const params = e.postData.contents.split('&');
        params.forEach(param => {
          const [key, value] = param.split('=');
          data[decodeURIComponent(key)] = decodeURIComponent(value);
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
    
    return data;
  } catch (error) {
    console.error('Error parsing request data:', error);
    return {};
  }
}

// Store data in Google Sheet
function storeInSheet(data) {
  try {
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      
      // Add headers
      sheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'Term', 'Page URL', 'User Agent', 'IP Address']
      ]);
      
      // Format headers
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 5).setBackground('#4285f4');
      sheet.getRange(1, 1, 1, 5).setFontColor('white');
    }
    
    // Prepare row data
    const rowData = [
      new Date(data.timestamp || new Date()),
      data.term || '',
      data.page_url || '',
      data.user_agent || 'Unknown',
      data.ip_address || 'Unknown'
    ];
    
    // Add data to sheet
    sheet.appendRow(rowData);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, 5);
    
    console.log('Data stored successfully:', data.term);
    return { success: true, row: sheet.getLastRow() };
    
  } catch (error) {
    console.error('Error storing in sheet:', error);
    return { success: false, error: error.toString() };
  }
}

// Create HTTP response
function createResponse(message, statusCode) {
  const response = {
    status: statusCode,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Setup function to initialize the sheet (run this once)
function setupSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
    }
    
    // Clear existing data and add headers
    sheet.clear();
    sheet.getRange(1, 1, 1, 5).setValues([
      ['Timestamp', 'Term', 'Page URL', 'User Agent', 'IP Address']
    ]);
    
    // Format headers
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.getRange(1, 1, 1, 5).setBackground('#4285f4');
    sheet.getRange(1, 1, 1, 5).setFontColor('white');
    
    console.log('Sheet setup completed successfully');
    return 'Sheet setup completed';
    
  } catch (error) {
    console.error('Error setting up sheet:', error);
    return 'Error setting up sheet: ' + error.toString();
  }
}

// Test function
function testWebhook() {
  const testData = {
    term: 'test term',
    page_url: 'https://example.com',
    timestamp: new Date().toISOString(),
    access_key: CONFIG.ACCESS_KEY
  };
  
  const result = storeInSheet(testData);
  console.log('Test result:', result);
  return result;
}
