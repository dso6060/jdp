/**
 * Justice Definitions Project Chrome Extension - Content Script
 * Handles webpage interaction, definition lookup, and side panel management
 */
document.addEventListener("contextmenu", handleRightClick);

var selectedText;
var floatingPopup = null;
var sidePanelOverlay = null;

/**
 * Validates Chrome extension context before executing operations
 */
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

/**
 * Safely executes functions only when extension context is valid
 */
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

/**
 * Opens side panel with definition content from floating popup
 */
function openSidePanelWithDefinition(term, definitionText, sourceUrl) {
  try {
    window.currentRequestContext = 'sidepanel';
    
    if (floatingPopup) {
      floatingPopup.remove();
      floatingPopup = null;
    }
    
    createSidePanelOverlay();
    
    setTimeout(() => {
      showPopupDefinition({
        term: term,
        definitionText: definitionText,
        sourceUrl: sourceUrl
      });
      
      setTimeout(() => {
        window.currentRequestContext = null;
      }, 5000);
    }, 100);
  } catch (error) {
    console.error('Error in openSidePanelWithDefinition:', error);
    if (floatingPopup) {
      floatingPopup.innerHTML = `
        <div style="color: #dc3545; margin-bottom: 8px;">
          <strong>Error opening side panel</strong>
        </div>
        <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
          ${error.message}
        </div>
        <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
                style="background: none; border: none; color: #666; cursor: pointer; font-size: 12px;">
          ✕
        </button>
      `;
    }
  }
}

/**
 * Displays full definition content in the side panel overlay
 */
async function showFullDefinition(index) {
  const results = document.getElementById('jdp-results');
  const definitionView = document.getElementById('jdp-definition-view');
  
  if (!window.currentSearchResults || !window.currentSearchResults[index]) {
    console.error('No search results available for index:', index);
    return;
  }
  
  const result = window.currentSearchResults[index];
  
  if (results) results.style.display = 'none';
  if (definitionView) {
    definitionView.style.display = 'block';
    definitionView.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button data-action="show-search-results" 
                  style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            ← Back to Results
          </button>
        </div>
        <h2 style="margin: 0; color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3;">${result.title}</h2>
      </div>
      <div style="line-height: 1.4; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #666;">
          <div style="width: 16px; height: 16px; border: 2px solid #0066cc; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span>Loading full content...</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button data-action="open-wiki" data-url="${result.url}" 
                  style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            View on Wiki →
          </button>
          <button data-action="show-search-results" 
                  style="padding: 8px 16px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            Back to Results
          </button>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    try {
      const fullContent = await fetchFullWikiContent(result.title, result.url);
      
      definitionView.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button data-action="show-search-results" 
                  style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            ← Back to Results
          </button>
          <button data-action="open-wiki" data-url="${result.url}" 
                  style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            View on Wiki →
          </button>
        </div>
        <h2 style="margin: 0; color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3;">${result.title}</h2>
      </div>
      <div style="line-height: 1.4; margin-bottom: 12px;">
        <div style="color: #333; font-size: 14px; margin-bottom: 12px; line-height: 1.4; max-width: 100%; word-wrap: break-word;">
            ${formatDefinitionContent(fullContent)}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error loading full content:', error);
      definitionView.innerHTML = `
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <button data-action="show-search-results" 
                    style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              ← Back to Results
            </button>
          </div>
          <h2 style="margin: 0; color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3;">${result.title}</h2>
        </div>
        <div style="line-height: 1.4; margin-bottom: 12px;">
          <div style="color: #dc3545; font-size: 14px; margin-bottom: 12px;">
            Error loading full content. ${error.message}
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button data-action="open-wiki" data-url="${result.url}" 
                    style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              View on Wiki →
            </button>
            <button data-action="show-search-results" 
                    style="padding: 8px 16px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              Back to Results
            </button>
          </div>
        </div>
      `;
    }
  }
}

/**
 * Displays search results in the side panel overlay
 */
function showSearchResults() {
  const results = document.getElementById('jdp-results');
  const definitionView = document.getElementById('jdp-definition-view');
  
  if (results) results.style.display = 'block';
  if (definitionView) definitionView.style.display = 'none';
}

/**
 * Opens wiki page in a new tab
 */
function openInWiki(url) {
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: url });
    } else {
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error opening wiki page:', error);
    window.open(url, '_blank');
  }
}

/**
 * Global cache for full content to prevent redundant API calls
 */
window.fullContentCache = window.fullContentCache || {};

/**
 * Formats definition content for better readability
 */
function formatDefinitionContent(content) {
  if (!content) return '';
  
  // Split content into lines and process each line
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let formattedContent = '';
  let inParagraph = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line looks like a heading (short, ends with colon, or is in caps)
    const isHeading = line.length < 100 && (
      line.endsWith(':') || 
      line === line.toUpperCase() && line.length > 3 ||
      /^[A-Z][a-z\s]+:$/.test(line)
    );
    
    // Check if line looks like a question
    const isQuestion = line.startsWith('What is') || line.startsWith('Who is') || 
                      line.startsWith('How') || line.startsWith('Why') || 
                      line.startsWith('When') || line.startsWith('Where');
    
    if (isHeading) {
      // Close previous paragraph if open
      if (inParagraph) {
        formattedContent += '</p>';
        inParagraph = false;
      }
      
      // Add heading with styling
      formattedContent += `<h3 style="color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 16px; font-weight: 600; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e1e5e9;">${line}</h3>`;
      
    } else if (isQuestion) {
      // Close previous paragraph if open
      if (inParagraph) {
        formattedContent += '</p>';
        inParagraph = false;
      }
      
      // Add question with styling
      formattedContent += `<div style="color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 15px; font-weight: 500; margin: 12px 0 6px 0; padding: 6px 10px; background: #f8f9fa; border-left: 3px solid #0066cc; border-radius: 4px;">${line}</div>`;
      
    } else {
      // Regular paragraph content
      if (!inParagraph) {
        formattedContent += '<p style="margin: 0 0 8px 0; text-align: justify; line-height: 1.4; font-family: \'Calibri\', \'Candara\', \'Segoe\', \'Segoe UI\', \'Optima\', Arial, sans-serif;">';
        inParagraph = true;
      }
      
      // Add line with proper spacing
      formattedContent += line + ' ';
    }
  }
  
  // Close final paragraph if open
  if (inParagraph) {
    formattedContent += '</p>';
  }
  
  // If no formatting was applied, return original content with basic paragraph breaks
  if (formattedContent === '') {
    return content.split('\n\n').map(paragraph => 
      `<p style="margin: 0 0 8px 0; text-align: justify; line-height: 1.4; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif;">${paragraph.trim()}</p>`
    ).join('');
  }
  
  return formattedContent;
}

