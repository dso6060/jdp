// Background script for Justice Definitions Project Extension
// Handles side panel opening and extension icon clicks

// Track side panel status
let sidePanelStatus = new Map(); // windowId -> isOpen

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel
  chrome.sidePanel.open({ windowId: tab.windowId });
  sidePanelStatus.set(tab.windowId, true);
});

// Listen for messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL") {
    // Open side panel when requested from content script
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
    sidePanelStatus.set(sender.tab.windowId, true);
    sendResponse({ success: true });
  } else if (message.type === "CLOSE_SIDE_PANEL") {
    // Close side panel when requested from side panel
    const windowId = message.windowId || sender.tab?.windowId;
    if (windowId) {
      chrome.sidePanel.close({ windowId: windowId });
      sidePanelStatus.set(windowId, false);
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
    if (windowId && sidePanelStatus.get(windowId)) {
      chrome.sidePanel.close({ windowId: windowId });
      sidePanelStatus.set(windowId, false);
    }
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open
});

// Handle side panel setup
chrome.runtime.onInstalled.addListener(() => {
  console.log("Justice Definitions Project extension installed");
  
  // Note: Extension pinning is handled by the user manually in Chrome
  // chrome.action.setPinned is not available in Manifest V3
});
