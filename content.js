// Listen for right-click (context menu) to trigger lookup
document.addEventListener("contextmenu", handleRightClick);

// Message listener is defined later in the file

var selectedText;
var floatingPopup = null;
var sidePanelOverlay = null;

// Global function to check if extension context is still valid
function isExtensionContextValid() {
  try {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.id && 
           document && 
           document.body;
  } catch (error) {
    return false;
  }
}

// Global function to safely execute code only if context is valid
function safeExecute(fn, errorMessage = "Extension context invalidated") {
  if (!isExtensionContextValid()) {
    console.error(errorMessage);
    return false;
  }
  try {
    return fn();
  } catch (error) {
    console.error("Error in safe execution:", error.message);
    return false;
  }
}

// Load configuration - use window.EXTENSION_CONFIG to avoid conflicts
let CONFIG = window.EXTENSION_CONFIG || {
  API_URL: "https://jdc-definitions.wikibase.wiki/w/api.php",
  WEBHOOK: {
    ENABLED: true,
    TIMEOUT: 10000,
    ENDPOINT: "https://script.google.com/macros/s/AKfycbww5tVqf12kw9pb9i1ygDB61SYVtMay-bgpqKKJJHZLH_FL6npP0TZfk7O9YpI5rN7S/exec"
    // Access key is now server-side only
  },
  API: {
    TIMEOUT: 15000
  },
  DISPLAY: {
    MAX_CHARS: 140,
    EXTENDED_CHARS: 200,
    MAX_EXTENDED_CHARS: 250,
    MIN_WORD_COUNT: 4
  }
};

// Server endpoints - will be configured from server config
let SERVER_BASE_URL = null;
let WEBHOOK_ENDPOINT = null;

// Initialize webhook endpoint from configuration
function initializeWebhookEndpoint() {
  if (CONFIG && CONFIG.WEBHOOK && CONFIG.WEBHOOK.ENDPOINT) {
    WEBHOOK_ENDPOINT = CONFIG.WEBHOOK.ENDPOINT;
    SERVER_BASE_URL = CONFIG.WEBHOOK.ENDPOINT.replace('/webhook', '');
    console.log("Webhook endpoint initialized:", WEBHOOK_ENDPOINT);
  } else {
    console.warn("Webhook endpoint not configured in CONFIG object");
    // Fallback: disable webhook functionality
    WEBHOOK_ENDPOINT = null;
    SERVER_BASE_URL = null;
  }
}

// Initialize webhook endpoint when CONFIG is available
if (CONFIG && CONFIG.WEBHOOK) {
  initializeWebhookEndpoint();
}

// Re-initialize webhook endpoint when CONFIG is updated
const originalConfig = window.EXTENSION_CONFIG;
if (originalConfig && originalConfig.WEBHOOK) {
  initializeWebhookEndpoint();
}

// Also try to initialize from the global CONFIG if available
if (typeof window.CONFIG !== 'undefined' && window.CONFIG.WEBHOOK) {
  CONFIG = window.CONFIG;
  initializeWebhookEndpoint();
}

// Force initialization with current CONFIG
initializeWebhookEndpoint();

function handleRightClick(event) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // Only proceed if there's meaningful text selected (more than 2 characters)
  if (!selectedText || selectedText.length <= 2) {
    return;
  }
  
  // Check if overlay side panel is open
  if (sidePanelOverlay && document.body.contains(sidePanelOverlay)) {
    // Overlay is open - perform search in overlay
    performSidePanelSearch(selectedText);
  } else {
    // Overlay is closed - show floating popup as usual
    // Remove any existing floating popup
    if (floatingPopup) {
      floatingPopup.remove();
      floatingPopup = null;
    }
    
    // Show the floating popup
    showFloatingPopup(selection);
  }
  
  // Prevent the default context menu from appearing
  event.preventDefault();
}

// Function to refresh side panel status (can be called periodically)
function refreshSidePanelStatus() {
  chrome.runtime.sendMessage({ type: "CHECK_SIDE_PANEL_STATUS" }, (response) => {
    console.log("Side panel status refreshed:", response);
  });
}