/**
 * Stores full content in cache with timestamp
 */
function cacheFullContent(term, fullContent) {
  if (fullContent && fullContent.length > 50) {
    window.fullContentCache[term.toLowerCase()] = {
      content: fullContent,
      timestamp: Date.now()
    };
  }
}

/**
 * Retrieves cached content if not expired
 */
function getCachedFullContent(term) {
  const cached = window.fullContentCache[term.toLowerCase()];
  if (cached) {
    const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
    if (!isExpired) {
      return cached.content;
    } else {
      delete window.fullContentCache[term.toLowerCase()];
    }
  }
  return null;
}

/**
 * Fetches full wiki content for a term using MediaWiki API
 */
async function fetchFullWikiContent(term, sourceUrl) {
  try {
    const cachedContent = getCachedFullContent(term);
    if (cachedContent) {
      return cachedContent;
    }
    
    const urlParts = sourceUrl.split('/wiki/');
    if (urlParts.length < 2) {
      throw new Error('Invalid wiki URL');
    }
    
    const pageTitle = decodeURIComponent(urlParts[1]);
    
    const api = "https://jdc-definitions.wikibase.wiki/w/api.php";
    const extractParams = `action=query&prop=extracts&explaintext=1&exsectionformat=plain&format=json&origin=*&titles=${encodeURIComponent(pageTitle)}`;
    
    const response = await fetch(`${api}?${extractParams}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    const pages = data.query?.pages;
    if (!pages) {
      throw new Error('No pages found in API response');
    }
    
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];
    
    if (page.missing) {
      throw new Error('Page not found');
    }
    
    const content = page.extract || '';
    
    if (content && content.length > 50) {
      cacheFullContent(term, content);
      return content;
    } else {
      throw new Error('Content too short or empty');
    }
    
  } catch (error) {
    console.error('Error fetching full wiki content:', error);
    return `Unable to retrieve full content: ${error.message}. Click "View on Wiki" to access the page directly.`;
  }
}

/**
 * Displays popup definition in the side panel overlay with full wiki content
 */
async function showPopupDefinition(data) {
  
  const results = document.getElementById('jdp-results');
  const definitionView = document.getElementById('jdp-definition-view');
  const defaultContent = document.getElementById('jdp-default-content');
  
  if (results) results.style.display = 'none';
  if (defaultContent) defaultContent.style.display = 'none';
  
  if (definitionView) {
    definitionView.style.display = 'block';
    definitionView.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button data-action="show-search-results" 
                  style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            ← Back to Search
          </button>
        </div>
        <h2 style="margin: 0; color: #0066cc; font-size: 20px; font-weight: 600; line-height: 1.3;">${data.term}</h2>
      </div>
      <div style="line-height: 1.4; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: #666;">
          <div style="width: 16px; height: 16px; border: 2px solid #0066cc; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span>Loading full content...</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button data-action="open-wiki" data-url="${data.sourceUrl}" 
                  style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            View on Wiki →
          </button>
          <button data-action="show-search-results" 
                  style="padding: 8px 16px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
            Back to Search
          </button>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    try {
      const fullContent = await fetchFullWikiContent(data.term, data.sourceUrl);
      
      // Check if we got meaningful content
      if (fullContent && fullContent !== 'No content available' && !fullContent.includes('Error loading')) {
        definitionView.innerHTML = `
          <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
              <button data-action="show-search-results" 
                      style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                ← Back to Search
              </button>
              <button data-action="open-wiki" data-url="${data.sourceUrl}" 
                      style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                View on Wiki →
              </button>
            </div>
            <h2 style="margin: 0; color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3;">${data.term}</h2>
          </div>
      <div style="line-height: 1.4; margin-bottom: 12px;">
        <div style="color: #333; font-size: 14px; margin-bottom: 12px; line-height: 1.4; max-width: 100%; word-wrap: break-word;">
              ${formatDefinitionContent(fullContent)}
            </div>
          </div>
        `;
      } else {
        definitionView.innerHTML = `
          <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
            <div style="display: flex; gap: 12px; margin-bottom: 12px;">
              <button data-action="show-search-results" 
                      style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                ← Back to Search
              </button>
              <button data-action="open-wiki" data-url="${data.sourceUrl}" 
                      style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                View on Wiki →
              </button>
            </div>
            <h2 style="margin: 0; color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3;">${data.term}</h2>
          </div>
      <div style="line-height: 1.4; margin-bottom: 12px;">
        <div style="color: #333; font-size: 14px; margin-bottom: 12px; line-height: 1.4; max-width: 100%; word-wrap: break-word;">
              ${formatDefinitionContent(data.definitionText || 'No detailed definition available.')}
            </div>
            <div style="color: #666; font-size: 12px; margin-bottom: 12px; padding: 6px; background: #f8f9fa; border-radius: 4px;">
              Note: Full wiki content could not be loaded. Click "View on Wiki" to see the complete definition.
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading full content:', error);
      definitionView.innerHTML = `
        <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e1e5e9;">
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <button data-action="show-search-results" 
                    style="padding: 6px 12px; background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              ← Back to Search
            </button>
            <button data-action="open-wiki" data-url="${data.sourceUrl}" 
                    style="padding: 6px 12px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
              View on Wiki →
            </button>
          </div>
          <h2 style="margin: 0; color: #0066cc; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 20px; font-weight: 600; line-height: 1.3;">${data.term}</h2>
        </div>
      <div style="line-height: 1.4; margin-bottom: 12px;">
        <div style="color: #333; font-size: 14px; margin-bottom: 12px; line-height: 1.4; max-width: 100%; word-wrap: break-word;">
            ${formatDefinitionContent(data.definitionText || 'No detailed definition available.')}
          </div>
          <div style="color: #dc3545; font-size: 12px; margin-bottom: 12px; padding: 6px; background: #f8d7da; border-radius: 4px;">
            Error loading full content: ${error.message}
          </div>
        </div>
      `;
    }
  }
}

