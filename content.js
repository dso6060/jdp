window.addEventListener("mouseup", handleSelection);
window.addEventListener("keyup", handleSelection);

var selectedText;
var floatingPopup = null;

// Webhook URL for requesting definitions
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyC9aQdgLCS3Kj2TBi5MO5ybMUA5I7ytI_8PqQcC10HVgWGIU62VH7YKm_IwNwttVZI/exec";

function handleSelection() {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  // Remove any existing floating popup
  if (floatingPopup) {
    floatingPopup.remove();
    floatingPopup = null;
  }
  
  // Only show popup if meaningful text is selected (more than 2 characters)
  if (selectedText && selectedText.length > 2) {
    showFloatingPopup(selection);
  }
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
  
  // Send request to webhook
  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      term: query, 
      page_url: pageUrl, 
      timestamp: nowIso 
    })
  })
  .then(response => {
    if (response.ok) {
      showRequestSuccess(query);
    } else {
      showRequestError("Could not submit request.");
    }
  })
  .catch(error => {
    showRequestError("Network error submitting request.");
  });
}

function showRequestSuccess(query) {
  if (!floatingPopup) return;
  
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #28a745;">✓ Request submitted</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      Your request for "${query}" has been sent to the Justice Definitions Project team.
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
      ⚠ ${message}
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
