// Background script for Justice Definitions Project Extension
// Handles side panel opening and extension icon clicks

// Track side panel status
let sidePanelStatus = new Map(); // windowId -> isOpen

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
      chrome.windows.getCurrent((window) => {
        console.log("Current window:", window);
        if (window && sidePanelStatus.get(window.id)) {
          console.log("Closing side panel for current window:", window.id);
          chrome.sidePanel.close({ windowId: window.id });
          sidePanelStatus.set(window.id, false);
        } else {
          console.log("No side panel found for current window or window not found");
        }
      });
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
  } else if (message.type === "SIDE_PANEL_CLOSED") {
    // Side panel is being closed - update status
    const windowId = message.windowId || sender.tab?.windowId;
    if (windowId) {
      console.log("Side panel closed for window:", windowId);
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