// Functions are available through event delegation - no need for global assignment

// Event delegation for navigation buttons
document.addEventListener('click', function(event) {
  const target = event.target;
  
  // Handle "Read more" buttons in side panel
  if (target.matches('[data-action="show-full-definition"]')) {
    event.preventDefault();
    const index = parseInt(target.getAttribute('data-index'));
    if (!isNaN(index)) {
      showFullDefinition(index);
    }
    return;
  }
  
  // Handle "View on Wiki" buttons
  if (target.matches('[data-action="open-wiki"]')) {
    event.preventDefault();
    const url = target.getAttribute('data-url');
    if (url) {
      openInWiki(url);
    }
    return;
  }
  
  // Handle "Back to Results" buttons
  if (target.matches('[data-action="show-search-results"]')) {
    event.preventDefault();
    showSearchResults();
    return;
  }
  
  // Handle "Read more" links in floating popup
  if (target.matches('[data-action="open-side-panel-with-definition"]')) {
    event.preventDefault();
    const term = target.getAttribute('data-term');
    const definitionText = target.getAttribute('data-definition');
    const sourceUrl = target.getAttribute('data-source-url');
    if (term && definitionText && sourceUrl) {
      openSidePanelWithDefinition(term, definitionText, sourceUrl);
    }
    return;
  }
});

// Function to store request locally when webhook fails
function storeRequestLocally(requestData) {
  try {
    // Get existing stored requests
    const existingRequests = JSON.parse(localStorage.getItem('jdp_stored_requests') || '[]');
    
    // Add new request with timestamp
    const storedRequest = {
      ...requestData,
      stored_at: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    
    existingRequests.push(storedRequest);
    
    // Keep only last 50 requests to avoid storage bloat
    if (existingRequests.length > 50) {
      existingRequests.splice(0, existingRequests.length - 50);
    }
    
    // Store back to localStorage
    localStorage.setItem('jdp_stored_requests', JSON.stringify(existingRequests));
    
    // Request stored locally
    
    return true;
  } catch (error) {
    console.error('Failed to store request locally:', error);
    return false;
  }
}

// Function to get stored requests
function getStoredRequests() {
  try {
    return JSON.parse(localStorage.getItem('jdp_stored_requests') || '[]');
  } catch (error) {
    console.error('Failed to get stored requests:', error);
    return [];
  }
}

// Function to clear stored requests
function clearStoredRequests() {
  try {
    localStorage.removeItem('jdp_stored_requests');
    // Stored requests cleared
    return true;
  } catch (error) {
    console.error('Failed to clear stored requests:', error);
    return false;
  }
}

// Function to filter out non-English content from definitions
function filterEnglishContent(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Split text into lines for processing
  const lines = text.split('\n');
  const englishLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      continue;
    }
    
    // Check if line contains non-English characters (excluding common punctuation)
    // This regex matches lines that contain characters from non-Latin scripts
    const nonEnglishPattern = /[\u0080-\uFFFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF\uAB30-\uAB6F\uFB00-\uFB4F]/;
    
    // Skip lines with non-English characters
    if (nonEnglishPattern.test(trimmedLine)) {
        // Filtering out non-English line
      continue;
    }
    
    // Additional check for common non-English language indicators
    const nonEnglishIndicators = [
      /हिंदी में देखने के लिए क्लिक करें/i, // Hindi
      /click to view in hindi/i,
      /ver en español/i, // Spanish
      /voir en français/i, // French
      /auf deutsch/i, // German
      /中文/i, // Chinese
      /日本語/i, // Japanese
      /한국어/i, // Korean
      /русский/i, // Russian
      /العربية/i, // Arabic
      /עברית/i, // Hebrew
      /ελληνικά/i, // Greek
      /português/i, // Portuguese
      /italiano/i, // Italian
      /nederlands/i, // Dutch
      /svenska/i, // Swedish
      /norsk/i, // Norwegian
      /dansk/i, // Danish
      /suomi/i, // Finnish
      /polski/i, // Polish
      /čeština/i, // Czech
      /magyar/i, // Hungarian
      /română/i, // Romanian
      /български/i, // Bulgarian
      /hrvatski/i, // Croatian
      /slovenščina/i, // Slovenian
      /slovenský/i, // Slovak
      /eesti/i, // Estonian
      /latviešu/i, // Latvian
      /lietuvių/i, // Lithuanian
      /türkçe/i, // Turkish
      /فارسی/i, // Persian
      /اردو/i, // Urdu
      /বাংলা/i, // Bengali
      /தமிழ்/i, // Tamil
      /తెలుగు/i, // Telugu
      /मराठी/i, // Marathi
      /ગુજરાતી/i, // Gujarati
      /ಕನ್ನಡ/i, // Kannada
      /മലയാളം/i, // Malayalam
      /ଓଡ଼ିଆ/i, // Odia
      /ਪੰਜਾਬੀ/i, // Punjabi
      /অসমীয়া/i, // Assamese
      /नेपाली/i, // Nepali
      /සිංහල/i, // Sinhala
      /မြန်မာ/i, // Burmese
      /ខ្មែរ/i, // Khmer
      /ລາວ/i, // Lao
      /ไทย/i, // Thai
      /tiếng việt/i, // Vietnamese
      /bahasa indonesia/i, // Indonesian
      /bahasa melayu/i, // Malay
      /filipino/i, // Filipino
      /tagalog/i, // Tagalog
      /cebuano/i, // Cebuano
      /ilokano/i, // Ilocano
      /hiligaynon/i, // Hiligaynon
      /waray/i, // Waray
      /kapampangan/i, // Kapampangan
      /pangasinan/i, // Pangasinan
      /bikol/i, // Bikol
      /chavacano/i, // Chavacano
      /maguindanao/i, // Maguindanao
      /maranao/i, // Maranao
      /tausug/i, // Tausug
      /yakan/i, // Yakan
      /sama/i, // Sama
      /badjao/i, // Badjao
      /maguindanao/i, // Maguindanao
      /maranao/i, // Maranao
      /tausug/i, // Tausug
      /yakan/i, // Yakan
      /sama/i, // Sama
      /badjao/i, // Badjao
    ];
    
    let isNonEnglish = false;
    for (const pattern of nonEnglishIndicators) {
      if (pattern.test(trimmedLine)) {
        // Filtering out non-English indicator line
        isNonEnglish = true;
        break;
      }
    }
    
    if (!isNonEnglish) {
      englishLines.push(trimmedLine);
    }
  }
  
  return englishLines.join('\n').trim();
}

