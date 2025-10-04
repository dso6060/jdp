// get the currently active tab in the current window
// and then invoke the callback function gotTabs.
let query = { active: true, currentWindow: true };
chrome.tabs.query(query, onTabsReceived);

// function to check current url and eliminate offline urls.
function safeUrl(url) {
  return url.startsWith("https://") || url.startsWith("http://");
}

// callback function
function onTabsReceived(tabs) {
  // prevent offline urls to run the extension by throwing error.
  if (!safeUrl(tabs[0].url)) {
    document.getElementById("error").innerHTML = "Oh no!";
    document.getElementById("definition").innerHTML = "Unsupported Page.";
    return;
  }

  let msg = {
    txt: "hello from popup",
  };

  // send message to the content script
  chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {
    if (!response) {
      document.getElementById("status").innerHTML =
        "Refresh the page and try again.";
    } else if (response.selectedWord === "_TextNotSelected_") {
      document.getElementById("status").innerHTML = "Welcome! Please select a word to find its definition.";
    } else {
      let selectedWord = response.selectedWord;
      selectedWord = selectedWord.replace(/[^a-zA-Z ]/g, "");
      searchJDPWiki(selectedWord);
    }
  });
}

// Load configuration from config.js
// CONFIG is already declared globally in config.js, so we just use it
// No fallback needed - config.js is loaded before this script

// Server endpoints - will be configured from server config
let SERVER_BASE_URL = null;
let WEBHOOK_ENDPOINT = null;
let webhookUrl = null;

// Initialize webhook URL from configuration
function initializeWebhookUrl() {
  if (CONFIG && CONFIG.WEBHOOK && CONFIG.WEBHOOK.ENDPOINT) {
    WEBHOOK_ENDPOINT = CONFIG.WEBHOOK.ENDPOINT;
    SERVER_BASE_URL = CONFIG.WEBHOOK.ENDPOINT.replace('/webhook', '');
    webhookUrl = WEBHOOK_ENDPOINT;
    console.log("Webhook URL initialized:", webhookUrl);
  } else {
    console.warn("Webhook endpoint not configured in CONFIG object");
    webhookUrl = null;
  }
}

// Initialize webhook URL when CONFIG is available
if (CONFIG && CONFIG.WEBHOOK) {
  initializeWebhookUrl();
}

// Force initialization with current CONFIG
initializeWebhookUrl();

// Still allow custom webhook override from storage
chrome.storage && chrome.storage.sync.get(["webhookUrl"], (data) => {
  if (data.webhookUrl && data.webhookUrl.trim() !== "") {
    webhookUrl = data.webhookUrl;
  }
});

let definitionText,
  term,
  sourceUrl;


// function to fetch and show definition on the popup from Justice Definitions Project
async function searchJDPWiki(query) {
  try {
    const api = CONFIG.API_URL || "https://jdc-definitions.wikibase.wiki/w/api.php";
    // First: search for the page
    const searchParams =
      "action=query&list=search&srprop=snippet&format=json&origin=*" +
      `&srsearch=${encodeURIComponent(query)}`;
    const searchResp = await fetch(`${api}?${searchParams}`);
    const searchData = await searchResp.json();

    if (searchData && searchData.query && searchData.query.search && searchData.query.search.length > 0) {
      const first = searchData.query.search[0];
      const title = first.title;
      const pageid = first.pageid;

      // Second: fetch a plain-text intro extract for that page id (get more content for better sentences)
      const extractParams =
        `action=query&prop=extracts&explaintext=1&exintro=1&exsectionformat=plain&format=json&origin=*&pageids=${encodeURIComponent(pageid)}`;
      const extractResp = await fetch(`${api}?${extractParams}`);
      const extractData = await extractResp.json();

      let extractText = "";
      if (extractData && extractData.query && extractData.query.pages && extractData.query.pages[pageid]) {
        extractText = (extractData.query.pages[pageid].extract || "").trim();
      }

      // Fallback: clean up wiki markup from the search snippet if extract is empty
      if (!extractText) {
        const snippetHtml = first.snippet || "";
        const tmp = document.createElement("div");
        tmp.innerHTML = snippetHtml;
        const snippetText = (tmp.textContent || tmp.innerText || "");
        extractText = snippetText
          .replace(/\[\[[^\]]+\]\]/g, "")       // remove [[...]] wiki links/categories
          .replace(/\{\{[^}]+\}\}/g, "")          // remove {{...}} templates
          .replace(/==+[^=]*==+/g, "")               // remove == headings ==
          .replace(/\s+/g, " ")
          .trim();
      }

      term = title;
      sourceUrl = `https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      definitionText = extractText;

      setValuesFromJDP();
    } else {
      showNoResultUI(query);
    }
  } catch (e) {
    document.getElementById("error").innerHTML = "⚠  Lookup failed";
    document.getElementById("definition").innerHTML = "";
    showNoResultUI(query);
  }
}

function setValuesFromJDP() {
  let displayText = getOptimalDisplayText(definitionText);
  
  // Make the term heading clickable to open side panel
  document.getElementById(
    "word"
  ).innerHTML = `<a href="#" class="term-link" onclick="openSidePanelWithDefinition('${term}', '${definitionText.replace(/'/g, "\\'")}', '${sourceUrl}'); return false;">${term}</a> <a href="#" class="searchanchor" onclick="openSidePanelWithDefinition('${term}', '${definitionText.replace(/'/g, "\\'")}', '${sourceUrl}'); return false;">Read more →</a>`;
  document.getElementById("status").innerHTML = "";
  document.getElementById("definition").innerHTML = displayText;
}

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

function openSidePanelWithDefinition(term, definitionText, sourceUrl) {
  // Get the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      // Send message to content script to open side panel with the definition
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'OPEN_SIDE_PANEL_WITH_DEFINITION',
        term: term,
        definitionText: definitionText,
        sourceUrl: sourceUrl
      });
    }
  });
}

function showNoResultUI(query) {
  document.getElementById("error").innerHTML = "No result found";
  document.getElementById("definition").innerHTML = "";
  const btn = document.getElementById("requestBtn");
  if (btn && webhookUrl) {
    btn.classList.remove("hidden");
    btn.onclick = async function () {
      if (!webhookUrl) {
        document.getElementById("status").innerHTML = "Webhook not configured. Cannot submit request.";
        return;
      }
      
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const pageUrl = activeTabs && activeTabs[0] ? activeTabs[0].url : "";
      const nowIso = new Date().toISOString();
      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: query, page_url: pageUrl, timestamp: nowIso })
        });
        
        if (resp.ok) {
          const responseData = await resp.json();
          if (responseData.success) {
            document.getElementById("status").innerHTML = "Request submitted.";
          } else {
            document.getElementById("status").innerHTML = "Could not submit request.";
          }
        } else {
          document.getElementById("status").innerHTML = "Could not submit request.";
        }
      } catch (err) {
        document.getElementById("status").innerHTML = "Network error submitting request.";
      }
    };
  }
}
