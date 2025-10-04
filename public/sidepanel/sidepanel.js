// Justice Definitions Project Side Panel Script

// Load configuration
// No fallback needed - config.js is loaded before this script
let CONFIG = window.EXTENSION_CONFIG;

// Initialize the side panel
document.addEventListener('DOMContentLoaded', function() {
  initializeSidePanel();
});

function initializeSidePanel() {
  // Set up search functionality
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  if (searchInput && searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
  
  // Set up close button
  const closeBtn = document.getElementById('closeBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidePanel);
  }
  
  // Set up click-outside functionality
  setupClickOutsideHandler();
  
  // Set up beforeunload listener to detect when side panel is closed
  window.addEventListener('beforeunload', function() {
    // Notify background script that side panel is being closed
    chrome.runtime.sendMessage({ type: "SIDE_PANEL_CLOSED" });
  });
  
  // Check if we have a search query from the extension
  checkForSearchQuery();
}

function checkForSearchQuery() {
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SEARCH_QUERY') {
      performSearch(message.query);
      sendResponse({ success: true });
    }
  });
  
  // Check if there's a stored search query
  chrome.storage.local.get(['lastSearchQuery'], (result) => {
    if (result.lastSearchQuery) {
      performSearch(result.lastSearchQuery);
      // Clear the stored query
      chrome.storage.local.remove(['lastSearchQuery']);
    }
  });
  
  // Check for popup definition data
  chrome.storage.local.get(['popupDefinitionData'], (result) => {
    if (result.popupDefinitionData) {
      showPopupDefinition(result.popupDefinitionData);
      // Clear the stored data
      chrome.storage.local.remove(['popupDefinitionData']);
    }
  });
}

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const query = searchInput.value.trim();
  
  if (query) {
    performSearch(query);
  }
}

async function performSearch(query) {
  // Set the search input value
  document.getElementById('searchInput').value = query;
  
  // Show loading state
  showLoading();
  
  try {
    const results = await searchJDPWiki(query);
    displayResults(results, query);
  } catch (error) {
    console.error('Search error:', error);
    showError('Failed to search definitions. Please try again.');
  }
}

async function searchJDPWiki(query) {
  const api = CONFIG.API_URL || "https://jdc-definitions.wikibase.wiki/w/api.php";
  
  // First: search for the page
  const searchParams = "action=query&list=search&srprop=snippet&format=json&origin=*" + 
    `&srsearch=${encodeURIComponent(query)}`;
  
  const searchResp = await fetch(`${api}?${searchParams}`);
  const searchData = await searchResp.json();
  
  if (searchData && searchData.query && searchData.query.search && searchData.query.search.length > 0) {
    const results = [];
    
    // Get detailed content for each result (limit to first 5)
    const searchResults = searchData.query.search.slice(0, 5);
    
    for (const result of searchResults) {
      const title = result.title;
      const pageid = result.pageid;
      
      // Get extract for this page
      const extractParams = `action=query&prop=extracts&explaintext=1&exintro=1&exsectionformat=plain&format=json&origin=*&pageids=${encodeURIComponent(pageid)}`;
      const extractResp = await fetch(`${api}?${extractParams}`);
      const extractData = await extractResp.json();
      
      let extractText = "";
      if (extractData && extractData.query && extractData.query.pages && extractData.query.pages[pageid]) {
        extractText = (extractData.query.pages[pageid].extract || "").trim();
      }
      
      // Fallback to snippet if extract is empty
      if (!extractText) {
        const snippetHtml = result.snippet || "";
        const tmp = document.createElement("div");
        tmp.innerHTML = snippetHtml;
        const snippetText = (tmp.textContent || tmp.innerText || "");
        extractText = snippetText
          .replace(/\[\[[^\]]+\]\]/g, "")
          .replace(/\{\{[^}]+\}\}/g, "")
          .replace(/==+[^=]*==+/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }
      
      const sourceUrl = `https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      
      results.push({
        title: title,
        snippet: extractText,
        url: sourceUrl,
        pageid: pageid
      });
    }
    
    return results;
  } else {
    return [];
  }
}

// Removed unused function - div-based overlay handles all functionality

function getOptimalDisplayText(text) {
  if (!text || text.length === 0) return "";
  
  const maxChars = CONFIG.DISPLAY?.MAX_CHARS || 140;
  const extendedChars = CONFIG.DISPLAY?.EXTENDED_CHARS || 200;
  const maxExtendedChars = CONFIG.DISPLAY?.MAX_EXTENDED_CHARS || 250;
  const minWordCount = CONFIG.DISPLAY?.MIN_WORD_COUNT || 4;
  
  // If text is short enough, return as is
  if (text.length <= maxChars) {
    return text;
  }
  
  // Get first characters up to max limit
  let truncated = text.slice(0, maxChars);
  
  // Check if we have a complete sentence (ends with .)
  if (truncated.endsWith('.')) {
    return truncated;
  }
  
  // Find the last complete sentence within 140 characters
  const lastPeriodIndex = truncated.lastIndexOf('.');
  if (lastPeriodIndex > 0) {
    return truncated.slice(0, lastPeriodIndex + 1);
  }
  
  // If no complete sentence, extend until we find a period or reach reasonable limit
  let extended = text.slice(0, extendedChars);
  const nextPeriodIndex = extended.indexOf('.', maxChars);
  
  if (nextPeriodIndex > 0) {
    return extended.slice(0, nextPeriodIndex + 1);
  }
  
  // If still no period, check word count
  const wordCount = truncated.split(/\s+/).length;
  if (wordCount < minWordCount) {
    // If less than minimum words, extend to get more meaningful content
    extended = text.slice(0, maxExtendedChars);
    const nextSpaceIndex = extended.indexOf(' ', maxChars);
    if (nextSpaceIndex > 0) {
      return extended.slice(0, nextSpaceIndex) + "…";
    }
  }
  
  // Fallback: return truncated with ellipsis
  return truncated + "…";
}

function showLoading() {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Searching Justice Definitions Project...</p>
    </div>
  `;
}

function showError(message) {
  const resultsContainer = document.getElementById('results');
  resultsContainer.innerHTML = `
    <div class="error">
      <strong>Error:</strong> ${message}
    </div>
  `;
}

// Removed unused functions - div-based overlay handles all functionality

function setupClickOutsideHandler() {
  // Listen for clicks on the main page (outside the side panel)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CLICK_OUTSIDE_SIDE_PANEL') {
      closeSidePanel();
    }
  });
}

// Removed unused function - div-based overlay handles all functionality

// Removed unused iframe-based functions - div-based overlay handles all functionality

function closeSidePanel() {
  // Close the side panel by sending a message to the background script
  // The background script will handle finding the correct window
  console.log("Close button clicked, sending close message");
  chrome.runtime.sendMessage({ type: "CLOSE_SIDE_PANEL" }, (response) => {
    console.log("Close response:", response);
  });
  
  // Also notify that the side panel is being closed
  chrome.runtime.sendMessage({ type: "SIDE_PANEL_CLOSED" }, (response) => {
    console.log("Side panel closed notification sent:", response);
  });
}