// Load configuration - wait for config.js to load
let CONFIG = null;
let configLoaded = false;

// Initialize CONFIG immediately with fallback
function initializeConfig() {
  if (window.EXTENSION_CONFIG) {
    CONFIG = window.EXTENSION_CONFIG;
    configLoaded = true;
    // Extension config loaded immediately
    return true;
  }
  
  // Set fallback config immediately
  CONFIG = {
    WEBHOOK: {
      ENABLED: true,
      ENDPOINT: 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec/webhook'
    },
    API_URL: "https://jdc-definitions.wikibase.wiki/w/api.php"
  };
  configLoaded = true;
  // Using fallback config
  return false;
}

// Server endpoints - will be configured from server config
let SERVER_BASE_URL = null;
let WEBHOOK_ENDPOINT = null;

// Alternative initialization approach - use a single initialization function
function initializeExtension() {
  try {
    // Initialize config first
    initializeConfig();
    
    // Initialize webhook endpoint with fallback
    initializeWebhookEndpointImmediate();
    
    // Extension initialized successfully
  } catch (error) {
    console.error("Extension initialization failed:", error);
    // Set fallback values
    WEBHOOK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec/webhook';
    SERVER_BASE_URL = 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec';
  }
}

// Initialize extension
initializeExtension();

// Function to wait for config to be available
function waitForConfig() {
  return new Promise((resolve) => {
    if (window.EXTENSION_CONFIG) {
      CONFIG = window.EXTENSION_CONFIG;
      configLoaded = true;
      // Extension config loaded successfully
      resolve(CONFIG);
      return;
    }
    
    // Wait for config to be available
    const checkConfig = () => {
      if (window.EXTENSION_CONFIG) {
        CONFIG = window.EXTENSION_CONFIG;
        configLoaded = true;
        // Extension config loaded successfully
        resolve(CONFIG);
      } else {
        setTimeout(checkConfig, 100);
      }
    };
    
    checkConfig();
  });
}

// Try to load updated config asynchronously
waitForConfig().then(config => {
  // Config updated from server, re-initializing webhook endpoint
  initializeWebhookEndpoint();
}).catch(error => {
  // Server config not available, using fallback config
});

// Initialize webhook endpoint immediately with fallback
function initializeWebhookEndpointImmediate() {
  if (CONFIG && CONFIG.WEBHOOK && CONFIG.WEBHOOK.ENDPOINT) {
    WEBHOOK_ENDPOINT = CONFIG.WEBHOOK.ENDPOINT;
    SERVER_BASE_URL = CONFIG.WEBHOOK.ENDPOINT.replace('/webhook', '');
    // Webhook endpoint initialized immediately
  } else {
    // Set fallback webhook endpoint immediately
    WEBHOOK_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec/webhook';
    SERVER_BASE_URL = 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec';
    // Using fallback webhook endpoint
  }
}

// Function to get webhook endpoint, waiting for config if needed
function getWebhookEndpoint() {
  if (configLoaded && CONFIG && CONFIG.WEBHOOK && CONFIG.WEBHOOK.ENDPOINT) {
    return CONFIG.WEBHOOK.ENDPOINT;
  }
  
  // Fallback endpoint
  return 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec/webhook';
}

// Initialize webhook endpoint from configuration
function initializeWebhookEndpoint() {
  if (CONFIG && CONFIG.WEBHOOK && CONFIG.WEBHOOK.ENDPOINT) {
    WEBHOOK_ENDPOINT = CONFIG.WEBHOOK.ENDPOINT;
    SERVER_BASE_URL = CONFIG.WEBHOOK.ENDPOINT.replace('/webhook', '');
    // Webhook endpoint initialized
  } else {
    console.warn("Webhook endpoint not configured in CONFIG object");
    // Fallback: disable webhook functionality
    WEBHOOK_ENDPOINT = null;
    SERVER_BASE_URL = null;
  }
}

// Initialize webhook endpoint when CONFIG is available
// This will be called after CONFIG is loaded
function initializeWhenConfigReady() {
  if (configLoaded && CONFIG) {
  initializeWebhookEndpoint();
  } else {
    // Wait a bit more for config to load
    setTimeout(initializeWhenConfigReady, 100);
  }
}

