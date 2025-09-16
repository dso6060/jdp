// Configuration file for Justice Definitions Project Extension
// This file contains all configurable settings that can be modified without touching core code

const CONFIG = {
  // External Resource URLs (ALL-CAPS for easy identification by developers)
  WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbyC9aQdgLCS3Kj2TBi5MO5ybMUA5I7ytl_8PqQcC10HVgWGIU62VH7YKm_IwNwttVZI/exec",
  API_URL: "https://jdc-definitions.wikibase.wiki/w/api.php",
  
  // Webhook Configuration
  WEBHOOK: {
    // Enable/disable webhook functionality
    ENABLED: true,
    
    // Timeout for webhook requests (in milliseconds)
    TIMEOUT: 10000
  },
  
  // API Configuration
  API: {
    // Request timeout (in milliseconds)
    TIMEOUT: 15000
  },
  
  // Display Configuration
  DISPLAY: {
    // Maximum characters for definition preview
    MAX_CHARS: 140,
    
    // Extended character limit for incomplete sentences
    EXTENDED_CHARS: 200,
    
    // Maximum characters for very short content
    MAX_EXTENDED_CHARS: 250,
    
    // Minimum word count to trigger extended search
    MIN_WORD_COUNT: 4
  },
  
  // Extension Metadata
  EXTENSION: {
    NAME: "Justice Definitions Project",
    VERSION: "0.6.0",
    DESCRIPTION: "Make legal language accessible by connecting webpage selections to the Justice Definitions Project"
  }
};

// Make config available globally for extension
window.EXTENSION_CONFIG = CONFIG;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