// Create sliding overlay side panel
function createSidePanelOverlay() {
  if (sidePanelOverlay) {
    return; // Already exists
  }
  
  // Create overlay container
  sidePanelOverlay = document.createElement('div');
  sidePanelOverlay.id = 'jdp-side-panel-overlay';
  sidePanelOverlay.style.cssText = `
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: white;
    box-shadow: -4px 0 12px rgba(0,0,0,0.15);
    z-index: 10000;
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #0066cc, #004499);
    color: white;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  
  header.innerHTML = `
    <div>
      <h1 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">Justice Definitions Project</h1>
      <p style="font-size: 12px; opacity: 0.9;">Legal definitions at your fingertips</p>
    </div>
    <button id="jdp-close-btn" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s;">✕</button>
  `;
  
  // Create content area
  const content = document.createElement('div');
  content.id = 'jdp-content';
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f8f9fa;
  `;
  
  // Create search section
  const searchSection = document.createElement('div');
  searchSection.style.cssText = 'margin-bottom: 20px;';
  searchSection.innerHTML = `
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      <input type="text" id="jdp-search-input" placeholder="Search for legal terms..." style="flex: 1; padding: 10px 12px; border: 2px solid #e1e5e9; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;">
      <button id="jdp-search-btn" style="padding: 10px 16px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">Search</button>
    </div>
  `;
  
  // Create results area
  const results = document.createElement('div');
  results.id = 'jdp-results';
  results.style.cssText = 'margin-top: 16px;';
  
  // Create default content
  const defaultContent = document.createElement('div');
  defaultContent.id = 'jdp-default-content';
  defaultContent.style.cssText = `
    text-align: center;
    padding: 32px 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;
  defaultContent.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">⚖️</div>
    <h2 style="color: #0066cc; margin-bottom: 12px; font-size: 20px;">Justice Definitions Project</h2>
    <p style="color: #666; margin-bottom: 8px; font-size: 14px;">Search for legal terms and definitions</p>
    <p style="color: #666; font-size: 12px;">Built on content from the Justice Definitions Project open-source team</p>
  `;
  
  // Assemble the overlay
  content.appendChild(searchSection);
  content.appendChild(results);
  content.appendChild(defaultContent);
  
  sidePanelOverlay.appendChild(header);
  sidePanelOverlay.appendChild(content);
  
  // Add to page
  document.body.appendChild(sidePanelOverlay);
  
  // Add event listeners
  setupSidePanelEvents();
  
  // Slide in
  setTimeout(() => {
    sidePanelOverlay.style.right = '0px';
  }, 10);
}

// Setup side panel event listeners
function setupSidePanelEvents() {
  // Close button
  const closeBtn = document.getElementById('jdp-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidePanelOverlay);
  }
  
  // Search functionality
  const searchBtn = document.getElementById('jdp-search-btn');
  const searchInput = document.getElementById('jdp-search-input');
  
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        performSidePanelSearch(query);
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          performSidePanelSearch(query);
        }
      }
    });
  }
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (sidePanelOverlay && !sidePanelOverlay.contains(e.target)) {
      closeSidePanelOverlay();
    }
  });
}

// Close side panel overlay
function closeSidePanelOverlay() {
  if (!sidePanelOverlay) return;
  
  // Slide out
  sidePanelOverlay.style.right = '-400px';
  
  // Remove after animation
  setTimeout(() => {
    if (sidePanelOverlay && document.body.contains(sidePanelOverlay)) {
      document.body.removeChild(sidePanelOverlay);
      sidePanelOverlay = null;
    }
  }, 300);
}