// Start initialization process
initializeWhenConfigReady();

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
    // Side panel status refreshed
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
    font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif;
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
      <h1 style="font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 18px; font-weight: 600; margin-bottom: 4px;">Justice Definitions Project</h1>
      <p style="font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 12px; opacity: 0.9;">Legal definitions at your fingertips</p>
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
      <input type="text" id="jdp-search-input" placeholder="Search for legal terms..." style="flex: 1; padding: 10px 12px; border: 2px solid #e1e5e9; border-radius: 6px; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 14px; transition: border-color 0.2s;">
      <button id="jdp-search-btn" style="padding: 10px 16px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">Search</button>
    </div>
  `;
  
  // Create results area
  const results = document.createElement('div');
  results.id = 'jdp-results';
  results.style.cssText = 'margin-top: 16px;';
  
  // Create definition view area
  const definitionView = document.createElement('div');
  definitionView.id = 'jdp-definition-view';
  definitionView.style.cssText = `
    display: none;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    padding: 16px;
    margin-top: 16px;
    overflow-y: auto;
    max-height: calc(100vh - 200px);
  `;
  
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
  content.appendChild(definitionView);
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

// Functions are already defined at the top of the file

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
  
  // Click outside to close - but only if not during a request
  // Note: This is handled by the main click listener below to avoid conflicts
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
  
  // Get API URL safely
  let apiUrl;
  if (CONFIG && CONFIG.API_URL) {
    apiUrl = CONFIG.API_URL;
  } else {
    apiUrl = "https://jdc-definitions.wikibase.wiki/w/api.php";
    // Using fallback API URL
  }
  
  const searchParams = "action=query&list=search&srprop=snippet&format=json&origin=*" + 
    `&srsearch=${encodeURIComponent(cleanQuery)}`;
  
  // Performing side panel search
  
  fetch(`${apiUrl}?${searchParams}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.query && data.query.search && data.query.search.length > 0) {
        // Show all search results
        let resultsHTML = '';
        
        // Store results for navigation
        window.currentSearchResults = data.query.search.map(item => {
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
          
          return {
            title: title,
            snippet: cleanSnippet,
            url: sourceUrl
          };
        });
        window.currentSearchQuery = query;
        
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
                <a href="#" data-action="show-full-definition" data-index="${index}" style="color: inherit; text-decoration: none;">${title}</a>
                <span style="font-size: 12px; color: #999;">(${index + 1})</span>
              </div>
              <div style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 12px;">${cleanSnippet}</div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <button data-action="show-full-definition" data-index="${index}" 
                        style="background: #0066cc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  Read more →
                </button>
                <span style="color: #ccc; font-size: 12px;">|</span>
                <button data-action="open-wiki" data-url="${sourceUrl}" 
                        style="background: #f8f9fa; color: #0066cc; border: 1px solid #e1e5e9; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  View on Wiki →
                </button>
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
              // Request Definition button clicked
              // Checking available functions
              
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
      console.error("Error details:", error.message);
      console.error("CONFIG object:", CONFIG);
      
      results.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="font-size: 16px; font-weight: 600; color: #856404; margin-bottom: 8px;">Search Error</div>
          <div style="color: #856404; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">Failed to search for "${query}". Please try again.</div>
          <div style="color: #856404; font-size: 12px; line-height: 1.4;">Error: ${error.message}</div>
          <div style="margin-top: 12px;">
            <button onclick="performSidePanelSearch('${query}')" 
                    style="background: #ffc107; color: #856404; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              Try Again
            </button>
          </div>
        </div>
      `;
    });
}

// Request definition from side panel
function requestDefinitionFromSidePanel(query) {
  try {
    // Set context to side panel
    window.currentRequestContext = 'sidepanel';
    
    // Check if extension context is still valid
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      console.error("Extension context invalidated - cannot proceed with webhook request");
      updateSidePanelWithError(query, "Extension context invalidated");
      return;
    }
    
    // Get webhook endpoint safely
    let webhookEndpoint;
    try {
      webhookEndpoint = getWebhookEndpoint();
  } catch (error) {
      console.error("Error getting webhook endpoint:", error);
      webhookEndpoint = 'https://script.google.com/macros/s/AKfycbzG-tIWYSfIV6DQKICOFiQ2TUl_dfBabK2Hxet_u9mdWNcB_FcDduPAx9oVzibxRZgO/exec/webhook';
  }
  
    if (!webhookEndpoint) {
    console.error("Webhook endpoint not configured - cannot submit request");
      updateSidePanelWithError(query, "Webhook endpoint not configured");
    return;
  }
  
  // Request definition from side panel
    // Webhook endpoint configured
  
  // Get current page URL
  const pageUrl = window.location.href;
  const nowIso = new Date().toISOString();
  
  // Prepare request data (access key is now handled server-side)
  const requestData = { 
    term: query, 
    page_url: pageUrl, 
    timestamp: nowIso
  };
  
  // Sending webhook request from side panel
    // Webhook endpoint configured
  
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
  
    // Use background script to avoid CORS issues
    // Sending webhook request via background script
  
  try {
      // Send message to background script to handle the webhook request
      chrome.runtime.sendMessage({
        type: "SEND_WEBHOOK_REQUEST",
        data: requestData
      }, (response) => {
        // Background script response received
        
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          updateSidePanelWithError(query, "Extension communication error: " + chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.success) {
          // Webhook request successful via background script
          // Only show popup for non-side panel requests
          if (!isSidePanelRequest()) {
            showSuccessPopup(`"${query}" has been added to Request Definitions queue for experts to add to Justice Definitions Project.`);
          }
          // Update side panel with success message
          updateSidePanelWithSuccess(query);
          } else {
          console.error("Webhook request failed via background script:", response);
          // Only show popup for non-side panel requests
          if (!isSidePanelRequest()) {
            showErrorPopup(response?.error || "Request failed via background script");
          }
          // Update side panel with error message
          updateSidePanelWithError(query, response?.error || "Request failed");
        }
        
        // Clear request context after completion
        clearRequestContext();
      });
    } catch (error) {
      console.error("Error sending message to background script:", error);
      // Only show popup for non-side panel requests
      if (!isSidePanelRequest()) {
        showErrorPopup("Failed to communicate with extension background script");
      }
      // Update side panel with error message
      updateSidePanelWithError(query, "Failed to communicate with extension background script");
      
      // Clear request context after completion
      clearRequestContext();
    }
  } catch (error) {
    console.error("Error in requestDefinitionFromSidePanel:", error);
    updateSidePanelWithError(query, "An unexpected error occurred: " + error.message);
    clearRequestContext();
  }
}

// Make requestDefinitionFromSidePanel globally accessible
window.requestDefinitionFromSidePanel = requestDefinitionFromSidePanel;

// Also expose it on the document for better compatibility
document.requestDefinitionFromSidePanel = requestDefinitionFromSidePanel;

// Make side panel functions globally accessible
window.updateSidePanelWithSuccess = updateSidePanelWithSuccess;
window.updateSidePanelWithError = updateSidePanelWithError;
window.showSidePanelHome = showSidePanelHome;

// Add a fallback function that can be called from the side panel
window.handleDefinitionRequest = function(query) {
  // Handle definition request
  if (typeof requestDefinitionFromSidePanel === 'function') {
    requestDefinitionFromSidePanel(query);
  } else {
    console.error("requestDefinitionFromSidePanel function not available");
  }
};

// Test function to verify webhook URL accessibility
function testWebhookURL() {
  // Testing webhook URL accessibility
  
  // Test with a simple GET request first
  fetch(CONFIG.WEBHOOK_URL, {
    method: 'GET',
    mode: 'no-cors'
  })
  .then((response) => {
    // GET test response received
  })
  .catch((error) => {
    console.error("GET test failed:", error);
  });
  
  // Test with POST request
  const testFormData = new FormData();
  testFormData.append('term', 'test_term');
  testFormData.append('page_url', 'https://test.com');
  testFormData.append('timestamp', new Date().toISOString());
  // Access key is now server-side only - removed for security
  
  fetch(CONFIG.WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: testFormData
  })
  .then((response) => {
    // POST test response received
  })
  .catch((error) => {
    console.error("POST test failed:", error);
  });
}

// Make test function globally accessible
window.testWebhookURL = testWebhookURL;

// Make stored request functions globally accessible for debugging
window.getStoredRequests = getStoredRequests;
window.clearStoredRequests = clearStoredRequests;
window.storeRequestLocally = storeRequestLocally;

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
    font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif;
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
            let finalText = extractText || cleanSnippet;
            
            // Cache the full content for "Read more" functionality
            if (extractText && extractText.length > 50) {
              cacheFullContent(title, extractText);
            }
            
            // Filter out non-English content
            finalText = filterEnglishContent(finalText);
            
            showDefinitionResult(title, finalText, query);
          })
          .catch(error => {
            console.error("Extract fetch failed:", error);
            // Fall back to snippet even if it's short, but still filter for English
            const filteredSnippet = filterEnglishContent(cleanSnippet);
            showDefinitionResult(title, filteredSnippet, query);
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
    // Processing definition content
    const lines = definition.split('\n');
    const filteredLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip metadata lines
      if (trimmedLine.match(/^Content on this page has been reviewed/i) ||
          trimmedLine.match(/^Reviewed by:/i) ||
          trimmedLine.match(/^Reviewed !/i) ||
          trimmedLine.match(/^Last updated:/i) ||
          trimmedLine === '') {
        continue;
      }
      
      filteredLines.push(trimmedLine);
    }
    
    const cleanDefinition = filteredLines.join('\n').trim();
    
    // Filtered lines processed
    
    // Now find the first substantial content line
    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];
      // Processing line
      
      // Skip only obvious headers and very short lines
      if (line.length < 10 || 
          line.match(/^(Table of contents|Contents|Navigation|References|See also)$/i) ||
          (line.match(/^[A-Z][a-z]+$/) && line.length < 20)) {
        // Skipping short/header line
        continue;
      }
      
      // Universal pattern: Skip any "What is..." question/heading and look for the actual answer
      if (line.match(/^What is.*$/i)) {
        // Found "What is..." line, looking for next substantial line
        // Look for the next substantial line after the question/heading
        for (let j = i + 1; j < filteredLines.length; j++) {
          const nextLine = filteredLines[j];
          // Checking next line
          if (nextLine.length >= 15 && 
              !nextLine.match(/^(Table of contents|Contents|Navigation|References|See also)$/i) &&
              !nextLine.match(/^What is.*$/i) &&
              !nextLine.match(/^Reviewed/i)) {
            // Found the actual definition after the question/heading
            // Found definition line
            const maxChars = 200;
            displayText = nextLine.length > maxChars ? 
              nextLine.substring(0, maxChars) + "..." : nextLine;
            break;
          }
        }
        if (displayText) {
          // Using processed definition
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
        <a href="#" data-action="open-side-panel-with-definition" 
           data-term="${title}" 
           data-definition="${displayText}" 
           data-source-url="https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}"
           style="color: #0066cc; text-decoration: none; font-size: 12px;">
          Read more →
        </a>
        <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
          <a href="#" data-action="open-side-panel-with-definition" 
             data-term="${title}" 
             data-definition="${displayText}" 
             data-source-url="https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}"
             style="color: #0066cc; text-decoration: none; font-size: 12px;">
            Read more →
          </a>
          <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
      <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
  
  // Get webhook endpoint
  const webhookEndpoint = getWebhookEndpoint();
  if (!webhookEndpoint) {
    console.error("Webhook endpoint not configured - cannot submit request");
    floatingPopup.innerHTML = `
      <div style="color: #856404; margin-bottom: 8px;">
        <strong>⚠ Webhook Not Configured</strong>
      </div>
      <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
        Request submission is not available. The webhook endpoint needs to be configured.
      </div>
      <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
        <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
  
  // Sending webhook request via background script
  
  // Show loading state in side panel
  const results = document.getElementById('jdp-results');
  if (results) {
    results.innerHTML = `
      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 16px; text-align: center;">
        <div style="font-size: 24px; color: #856404; margin-bottom: 12px;">⏳</div>
        <div style="font-size: 18px; font-weight: 600; color: #856404; margin-bottom: 8px;">Submitting Request</div>
        <div style="color: #856404; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
          Adding "<strong>${query}</strong>" to the Definition Requests queue...
        </div>
        <div style="color: #856404; font-size: 12px; line-height: 1.4;">
          Please wait while we process your request.
        </div>
      </div>
    `;
  }
  
  // Use background script to avoid CORS issues
  chrome.runtime.sendMessage({
    type: "SEND_WEBHOOK_REQUEST",
    data: requestData
  }, (response) => {
    // Background script response received
    
    if (chrome.runtime.lastError) {
      console.error("Chrome runtime error:", chrome.runtime.lastError);
      showErrorPopup("Extension communication error: " + chrome.runtime.lastError.message);
      return;
    }
    
    if (response && response.success) {
      // Webhook request successful via background script
      // Only show popup for non-side panel requests
      if (!isSidePanelRequest()) {
        showSuccessPopup(`"${query}" has been added to Request Definitions queue for experts to add to Justice Definitions Project.`);
      }
      // Update side panel with success message
      updateSidePanelWithSuccess(query);
      // Clear request context
      clearRequestContext();
    } else {
      console.error("Webhook request failed via background script:", response);
      // Only show popup for non-side panel requests
      if (!isSidePanelRequest()) {
        showErrorPopup(response?.error || "Request failed via background script");
      }
      // Update side panel with error message
      updateSidePanelWithError(query, response?.error || "Request failed");
      // Clear request context
      clearRequestContext();
    }
  });
  
  return; // Exit early since we're using async message passing
}

