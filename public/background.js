// Background script for Justice Definitions Project Extension
// Handles side panel opening, extension icon clicks, and webhook requests

// Track side panel status
let sidePanelStatus = new Map(); // windowId -> isOpen

// Webhook configuration - Replace with your own values
const WEBHOOK_CONFIG = {
  ENDPOINT: 'https://script.google.com/macros/s/YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_ID_HERE/exec/webhook',
  ACCESS_KEY: 'your_secure_access_key_here'
};

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to create overlay side panel
  chrome.tabs.sendMessage(tab.id, { type: "OPEN_SIDE_PANEL" });
  sidePanelStatus.set(tab.windowId, true);
});

// Listen for messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL") {
    // Send message to content script to create overlay side panel
    chrome.tabs.sendMessage(sender.tab.id, { type: "OPEN_SIDE_PANEL" });
    sidePanelStatus.set(sender.tab.windowId, true);
    sendResponse({ success: true });
  } else if (message.type === "CLOSE_SIDE_PANEL") {
    // Close side panel when requested from side panel
    console.log("Received CLOSE_SIDE_PANEL message", message);
    // If we have a windowId from the message, use it; otherwise find the active window
    if (message.windowId) {
      console.log("Closing side panel for window:", message.windowId);
      chrome.sidePanel.close({ windowId: message.windowId });
      sidePanelStatus.set(message.windowId, false);
    } else {
      // Find the current active window and close its side panel
      try {
        if (chrome.windows && typeof chrome.windows.getCurrent === 'function') {
          chrome.windows.getCurrent((window) => {
            try {
              console.log("Current window:", window);
              if (window && window.id && sidePanelStatus.get(window.id)) {
                console.log("Closing side panel for current window:", window.id);
                chrome.sidePanel.close({ windowId: window.id });
                sidePanelStatus.set(window.id, false);
              } else {
                console.log("No side panel found for current window or window not found");
              }
            } catch (error) {
              console.error("Error in getCurrent callback:", error.message);
            }
          });
        } else {
          console.log("chrome.windows.getCurrent is not available");
        }
      } catch (error) {
        console.error("Error calling chrome.windows.getCurrent:", error.message);
      }
    }
    sendResponse({ success: true });
  } else if (message.type === "CHECK_SIDE_PANEL_STATUS") {
    // Check if side panel is open for this window
    const isOpen = sidePanelStatus.get(sender.tab.windowId) || false;
    sendResponse({ isOpen: isOpen });
  } else if (message.type === "SEARCH_QUERY") {
    // Forward search query to side panel
    chrome.runtime.sendMessage({ 
      type: "SEARCH_QUERY", 
      query: message.query 
    });
    sendResponse({ success: true });
  } else if (message.type === "CLICK_OUTSIDE_SIDE_PANEL") {
    // Close side panel when clicked outside
    const windowId = message.windowId || sender.tab?.windowId;
    if (windowId && sidePanelStatus.get(windowId) && chrome.sidePanel) {
      try {
        chrome.sidePanel.close({ windowId: windowId });
        sidePanelStatus.set(windowId, false);
      } catch (error) {
        console.error('Error closing side panel:', error);
      }
    }
    sendResponse({ success: true });
  } else if (message.type === "SIDE_PANEL_CLOSED") {
    // Side panel is being closed - update status
    const windowId = message.windowId || sender.tab?.windowId;
    if (windowId) {
      console.log("Side panel closed for window:", windowId);
      sidePanelStatus.set(windowId, false);
    }
    sendResponse({ success: true });
  } else if (message.type === "SEND_WEBHOOK_REQUEST") {
    // Handle webhook requests from content script
    console.log("Background script received webhook request:", message.data);
    handleWebhookRequest(message.data, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  return true; // Keep message channel open
});

// Handle side panel setup
chrome.runtime.onInstalled.addListener(() => {
  console.log("Justice Definitions Project extension installed");
  
  // Note: Extension pinning is handled by the user manually in Chrome
  // chrome.action.setPinned is not available in Manifest V3
});

// Listen for tab updates to detect when side panel might be closed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If the tab is being replaced or updated, we might need to reset side panel status
  if (changeInfo.status === 'complete') {
    // Check if side panel is still open for this window
    chrome.windows.get(tab.windowId, (window) => {
      if (window) {
        // We can't directly check if side panel is open, but we can reset status
        // if the tab was completely reloaded
        if (changeInfo.url) {
          console.log("Tab updated, resetting side panel status for window:", tab.windowId);
          sidePanelStatus.set(tab.windowId, false);
        }
      }
    });
  }
});

// Listen for window focus changes to detect side panel closure
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // No window is focused, reset all side panel statuses
    console.log("No window focused, resetting all side panel statuses");
    sidePanelStatus.clear();
  }
});

// Handle webhook requests from content script (CORS-free approach)
async function handleWebhookRequest(requestData, sendResponse) {
  try {
    console.log("Background script handling webhook request:", requestData);
    
    // Get client IP using a web service
    let clientIP = 'unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        clientIP = ipData.ip || 'unknown';
        console.log('Client IP detected:', clientIP);
      }
    } catch (ipError) {
      console.log('Failed to get client IP:', ipError.message);
    }
    
    // Prepare the request data with additional metadata
    const webhookData = {
      term: requestData.term,
      page_url: requestData.page_url,
      timestamp: requestData.timestamp || new Date().toISOString(),
      access_key: WEBHOOK_CONFIG.ACCESS_KEY,
      source: 'extension_background_script',
      user_agent: navigator.userAgent,
      referrer: requestData.page_url,
      client_ip: clientIP
    };
    
    console.log("Sending webhook request to:", WEBHOOK_CONFIG.ENDPOINT);
    console.log("Webhook data:", webhookData);
    
    // Use fetch in background script (no CORS restrictions)
    const response = await fetch(WEBHOOK_CONFIG.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Justice-Definitions-Extension/1.0',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(webhookData)
    });
    
    console.log("Webhook response status:", response.status);
    console.log("Webhook response ok:", response.ok);
    
    if (response.ok) {
      const result = await response.json();
      console.log("Webhook success:", result);
      sendResponse({
        success: true,
        data: result,
        message: 'Term successfully added to Definition Requests queue'
      });
    } else {
      const errorText = await response.text();
      console.error("Webhook error:", response.status, errorText);
      sendResponse({
        success: false,
        error: `Server error: ${response.status}`,
        details: errorText
      });
    }
    
  } catch (error) {
    console.error("Background script webhook error:", error);
    sendResponse({
      success: false,
      error: 'Network error: ' + error.message,
      details: error.toString()
    });
  }
}
