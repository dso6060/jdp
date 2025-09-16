// Background script for Justice Definitions Project Extension
// Handles side panel opening and extension icon clicks

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SIDE_PANEL") {
    // Open side panel when requested from content script
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open
});

// Handle side panel setup
chrome.runtime.onInstalled.addListener(() => {
  console.log("Justice Definitions Project extension installed");
});