// Clear request context after completion
function clearRequestContext() {
  setTimeout(() => {
    window.currentRequestContext = null;
    // Request context cleared
  }, 3000); // Increased delay to 3 seconds to allow side panel to stay open longer
}

// Popup functions for user feedback
function showSuccessPopup(message) {
  // Showing success popup
  
  // Check if popup exists and is in DOM
  if (!floatingPopup || !document.body.contains(floatingPopup)) {
    // Popup not available, creating new one for success message
    createSuccessPopup(message);
    return;
  }
  
  // Update existing popup with success message
  floatingPopup.innerHTML = `
    <div style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="font-size: 16px; font-weight: 600; color: #28a745; margin-bottom: 8px;">✓ Success</div>
      <div style="color: #155724; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">${message}</div>
      <div style="color: #155724; font-size: 12px; line-height: 1.4;">Your term has been added to the Definition Requests queue for the Justice Definitions Project team.</div>
    </div>
  `;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (floatingPopup && document.body.contains(floatingPopup)) {
      floatingPopup.remove();
    }
  }, 5000);
}

function showErrorPopup(message) {
  // Showing error popup
  
  // Check if popup exists and is in DOM
  if (!floatingPopup || !document.body.contains(floatingPopup)) {
    // Popup not available, creating new one for error message
    createErrorPopup(message);
    return;
  }
  
  // Update existing popup with error message
  floatingPopup.innerHTML = `
    <div style="background: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="font-size: 16px; font-weight: 600; color: #dc3545; margin-bottom: 8px;">▲ Request Failed</div>
      <div style="color: #721c24; font-size: 14px; line-height: 1.5; margin-bottom: 8px;">${message}</div>
      <div style="color: #721c24; font-size: 12px; line-height: 1.4;">Please try again or check your internet connection.</div>
    </div>
  `;
  
  // Auto-hide after 8 seconds
  setTimeout(() => {
    if (floatingPopup && document.body.contains(floatingPopup)) {
      floatingPopup.remove();
    }
  }, 8000);
}

