<p align="center">
  <img src="assets/icon128.png" alt="Justice Definitions Project" width="64" height="64">
  <br>
  <strong>JUSTICE DEFINITIONS PROJECT</strong>
</p>

---

A Chrome extension that provides instant access to legal definitions from the [Justice Definitions Project](https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project) - an expert-curated knowledge base for legal terminology. Built for researchers, students, and practitioners.

## Installation

1. Clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select project folder
5. Extension appears in toolbar

## Usage

### Right-Click Lookup (Primary Method)
1. **Select text** on any webpage
2. **Right-click** to trigger instant definition lookup
3. **Floating popup** appears with definition preview
4. **Request missing definitions** or close popup

### Side Panel (Extended Browsing)
1. **Click extension icon** to open side panel (25% width)
2. **Browse Justice Definitions Project** main page by default
3. **Search for terms** using the search bar
4. **Click results** to view full definitions in the panel
5. **Click outside** to close the panel

### Smart Features
- **Context-aware**: Automatically switches between popup and panel modes
- **Works on any webpage** without interference
- **Responsive design** adapts to different screen sizes

## Features

### Core Features
- ✅ **Right-click definition lookup** - Instant floating popups
- ✅ **Side panel interface** - 25% width panel with embedded MediaWiki
- ✅ **Default MediaWiki content** - Justice Definitions Project main page
- ✅ **Click-outside closure** - Intuitive panel closing
- ✅ **Embedded definition viewing** - Full wiki pages in side panel
- ✅ **Smart context detection** - Auto-switches between popup and panel
- ✅ **Two-way communication** - Pull definitions and submit requests
- ✅ **Responsive design** - Adapts to content and screen size

### Request System
- **📥 Pull Data**: Queries Justice Definitions Project MediaWiki API for definitions
- **📤 Send Requests**: Submit missing term requests via webhook integration
- **📊 Tracking**: Requests logged to [Google Sheet](https://docs.google.com/spreadsheets/d/15mdKhoJuhdzpeSCL0STRLFI5umMaDF5CCf0D5qiWbOY/edit?usp=sharing) for prototype iteration
- **🔬 Prototype**: Google Sheet serves as data collection system for future backend development

## About

Built on the [Justice Definitions Project](https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project) - an expert-curated knowledge base for legal terminology featuring:
- Expert review workflows and transparent sourcing
- Community contributions from students, researchers, and legal practitioners
- Versioned changes and public discussion

**Contributing:** Open an issue if you're interested in curation or collaboration.

## Technical Details

- **Manifest V3** - Latest Chrome extension standard
- **Service Worker** - Efficient background processing
- **Content Scripts** - Seamless webpage integration
- **Storage API** - Persistent user preferences
- **Cross-origin Requests** - Secure API communication

## Status

- ✅ **Version 0.6.0** - Latest stable release
- ⚠️ **Development version** - Not published to Chrome Web Store
- 🔓 **Open Source** - Available for reference and contributions

### License

[MIT](LICENSE)


 