// Perform search in side panel
function performSidePanelSearch(query) {
  const results = document.getElementById('jdp-results');
  const defaultContent = document.getElementById('jdp-default-content');
  
  if (!results || !defaultContent) return;
  
  // Hide default content
  defaultContent.style.display = 'none';
  
  // Show loading
  results.innerHTML = `
    <div style="text-align: center; padding: 32px; color: #666;">
      <div style="width: 24px; height: 24px; border: 2px solid #e1e5e9; border-top: 2px solid #0066cc; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
      Searching for "${query}"...
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  // Perform actual lookup using the Justice Definitions Project API
  const cleanQuery = query.replace(/[^a-zA-Z ]/g, "");
  const api = CONFIG.API_URL || "https://jdc-definitions.wikibase.wiki/w/api.php";
  const searchParams = "action=query&list=search&srprop=snippet&format=json&origin=*" + 
    `&srsearch=${encodeURIComponent(cleanQuery)}`;
  
  fetch(`${api}?${searchParams}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.query && data.query.search && data.query.search.length > 0) {
        // Show all search results
        let resultsHTML = '';
        
        data.query.search.forEach((item, index) => {
          const title = item.title;
          const snippet = item.snippet || "";
          
          // Clean up the snippet
          const tmp = document.createElement("div");
          tmp.innerHTML = snippet;
          const cleanSnippet = (tmp.textContent || tmp.innerText || "")
            .replace(/\[\[[^\]]+\]\]/g, "")
            .replace(/\{\{[^}]+\}\}/g, "")
            .replace(/==+[^=]*==+/g, "")
            .replace(/\s+/g, " ")
            .trim();
          
          const sourceUrl = `https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
          
          resultsHTML += `
            <div style="background: white; border: 1px solid #e1e5e9; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 16px; font-weight: 600; color: #0066cc; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <a href="${sourceUrl}" target="_blank" style="color: inherit; text-decoration: none;">${title}</a>
                <span style="font-size: 12px; color: #999;">(${index + 1})</span>
              </div>
              <div style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">${cleanSnippet}</div>
              <div style="font-size: 12px; color: #999;">
                <a href="${sourceUrl}" target="_blank" style="color: #0066cc; text-decoration: none;">Read more →</a>
              </div>
            </div>
          `;
        });
        
        results.innerHTML = resultsHTML;
      } else {
        // No results found - use a fixed button ID
        const buttonId = 'request-def-btn';
        results.innerHTML = `
          <div style="background: white; border: 1px solid #e1e5e9; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
            <div style="font-size: 16px; font-weight: 600; color: #dc3545; margin-bottom: 8px;">No Results Found</div>
            <div style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 12px;">No definitions found for "${query}" in the Justice Definitions Project database.</div>
            <button id="${buttonId}" data-query="${query}" style="background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">Request Definition</button>
          </div>
        `;
        
        // Add event listener to the button
        setTimeout(() => {
          const button = document.getElementById(buttonId);
          if (button) {
            button.addEventListener('click', function() {
              const query = this.getAttribute('data-query');
              console.log('Request Definition button clicked for query:', query);
              console.log('Available functions:', {
                requestDefinitionFromSidePanel: typeof window.requestDefinitionFromSidePanel,
                handleDefinitionRequest: typeof window.handleDefinitionRequest
              });
              
              if (typeof window.requestDefinitionFromSidePanel === 'function') {
                window.requestDefinitionFromSidePanel(query);
              } else if (typeof window.handleDefinitionRequest === 'function') {
                window.handleDefinitionRequest(query);
              } else {
                console.error('No request function available');
                alert('Error: Request function not available. Please reload the extension.');
              }
            });
          }
        }, 10);
      }
    })
    .catch(error => {
      console.error("Search failed:", error);
      results.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="font-size: 16px; font-weight: 600; color: #856404; margin-bottom: 8px;">Search Error</div>
          <div style="color: #856404; font-size: 14px; line-height: 1.5;">Failed to search for "${query}". Please try again.</div>
        </div>
      `;
    });
}