// Helper function to detect if request is from side panel
function isSidePanelRequest() {
  // Only check the explicit request context - this is the most reliable indicator
  if (window.currentRequestContext === 'sidepanel') {
    // Side panel request context detected
    return true;
  }
  
  // Not a side panel request
  return false;
}

// Side panel feedback functions
function updateSidePanelWithSuccess(query) {
  // Updating side panel with success
  
  // Only update if this is actually a side panel request
  if (window.currentRequestContext !== 'sidepanel') {
    // Not a side panel request, skipping side panel update
    return;
  }
  
  // Try to find the side panel overlay
  let sidePanelOverlay = document.getElementById('jdp-side-panel-overlay');
  
  // If overlay not found, try to recreate it for side panel requests
  if (!sidePanelOverlay || !document.body.contains(sidePanelOverlay)) {
    // Side panel overlay not found, attempting to recreate for side panel request
    createSidePanelOverlay();
    sidePanelOverlay = document.getElementById('jdp-side-panel-overlay');
    
    if (!sidePanelOverlay) {
      // Failed to recreate side panel overlay
      return;
    }
  }
  
  // Ensure side panel is visible and stays visible
  sidePanelOverlay.style.display = 'block';
  sidePanelOverlay.style.visibility = 'visible';
  sidePanelOverlay.style.zIndex = '10000';
  
  const results = document.getElementById('jdp-results');
  if (results && document.body.contains(results)) {
    try {
      results.innerHTML = `
        <div style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 8px; padding: 20px; margin-bottom: 16px; text-align: center;">
          <div style="font-size: 24px; color: #28a745; margin-bottom: 12px;">✓</div>
          <div style="font-size: 18px; font-weight: 600; color: #28a745; margin-bottom: 8px;">Request Submitted Successfully</div>
          <div style="color: #155724; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
            Your request for "<strong>${query}</strong>" has been added to the Definition Requests queue for the Justice Definitions Project team.
          </div>
          <div style="color: #155724; font-size: 12px; line-height: 1.4; margin-bottom: 20px;">
            The term will be reviewed by experts and added to the database if approved.
          </div>
        </div>
      `;
      
      // Side panel success message updated successfully
    } catch (error) {
      console.error("Error updating side panel with success message:", error);
    }
          } else {
    // Results element not found or not in DOM, cannot update success message
  }
}

