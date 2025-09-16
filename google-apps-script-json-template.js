// Google Apps Script for Justice Definitions Project Extension
// This script handles JSON data from the extension webhook

// Configuration
const ACCESS_KEY = "JDP_2025_Admin_AbC123XyZ789"; // Must match config.js
const SPREADSHEET_ID = "15mdKhoJuhdzpeSCL0STRLFI5umMaDF5CCf0D5qiWbOY"; // Your Google Sheet ID

function doPost(e) {
  try {
    // Check access key
    const requestData = JSON.parse(e.postData.contents);
    
    if (requestData.access_key !== ACCESS_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 401,
          message: "Unauthorized - Invalid access key"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Log the request
    console.log("Received request:", requestData);
    
    // Get the spreadsheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    
    // Insert data into the sheet WITHOUT any string conversion
    // This preserves the original strings exactly as sent
    const rowData = [
      new Date().toISOString(), // Timestamp
      requestData.term || "", // Term (preserved exactly as sent)
      requestData.page_url || "", // Page URL (preserved exactly as sent)
      requestData.timestamp || "", // Original timestamp (preserved exactly as sent)
      "Pending" // Status
    ];
    
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 200,
        message: "Request logged successfully",
        data: {
          term: requestData.term, // Return the exact term as received
          timestamp: requestData.timestamp
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error("Error processing request:", error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 500,
        message: "Internal server error: " + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 200,
      message: "Justice Definitions Project Webhook is running",
      version: "1.0.0"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Setup function to create headers if sheet is empty
function setupSheet() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
  
  // Check if sheet is empty
  if (sheet.getLastRow() === 0) {
    // Add headers
    sheet.appendRow([
      "Log Timestamp",
      "Term Requested", 
      "Source Page URL",
      "Request Timestamp",
      "Status"
    ]);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, 5);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f0f0f0");
  }
  
  console.log("Sheet setup completed");
}
