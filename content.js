// Listen for right-click (context menu) to trigger lookup
document.addEventListener("contextmenu", handleRightClick);

// Message listener is defined later in the file

var selectedText;
var floatingPopup = null;

// Load configuration
let CONFIG = {};
if (typeof window.EXTENSION_CONFIG !== 'undefined') {
  CONFIG = window.EXTENSION_CONFIG;
} else {
  // Fallback configuration
  CONFIG = {
    WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbwQ0XCO7K5qUnDrRW1c1xsZ8PtKnAJJ2AA7BGUmC6ElniS7IAQlV_VE3zpRMZxi_rXnSw/exec",
    WEBHOOK: {
      ACCESS_KEY: "JDP_2025_Admin_AbC123XyZ789"
    }
  };
}

function handleRightClick(event) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // Only proceed if there's meaningful text selected (more than 2 characters)
  if (!selectedText || selectedText.length <= 2) {
    return;
  }
  
  // Check if side panel is open by sending a message
  chrome.runtime.sendMessage({ type: "CHECK_SIDE_PANEL_STATUS" }, (response) => {
    if (response && response.isOpen) {
      // Side panel is open - send search query to side panel instead of showing popup
      chrome.runtime.sendMessage({ 
        type: "SEARCH_QUERY", 
        query: selectedText 
      });
    } else {
      // Side panel is closed - show floating popup as usual
      // Remove any existing floating popup
      if (floatingPopup) {
        floatingPopup.remove();
        floatingPopup = null;
      }
      
      // Show the floating popup
      showFloatingPopup(selection);
    }
  });
  
  // Prevent the default context menu from appearing
  event.preventDefault();
}

// Function to refresh side panel status (can be called periodically)
function refreshSidePanelStatus() {
  chrome.runtime.sendMessage({ type: "CHECK_SIDE_PANEL_STATUS" }, (response) => {
    console.log("Side panel status refreshed:", response);
  });
}

function showFloatingPopup(selection) {
  // Create floating popup element
  floatingPopup = document.createElement("div");
  floatingPopup.id = "jdp-floating-popup";
  floatingPopup.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 12px;
    min-width: 200px;
    max-width: 400px;
    width: auto;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
    word-wrap: break-word;
    overflow-wrap: break-word;
    display: none;
  `;
  
  // Add loading content
  floatingPopup.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 16px; height: 16px; border: 2px solid #0066cc; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Looking up "${selectedText}"...</span>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  // Position the popup near the selection
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  floatingPopup.style.left = (rect.left + window.scrollX) + "px";
  floatingPopup.style.top = (rect.bottom + window.scrollY + 5) + "px";
  
  // Add to page
  document.body.appendChild(floatingPopup);
  floatingPopup.style.display = "block";
  
  // Look up the definition
  lookupDefinition(selectedText);
}

function lookupDefinition(query) {
  // Clean the query
  const cleanQuery = query.replace(/[^a-zA-Z ]/g, "");
  
  // Make API call to Justice Definitions Project
  const api = "https://jdc-definitions.wikibase.wiki/w/api.php";
  const searchParams = "action=query&list=search&srprop=snippet&format=json&origin=*" + 
    `&srsearch=${encodeURIComponent(cleanQuery)}`;
  
  fetch(`${api}?${searchParams}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.query && data.query.search && data.query.search.length > 0) {
        const first = data.query.search[0];
        const title = first.title;
        const snippet = first.snippet || "";
        
        // Clean up the snippet
        const tmp = document.createElement("div");
        tmp.innerHTML = snippet;
        const cleanSnippet = (tmp.textContent || tmp.innerText || "")
          .replace(/\[\[[^\]]+\]\]/g, "")
          .replace(/\{\{[^}]+\}\}/g, "")
          .replace(/==+[^=]*==+/g, "")
          .replace(/\s+/g, " ")
          .trim();
        
        // Show result
        showDefinitionResult(title, cleanSnippet, query);
      } else {
        showNoResult(query);
      }
    })
    .catch(error => {
      showError("Lookup failed");
    });
}

function showDefinitionResult(title, definition, originalQuery) {
  if (!floatingPopup) return;
  
  // Ensure popup width adjusts to content
  floatingPopup.style.width = 'auto';
  floatingPopup.style.maxWidth = '400px';
  
  const maxChars = 200; // Increased from 140 to show more content
  const displayText = definition.length > maxChars ? 
    definition.substring(0, maxChars) + "..." : definition;
  
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #0066cc; word-wrap: break-word;">${title}</strong>
    </div>
    <div style="margin-bottom: 8px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word;">
      ${displayText}
    </div>
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <a href="https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}" 
         target="_blank" 
         style="color: #0066cc; text-decoration: none; font-size: 12px;">
        Read more →
      </a>
      <button onclick="this.parentElement.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
        ✕
      </button>
    </div>
  `;
}

function showNoResult(query) {
  if (!floatingPopup) return;
  
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong>No definition found</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666;">
      No definition found for "${query}" in the Justice Definitions Project.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
      <button id="requestBtn" 
              style="background: #0066cc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
        Request Definition
      </button>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
        ✕
      </button>
    </div>
  `;
  
  // Add click handler for request button
  const requestBtn = floatingPopup.querySelector('#requestBtn');
  if (requestBtn) {
    requestBtn.onclick = function() {
      requestDefinition(query);
    };
  }
}