function updateSidePanelWithError(query, errorMessage) {
  // Updating side panel with error
  
  // Only update if this is actually a side panel request
  if (window.currentRequestContext !== 'sidepanel') {
    // Not a side panel request, skipping side panel update
    return;
  }
  
  // Try to find the side panel overlay
  let sidePanelOverlay = document.getElementById('jdp-side-panel-overlay');
  
  // If overlay not found, try to recreate it for side panel requests
  if (!sidePanelOverlay || !document.body.contains(sidePanelOverlay)) {
    // Side panel overlay not found, attempting to recreate for side panel request
    createSidePanelOverlay();
    sidePanelOverlay = document.getElementById('jdp-side-panel-overlay');
    
    if (!sidePanelOverlay) {
      // Failed to recreate side panel overlay
      return;
    }
  }
  
  // Ensure side panel is visible and stays visible
  sidePanelOverlay.style.display = 'block';
  sidePanelOverlay.style.visibility = 'visible';
  sidePanelOverlay.style.zIndex = '10000';
  
  const results = document.getElementById('jdp-results');
  if (results && document.body.contains(results)) {
    try {
      results.innerHTML = `
        <div style="background: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 20px; margin-bottom: 16px; text-align: center;">
          <div style="font-size: 24px; color: #dc3545; margin-bottom: 12px;">▲</div>
          <div style="font-size: 18px; font-weight: 600; color: #dc3545; margin-bottom: 8px;">Request Failed</div>
          <div style="color: #721c24; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
            Failed to submit request for "<strong>${query}</strong>".
          </div>
          <div style="color: #721c24; font-size: 12px; line-height: 1.4; margin-bottom: 20px; background: #f5c6cb; padding: 8px; border-radius: 4px;">
            Error: ${errorMessage}
          </div>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button onclick="performSidePanelSearch('${query}')" 
                    style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              Try Again
            </button>
          </div>
        </div>
      `;
      
      // Side panel error message updated successfully
    } catch (error) {
      console.error("Error updating side panel with error message:", error);
    }
    } else {
    // Results element not found or not in DOM, cannot update error message
  }
}

function showSidePanelHome() {
  // Showing side panel home
  
  const results = document.getElementById('jdp-results');
  const defaultContent = document.getElementById('jdp-default-content');
  
  if (results) {
    results.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #666;">
        <div style="font-size: 16px; margin-bottom: 12px;">Welcome to Justice Definitions Project</div>
        <div style="font-size: 14px; line-height: 1.5;">
          Search for legal definitions or request new terms to be added to our database.
        </div>
      </div>
    `;
  }
  
  if (defaultContent) {
    defaultContent.style.display = 'block';
  }
}

function showRequestSuccess(query) {
  // Check if popup exists and is in DOM
  if (!floatingPopup || !document.body.contains(floatingPopup)) {
    // Popup not available, creating new one for success message
    // Create a new popup for the success message
    createSuccessPopup(query);
    return;
  }
  
  // Showing success message
  
  // Simple success message as a label string
  floatingPopup.innerHTML = `
    <div style="margin-bottom: 8px;">
      <strong style="color: #28a745;">✓ Request Submitted Successfully</strong>
    </div>
    <div style="margin-bottom: 8px; color: #666; font-size: 12px;">
      Your request for "<strong>${query}</strong>" has been sent to the Justice Definitions Project team.
    </div>
    <div style="display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
      <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
    font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif;
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
      <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
    // Popup not available, creating new one for error message
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
      <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
    font-family: 'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', Arial, sans-serif;
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
      <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
      <button onclick="document.getElementById('jdp-floating-popup')?.remove()" 
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
      // Click outside popup detected, closing popup
      floatingPopup.remove();
      floatingPopup = null;
    }
    
    // Handle side panel overlay click outside
    if (sidePanelOverlay && !sidePanelOverlay.contains(event.target) && window.currentRequestContext !== 'sidepanel') {
      closeSidePanelOverlay();
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
    
      // Only create side panel if explicitly requested
      if (message.openSidePanel === true) {
    createSidePanelOverlay();
    
    // Perform search in the overlay
    setTimeout(() => {
      performSidePanelSearch(message.query);
    }, 100);
      }
    
    sendResponse({ success: true });
  } else if (message.type === "OPEN_SIDE_PANEL") {
    // Only create side panel when explicitly requested
    createSidePanelOverlay();
    sendResponse({ success: true });
  } else if (message.type === "OPEN_SIDE_PANEL_WITH_DEFINITION") {
    // Open side panel with specific definition from popup
    // Set context to side panel to prevent auto-close
    window.currentRequestContext = 'sidepanel';
    
    createSidePanelOverlay();
    
    // Show the popup definition directly in the overlay
    setTimeout(() => {
      showPopupDefinition({
        term: message.term,
        definitionText: message.definitionText,
        sourceUrl: message.sourceUrl
      });
      
      // Clear context after side panel is fully loaded (longer delay for popup definitions)
      setTimeout(() => {
        window.currentRequestContext = null;
      }, 5000); // 5 seconds to allow user to interact with the definition
    }, 100);
    
    sendResponse({ success: true });
  } else if (message.type === "SIDE_PANEL_CLOSED") {
    // Side panel was closed - refresh status
    // Side panel closed notification received
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