// Request definition from side panel
function requestDefinitionFromSidePanel(query) {
  // Check if extension context is still valid
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      console.error("Extension context invalidated - cannot proceed with webhook request");
      return;
    }
  } catch (error) {
    console.error("Extension context check failed:", error.message);
    return;
  }
  
  // Check if webhook endpoint is configured
  if (!WEBHOOK_ENDPOINT) {
    console.error("Webhook endpoint not configured - cannot submit request");
    const results = document.getElementById('jdp-results');
    if (results) {
      results.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="font-size: 16px; font-weight: 600; color: #856404; margin-bottom: 8px;">Webhook Not Configured</div>
          <div style="color: #856404; font-size: 14px; line-height: 1.5;">Request submission is not available. The webhook endpoint needs to be configured.</div>
        </div>
      `;
    }
    return;
  }
  
  console.log("requestDefinitionFromSidePanel called with query:", query);
  console.log("CONFIG object:", CONFIG);
  console.log("Webhook endpoint:", WEBHOOK_ENDPOINT);
  
  // Get current page URL
  const pageUrl = window.location.href;
  const nowIso = new Date().toISOString();
  
  // Prepare request data (access key is now handled server-side)
  const requestData = { 
    term: query, 
    page_url: pageUrl, 
    timestamp: nowIso
  };
  
  console.log("Sending webhook request from side panel:", requestData);
  console.log("Webhook endpoint:", WEBHOOK_ENDPOINT);
  
  // Show loading state in side panel
  const results = document.getElementById('jdp-results');
  if (results) {
    results.innerHTML = `
      <div style="background: white; border: 1px solid #e1e5e9; border-radius: 8px; padding: 16px; margin-bottom: 12px; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
          <div style="width: 16px; height: 16px; border: 2px solid #0066cc; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="color: #666;">Submitting request...</span>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
  }
  
  // Use fetch with proper CORS to our secure server
  console.log("About to send fetch request to:", WEBHOOK_ENDPOINT);
  console.log("Request method: POST");
  console.log("Request data:", requestData);
  
  try {
    const fetchPromise = fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    console.log("Fetch promise created, waiting for response...");
    
    fetchPromise
    .then(async (response) => {
      console.log("Fetch response received:", response);
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      try {
        const responseData = await response.json();
        console.log("Response data:", responseData);
        
        if (response.ok && responseData.success) {
          console.log("Request submitted successfully from side panel");
          
          if (results && document.body.contains(results)) {
            results.innerHTML = `
              <div style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
                <div style="font-size: 16px; font-weight: 600; color: #28a745; margin-bottom: 8px;">✓ Request Submitted Successfully</div>
                <div style="color: #155724; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">Your request for "${query}" has been sent to the Justice Definitions Project team.</div>
                <div style="color: #155724; font-size: 12px; line-height: 1.4;">The term will be reviewed by experts and added to the database if approved.</div>
              </div>
            `;
          }
        } else {
          throw new Error(responseData.error || `Server responded with status: ${response.status}`);
        }
      } catch (domError) {
        console.error("Could not update DOM after success (extension context may be invalidated):", domError.message);
      }
    })
    .catch((error) => {
      console.error("Request failed from side panel:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      try {
        if (results && document.body.contains(results)) {
          let errorMessage = "Failed to submit request. Please try again.";
          if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
            errorMessage = "Request blocked by ad blocker or browser extension. Please disable ad blockers for this site and try again.";
          }
          
          results.innerHTML = `
            <div style="background: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
              <div style="font-size: 16px; font-weight: 600; color: #dc3545; margin-bottom: 8px;">Request Failed</div>
              <div style="color: #721c24; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">${errorMessage}</div>
              <div style="color: #721c24; font-size: 12px; line-height: 1.4;">Error: ${error.message || 'Unknown error'}</div>
              <div style="color: #721c24; font-size: 11px; line-height: 1.4; margin-top: 8px; font-style: italic;">Debug: ${error.name} - ${error.message}</div>
            </div>
          `;
        }
      } catch (domError) {
        console.error("Could not update DOM after error (extension context may be invalidated):", domError.message);
      }
    });
  } catch (fetchError) {
    console.error("Failed to initiate fetch request (extension context may be invalidated):", fetchError.message);
    console.error("Fetch error name:", fetchError.name);
    console.error("Fetch error stack:", fetchError.stack);
    
    try {
      if (results && document.body.contains(results)) {
        results.innerHTML = `
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <div style="font-size: 16px; font-weight: 600; color: #856404; margin-bottom: 8px;">Extension Context Error</div>
            <div style="color: #856404; font-size: 14px; line-height: 1.5;">Please reload the extension and try again.</div>
            <div style="color: #856404; font-size: 11px; line-height: 1.4; margin-top: 8px; font-style: italic;">Debug: ${fetchError.name} - ${fetchError.message}</div>
          </div>
        `;
      }
    } catch (domError) {
      console.error("Could not update DOM after fetch error:", domError.message);
    }
  }
}

// Make requestDefinitionFromSidePanel globally accessible
window.requestDefinitionFromSidePanel = requestDefinitionFromSidePanel;

// Also expose it on the document for better compatibility
document.requestDefinitionFromSidePanel = requestDefinitionFromSidePanel;

// Add a fallback function that can be called from the side panel
window.handleDefinitionRequest = function(query) {
  console.log("handleDefinitionRequest called with query:", query);
  if (typeof requestDefinitionFromSidePanel === 'function') {
    requestDefinitionFromSidePanel(query);
  } else {
    console.error("requestDefinitionFromSidePanel function not available");
  }
};