function requestDefinition(query) {
  if (!floatingPopup) {
    console.error("requestDefinition: floatingPopup is null");
    return;
  }
  
  if (!document.body.contains(floatingPopup)) {
    console.error("requestDefinition: floatingPopup is not in DOM");
    return;
  }
  
  // Show loading state
  floatingPopup.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <div style="width: 16px; height: 16px; border: 2px solid #0066cc; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Submitting request...</span>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  // Get current page URL
  const pageUrl = window.location.href;
  const nowIso = new Date().toISOString();
  
  // Prepare request data
  const requestData = { 
    term: query, 
    page_url: pageUrl, 
    timestamp: nowIso,
    access_key: CONFIG.WEBHOOK.ACCESS_KEY
  };
  
  console.log("Sending webhook request:", requestData);
  console.log("Webhook URL:", CONFIG.WEBHOOK_URL);
  
  // Use fetch with no-cors to avoid navigation and preserve popup
  const formData = new FormData();
  formData.append('term', query);
  formData.append('page_url', pageUrl);
  formData.append('timestamp', nowIso);
  formData.append('access_key', CONFIG.WEBHOOK.ACCESS_KEY);
  
  fetch(CONFIG.WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: formData
  })
  .then(() => {
    // Success - show message in popup
    console.log("Request submitted successfully");
    showRequestSuccess(query);
  })
  .catch((error) => {
    console.error("Request failed:", error);
    showRequestError("Failed to submit request. Please try again.");
  });
}

function showRequestSuccess(query) {
  if (!floatingPopup) {
    console.error("showRequestSuccess: floatingPopup is null");
    return;
  }
  
  if (!document.body.contains(floatingPopup)) {
    console.error("showRequestSuccess: floatingPopup is not in DOM");
    return;
  }
  
  console.log("Showing success message for query:", query);
  
  // Simple success message as a label string
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #28a745;">✓ Request Submitted Successfully</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      Your request for "<strong>${query}</strong>" has been sent to the Justice Definitions Project team.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px; padding: 4px;">
        ✕ Close
      </button>
    </div>
  `;
}

function showRequestError(message) {
  if (!floatingPopup) return;
  
  floatingPopup.innerHTML = `
    <div style="color: #dc3545; margin-bottom: 8px;">
      <strong>⚠ Request Failed</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      ${message}
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 11px; background: #fff3cd; padding: 8px; border-radius: 4px; border-left: 3px solid #ffc107;">
      <strong>Alternative:</strong> You can also request definitions by clicking the extension icon and using the side panel search feature.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px; padding: 4px;">
        ✕ Close
      </button>
    </div>
  `;
}

function showError(message) {
  if (!floatingPopup) return;
  
  floatingPopup.innerHTML = `
    <div style="color: #dc3545; margin-bottom: 8px;">
      ⚠ ${message}
    </div>
    <button onclick="this.parentElement.remove()" 
            style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
      ✕
    </button>
  `;
}

// Hide popup when clicking elsewhere and handle side panel clicks
document.addEventListener("click", function(event) {
  if (floatingPopup && !floatingPopup.contains(event.target)) {
    floatingPopup.remove();
    floatingPopup = null;
  }
  
  // Check if click is outside side panel and send message to close it
  chrome.runtime.sendMessage({ type: "CHECK_SIDE_PANEL_STATUS" }, (response) => {
    if (response && response.isOpen) {
      // Side panel is open, send click outside message with window ID
      chrome.windows.getCurrent((window) => {
        chrome.runtime.sendMessage({ 
          type: "CLICK_OUTSIDE_SIDE_PANEL", 
          windowId: window.id 
        });
      });
    }
  });
});

// receive the message from popup (for backward compatibility with extension popup).
chrome.runtime.onMessage.addListener(onMessageReceived);

function onMessageReceived(message, sender, sendResponse) {
  if (message.type === "SEARCH_QUERY") {
    // Store the search query for the side panel
    chrome.storage.local.set({ lastSearchQuery: message.query });
    
    // Request background script to open side panel
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    
    sendResponse({ success: true });
  } else if (message.type === "SIDE_PANEL_CLOSED") {
    // Side panel was closed - refresh status
    console.log("Side panel closed notification received");
    refreshSidePanelStatus();
    sendResponse({ success: true });
  } else if (message.txt === "hello from popup") {
    // Legacy popup support - redirect to side panel
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText !== "_TextNotSelected_") {
      const cleanWord = selectedText.replace(/[^a-zA-Z ]/g, "");
      chrome.storage.local.set({ lastSearchQuery: cleanWord });
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    }
    
    sendResponse({ selectedWord: selectedText || "_TextNotSelected_" });
  } else {
    // Default response for backward compatibility
  let msg =
    selectedText && selectedText.length > 0
      ? selectedText
      : "_TextNotSelected_";

    sendResponse({ selectedWord: msg });
  }
  
  return true; // Keep message channel open for async response
}
