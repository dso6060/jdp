// Listen for right-click (context menu) to trigger lookup
document.addEventListener("contextmenu", handleRightClick);

var selectedText;
var floatingPopup = null;

// Webhook URL for requesting definitions
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyC9aQdgLCS3Kj2TBi5MO5ybMUA5I7ytI_8PqQcC10HVgWGIU62VH7YKm_IwNwttVZI/exec";

function handleRightClick(event) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // Only proceed if there's meaningful text selected (more than 2 characters)
  if (!selectedText || selectedText.length <= 2) {
    return;
  }
  
  // Remove any existing floating popup
  if (floatingPopup) {
    floatingPopup.remove();
    floatingPopup = null;
  }
  
  // Show the floating popup
  showFloatingPopup(selection);
  
  // Prevent the default context menu from appearing
  event.preventDefault();
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
    max-width: 300px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    color: #333;
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
  
  const maxChars = 140;
  const displayText = definition.length > maxChars ? 
    definition.substring(0, maxChars) + "..." : definition;
  
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #0066cc;">${title}</strong>
    </div>
    <div style="margin-bottom: 8px; line-height: 1.4;">
      ${displayText}
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
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
  if (!floatingPopup) return;
  
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
    timestamp: nowIso 
  };
  
  console.log("Sending webhook request:", requestData);
  console.log("Webhook URL:", WEBHOOK_URL);
  
  // Try multiple approaches to avoid CORS issues
  
  // Approach 1: Form data POST (most compatible with Google Apps Script)
  const formData = new FormData();
  formData.append('term', query);
  formData.append('page_url', pageUrl);
  formData.append('timestamp', nowIso);
  
  fetch(WEBHOOK_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData
  })
  .then(() => {
    // With no-cors mode, we can't read the response status
    // So we assume success if no error is thrown
    showRequestSuccess(query);
  })
  .catch(error => {
    console.error("Form data POST failed:", error);
    
    // Approach 2: Fallback to GET request with URL parameters
    const params = new URLSearchParams({
      term: query,
      page_url: pageUrl,
      timestamp: nowIso
    });
    
    fetch(`${WEBHOOK_URL}?${params}`, {
      method: "GET",
      mode: "no-cors"
    })
    .then(() => {
      showRequestSuccess(query);
    })
    .catch(getError => {
      console.error("GET fallback also failed:", getError);
      showRequestError("Failed to submit request. Please try again.");
    });
  });
}

function showRequestSuccess(query) {
  if (!floatingPopup) return;
  
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #28a745;">✓ Request submitted successfully</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      Your request for "<strong>${query}</strong>" has been sent to the Justice Definitions Project team.
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 11px; background: #f8f9fa; padding: 6px; border-radius: 4px;">
      The team will review your request and may add this definition to the knowledge base.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
        ✕
      </button>
    </div>
  `;
}

function showRequestError(message) {
  if (!floatingPopup) return;
  
  floatingPopup.innerHTML = `
    <div style="color: #dc3545; margin-bottom: 8px;">
      <strong>⚠ Request failed</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      ${message}
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 11px; background: #fff3cd; padding: 6px; border-radius: 4px; border-left: 3px solid #ffc107;">
      <strong>Tip:</strong> You can also request definitions by clicking the extension icon and using the "Request Definition" button there.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
        ✕
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

// Hide popup when clicking elsewhere
document.addEventListener("click", function(event) {
  if (floatingPopup && !floatingPopup.contains(event.target)) {
    floatingPopup.remove();
    floatingPopup = null;
  }
});

// receive the message from popup (for backward compatibility with extension popup).
chrome.runtime.onMessage.addListener(onMessageReceived);

function onMessageReceived(message, sender, sendResponse) {
  let msg =
    selectedText && selectedText.length > 0
      ? selectedText
      : "_TextNotSelected_";

  // send the selected text to the popup.js as a response to the message.
  sendResponse({ selectedWord: msg });
}