// Test function to verify webhook URL accessibility
function testWebhookURL() {
  console.log("Testing webhook URL accessibility...");
  console.log("Webhook URL:", CONFIG.WEBHOOK_URL);
  
  // Test with a simple GET request first
  fetch(CONFIG.WEBHOOK_URL, {
    method: 'GET',
    mode: 'no-cors'
  })
  .then((response) => {
    console.log("GET test response:", response);
    console.log("GET test - Response type:", response.type);
    console.log("GET test - Response status:", response.status);
  })
  .catch((error) => {
    console.error("GET test failed:", error);
  });
  
  // Test with POST request
  const testFormData = new FormData();
  testFormData.append('term', 'test_term');
  testFormData.append('page_url', 'https://test.com');
  testFormData.append('timestamp', new Date().toISOString());
  testFormData.append('access_key', CONFIG.WEBHOOK.ACCESS_KEY);
  
  fetch(CONFIG.WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: testFormData
  })
  .then((response) => {
    console.log("POST test response:", response);
    console.log("POST test - Response type:", response.type);
    console.log("POST test - Response status:", response.status);
  })
  .catch((error) => {
    console.error("POST test failed:", error);
  });
}

// Make test function globally accessible
window.testWebhookURL = testWebhookURL;

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
        const pageid = first.pageid;
        const snippet = first.snippet || "";
        
        // Clean up the snippet first
        const tmp = document.createElement("div");
        tmp.innerHTML = snippet;
        let cleanSnippet = (tmp.textContent || tmp.innerText || "")
          .replace(/\[\[[^\]]+\]\]/g, "")
          .replace(/\{\{[^}]+\}\}/g, "")
          .replace(/==+[^=]*==+/g, "")
          .replace(/\s+/g, " ")
          .trim();
        
        // Always try to get more content using extract, but fall back to snippet if needed
        const extractParams = `action=query&prop=extracts&explaintext=1&exsectionformat=plain&format=json&origin=*&pageids=${encodeURIComponent(pageid)}`;
        
        return fetch(`${api}?${extractParams}`)
          .then(response => response.json())
          .then(extractData => {
            let extractText = "";
            if (extractData && extractData.query && extractData.query.pages && extractData.query.pages[pageid]) {
              extractText = (extractData.query.pages[pageid].extract || "").trim();
            }
            
            // Use extract if available, otherwise fall back to snippet
            const finalText = extractText || cleanSnippet;
            showDefinitionResult(title, finalText, query);
          })
          .catch(error => {
            console.error("Extract fetch failed:", error);
            // Fall back to snippet even if it's short
            showDefinitionResult(title, cleanSnippet, query);
          });
      } else {
        showNoResult(query);
      }
    })
    .catch(error => {
      showError("Lookup failed");
    });
}

function showDefinitionResult(title, definition, originalQuery) {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.error("Extension context invalidated - cannot proceed with definition display");
    return;
  }
  
  if (!floatingPopup) {
    console.error("showDefinitionResult: floatingPopup is null");
    return;
  }
  
  if (!document.body.contains(floatingPopup)) {
    console.error("showDefinitionResult: floatingPopup is not in DOM");
    return;
  }
  
  // Ensure popup width adjusts to content
  try {
    floatingPopup.style.width = 'auto';
    floatingPopup.style.maxWidth = '400px';
  } catch (error) {
    console.error("Error setting popup styles:", error.message);
    return;
  }
  
  // Handle empty or very short definitions
  let displayText = "";
  if (!definition || definition.trim().length === 0) {
    displayText = "Definition content not available. Click 'Read more' to view the full page.";
  } else if (definition.trim().length < 10) {
    displayText = definition.trim() + " (Click 'Read more' for full definition)";
  } else {
    // More direct approach: split into lines and filter out metadata lines
    console.log("Processing definition content:", definition);
    const lines = definition.split('\n');
    console.log("Split into lines:", lines);
    const filteredLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip metadata lines
      if (trimmedLine.match(/^Content on this page has been reviewed/i) ||
          trimmedLine.match(/^Reviewed by:/i) ||
          trimmedLine.match(/^Last updated:/i) ||
          trimmedLine === '') {
        continue;
      }
      
      filteredLines.push(trimmedLine);
    }
    
    const cleanDefinition = filteredLines.join('\n').trim();
    
    console.log("Filtered lines:", filteredLines);
    
    // Now find the first substantial content line
    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];
      console.log(`Processing line ${i}: "${line}"`);
      
      // Skip only obvious headers and very short lines
      if (line.length < 10 || 
          line.match(/^(Table of contents|Contents|Navigation|References|See also)$/i) ||
          (line.match(/^[A-Z][a-z]+$/) && line.length < 20)) {
        console.log(`Skipping short/header line: "${line}"`);
        continue;
      }
      
      // Universal pattern: Skip any "What is..." question/heading and look for the actual answer
      if (line.match(/^What is.*$/i)) {
        console.log(`Found "What is..." line: "${line}", looking for next substantial line`);
        // Look for the next substantial line after the question/heading
        for (let j = i + 1; j < filteredLines.length; j++) {
          const nextLine = filteredLines[j];
          console.log(`Checking next line ${j}: "${nextLine}"`);
          if (nextLine.length >= 20 && 
              !nextLine.match(/^(Table of contents|Contents|Navigation|References|See also)$/i) &&
              !nextLine.match(/^What is.*$/i)) {
            // Found the actual definition after the question/heading
            console.log(`Found definition line: "${nextLine}"`);
            const maxChars = 200;
            displayText = nextLine.length > maxChars ? 
              nextLine.substring(0, maxChars) + "..." : nextLine;
            break;
          }
        }
        if (displayText) {
          console.log(`Using definition: "${displayText}"`);
          break; // Found definition after question
        }
        continue; // Skip the question/heading line itself
      }
      
      // Found a substantial line - use it
      const maxChars = 200;
      displayText = line.length > maxChars ? 
        line.substring(0, maxChars) + "..." : line;
      break;
    }
    
    // If no substantial line found, use the first non-empty line
    if (!displayText || displayText.length < 10) {
      if (filteredLines.length > 0) {
        const firstLine = filteredLines[0];
        const maxChars = 200;
        displayText = firstLine.length > maxChars ? 
          firstLine.substring(0, maxChars) + "..." : firstLine;
      } else {
        displayText = "Definition content not available. Click 'Read more' to view the full page.";
      }
    }
    
    // Ensure we have substantial content (at least 4 words)
    const wordCount = displayText.trim().split(/\s+/).length;
    if (wordCount < 4 && filteredLines.length > 1) {
      // Try to get more content by combining lines
      let combinedText = displayText;
      for (let i = 1; i < Math.min(filteredLines.length, 3); i++) {
        const additionalLine = filteredLines[i];
        if (additionalLine.length >= 10) {
          combinedText += " " + additionalLine;
          if (combinedText.length >= 200) {
            combinedText = combinedText.substring(0, 200) + "...";
            break;
          }
        }
      }
      if (combinedText.trim().split(/\s+/).length >= 4) {
        displayText = combinedText;
      }
    }
  }
  
  // Ensure displayText is never empty or just metadata
  if (!displayText || displayText.trim().length === 0 || 
      (displayText.match(/Content on this page has been reviewed/i) && displayText.length < 100)) {
    displayText = "Definition content not available. Click 'Read more' to view the full page.";
  }
  
  try {
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
  } catch (error) {
    console.error("Failed to update popup innerHTML:", error.message);
    // Try to show a simple error message
    try {
      floatingPopup.innerHTML = `
        <div style="margin-bottom: 8px;">
          <strong style="color: #0066cc;">${title}</strong>
        </div>
        <div style="margin-bottom: 8px; color: #dc3545;">
          Error displaying content. Click 'Read more' to view the full page.
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <a href="https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}" 
             target="_blank" 
             style="color: #0066cc; text-decoration: none; font-size: 12px;">
            Read more →
          </a>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
            ✕
          </button>
        </div>
      `;
    } catch (fallbackError) {
      console.error("Failed to show fallback content:", fallbackError.message);
    }
  }
}

function showNoResult(query) {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.error("Extension context invalidated - cannot proceed with no result display");
    return;
  }
  
  if (!floatingPopup) {
    console.error("showNoResult: floatingPopup is null");
    return;
  }
  
  if (!document.body.contains(floatingPopup)) {
    console.error("showNoResult: floatingPopup is not in DOM");
    return;
  }
  
  try {
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
  } catch (error) {
    console.error("Error setting no result innerHTML:", error.message);
    return;
  }
  
  // Add click handler for request button
  try {
    const requestBtn = floatingPopup.querySelector('#requestBtn');
    if (requestBtn) {
      requestBtn.onclick = function() {
        requestDefinition(query);
      };
    }
  } catch (error) {
    console.error("Error setting up request button:", error.message);
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
  
  // Check if webhook endpoint is configured
  if (!WEBHOOK_ENDPOINT) {
    console.error("Webhook endpoint not configured - cannot submit request");
    floatingPopup.innerHTML = `
      <div style="color: #856404; margin-bottom: 8px;">
        <strong>⚠ Webhook Not Configured</strong>
      </div>
      <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
        Request submission is not available. The webhook endpoint needs to be configured.
      </div>
      <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px; padding: 4px;">
          ✕ Close
        </button>
      </div>
    `;
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
  
  // Prepare request data (access key is now handled server-side)
  const requestData = { 
    term: query, 
    page_url: pageUrl, 
    timestamp: nowIso
  };
  
  console.log("Sending webhook request:", requestData);
  console.log("Webhook endpoint:", WEBHOOK_ENDPOINT);
  
  fetch(WEBHOOK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData)
  })
  .then(async (response) => {
    console.log("Response received:", response);
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    
    try {
      const responseText = await response.text();
      console.log("Response text:", responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      console.log("Parsed response data:", responseData);
      
      if (response.ok && responseData.success) {
        console.log("Request submitted successfully");
        showRequestSuccess(query);
      } else {
        throw new Error(responseData.error || `Server responded with status: ${response.status}`);
      }
    } catch (parseError) {
      console.error("Failed to parse response:", parseError);
      showRequestError("Failed to submit request. Please try again.");
    }
  })
  .catch((error) => {
    console.error("Request failed:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    // Check if it's a blocked request
    if (error.message && error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
      showRequestError("Request blocked by ad blocker or browser extension. Please disable ad blockers for this site and try again.");
    } else if (error.message && error.message.includes('Failed to fetch')) {
      showRequestError("Network error: Unable to connect to the webhook server. Please check your internet connection and try again.");
    } else {
      showRequestError(`Failed to submit request: ${error.message}`);
    }
  });
}

function showRequestSuccess(query) {
  // Check if popup exists and is in DOM
  if (!floatingPopup || !document.body.contains(floatingPopup)) {
    console.log("Popup not available, creating new one for success message");
    // Create a new popup for the success message
    createSuccessPopup(query);
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

function createSuccessPopup(query) {
  // Create a new popup for success message
  const successPopup = document.createElement("div");
  successPopup.id = "jdp-success-popup";
  successPopup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 16px;
    min-width: 300px;
    max-width: 400px;
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
  `;
  
  successPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #28a745;">✓ Request Submitted Successfully</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      Your request for "<strong>${query}</strong>" has been sent to the Justice Definitions Project team.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="this.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px; padding: 4px;">
        ✕ Close
      </button>
    </div>
  `;
  
  document.body.appendChild(successPopup);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(successPopup)) {
      successPopup.remove();
    }
  }, 5000);
}

function showRequestError(message) {
  // Check if popup exists and is in DOM
  if (!floatingPopup || !document.body.contains(floatingPopup)) {
    console.log("Popup not available, creating new one for error message");
    // Create a new popup for the error message
    createErrorPopup(message);
    return;
  }
  
  // Check if it's a blocked request and provide helpful message
  let displayMessage = message;
  if (message.includes('ERR_BLOCKED_BY_CLIENT') || message.includes('blocked by ad blocker')) {
    displayMessage = "Request blocked by ad blocker or browser extension. Please disable ad blockers for this site and try again.";
  }
  
  floatingPopup.innerHTML = `
    <div style="color: #dc3545; margin-bottom: 8px;">
      <strong>⚠ Request Failed</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      ${displayMessage}
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

function createErrorPopup(message) {
  // Create a new popup for error message
  const errorPopup = document.createElement("div");
  errorPopup.id = "jdp-error-popup";
  errorPopup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #dc3545;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 16px;
    min-width: 300px;
    max-width: 400px;
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
  `;
  
  errorPopup.innerHTML = `
    <div style="color: #dc3545; margin-bottom: 8px;">
      <strong>⚠ Request Failed</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      ${message}
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="this.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px; padding: 4px;">
        ✕ Close
      </button>
    </div>
  `;
  
  document.body.appendChild(errorPopup);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(errorPopup)) {
      errorPopup.remove();
    }
  }, 5000);
}

function showError(message) {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.error("Extension context invalidated - cannot proceed with error display");
    return;
  }
  
  if (!floatingPopup) {
    console.error("showError: floatingPopup is null");
    return;
  }
  
  if (!document.body.contains(floatingPopup)) {
    console.error("showError: floatingPopup is not in DOM");
    return;
  }
  
  try {
    floatingPopup.innerHTML = `
      <div style="color: #dc3545; margin-bottom: 8px;">
        ⚠ ${message}
      </div>
      <button onclick="this.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
        ✕
      </button>
    `;
  } catch (error) {
    console.error("Failed to show error message:", error.message);
  }
}

// Hide popup when clicking elsewhere and handle side panel clicks
document.addEventListener("click", function(event) {
  try {
    // Check if extension context is still valid
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return; // Extension context invalidated, don't proceed
    }
    
    // Additional check to prevent chrome API calls if context is invalid
    try {
      chrome.runtime.getManifest();
    } catch (e) {
      return; // Context is invalid, exit early
    }
    
    if (floatingPopup && !floatingPopup.contains(event.target)) {
      floatingPopup.remove();
      floatingPopup = null;
    }
    
    // Check if click is outside side panel and send message to close it
    try {
      chrome.runtime.sendMessage({ type: "CHECK_SIDE_PANEL_STATUS" }, (response) => {
        try {
          if (response && response.isOpen) {
            // Side panel is open, send click outside message with window ID
            // Check if chrome.windows is available before using it
            if (chrome.windows && typeof chrome.windows.getCurrent === 'function') {
              chrome.windows.getCurrent((window) => {
                try {
                  if (window && window.id) {
                    chrome.runtime.sendMessage({ 
                      type: "CLICK_OUTSIDE_SIDE_PANEL", 
                      windowId: window.id 
                    });
                  } else {
                    // Fallback: send message without window ID
                    chrome.runtime.sendMessage({ 
                      type: "CLICK_OUTSIDE_SIDE_PANEL" 
                    });
                  }
                } catch (error) {
                  console.error("Error sending click outside message:", error.message);
                }
              });
            } else {
              // Fallback: send message without window ID if chrome.windows is not available
              chrome.runtime.sendMessage({ 
                type: "CLICK_OUTSIDE_SIDE_PANEL" 
              });
            }
          }
        } catch (error) {
          console.error("Error in response handler:", error.message);
        }
      });
    } catch (error) {
      console.error("Error sending side panel status check:", error.message);
    }
  } catch (error) {
    console.error("Error in click event handler:", error.message);
  }
});

// receive the message from popup (for backward compatibility with extension popup).
chrome.runtime.onMessage.addListener(onMessageReceived);

function onMessageReceived(message, sender, sendResponse) {
  try {
    // Check if extension context is still valid
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return; // Extension context invalidated, don't proceed
    }
    
    if (message.type === "SEARCH_QUERY") {
      // Store the search query for the side panel
      chrome.storage.local.set({ lastSearchQuery: message.query });
    
    // Create overlay side panel instead of Chrome side panel
    createSidePanelOverlay();
    
    // Perform search in the overlay
    setTimeout(() => {
      performSidePanelSearch(message.query);
    }, 100);
    
    sendResponse({ success: true });
  } else if (message.type === "OPEN_SIDE_PANEL") {
    // Create overlay side panel
    createSidePanelOverlay();
    sendResponse({ success: true });
  } else if (message.type === "SIDE_PANEL_CLOSED") {
    // Side panel was closed - refresh status
    console.log("Side panel closed notification received");
    refreshSidePanelStatus();
    sendResponse({ success: true });
  } else if (message.txt === "hello from popup") {
    // Legacy popup support - redirect to overlay side panel
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText !== "_TextNotSelected_") {
      const cleanWord = selectedText.replace(/[^a-zA-Z ]/g, "");
      chrome.storage.local.set({ lastSearchQuery: cleanWord });
      createSidePanelOverlay();
      
      // Perform search in the overlay
      setTimeout(() => {
        performSidePanelSearch(cleanWord);
      }, 100);
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
  } catch (error) {
    console.error("Error in message handler:", error.message);
    return false;
  }
}
