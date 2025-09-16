<p align="center">
  <img src="assets/icon128.png" alt="Justice Definitions Project" width="64" height="64">
  <br>
  <strong>JUSTICE DEFINITIONS PROJECT</strong>
</p>

---

<p>
This project aims to make legal language accessible by connecting any webpage selection to a reliable community‑maintained <a href="https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project">Justice Definitions Project</a>. Built for researchers, students, and practitioners, the extension provides instant access to legal definitions through multiple interaction methods, sourced from the Justice Definitions Project (MediaWiki), curated and reviewed by experts. The goal is to provide credible, up‑to‑date explanations grounded in Indian legal context while remaining easy to consult during everyday reading.
</p>
  
<br>


### Installation 🧩

**Chrome Extension (Development Version):**
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select this project folder
5. The extension will appear in your Chrome toolbar

### How It Works

The extension provides multiple ways to access legal definitions:

#### **Right-Click Lookup (Primary Method)**
- **Right-click** on any selected text to trigger instant definition lookup
- **Floating Popup**: A clean, expandable popup appears with definition preview
- **Smart Positioning**: Popup automatically positions itself near your selection
- **Quick Actions**: Request missing definitions or close popup with one click

#### **Side Panel (Extended Browsing)**
- **Click Extension Icon**: Opens a dedicated side panel (25% of window width)
- **Persistent Interface**: Keep the panel open while browsing multiple pages
- **Search Bar**: Manual search for legal terms
- **Wiki Integration**: Direct access to Justice Definitions Project pages
- **Auto-Refresh**: Panel updates when new text is selected

#### **Smart Features**
- **Context-Aware**: Automatically detects if side panel is open vs. closed
- **Seamless Integration**: Works on any webpage without interference
- **Responsive Design**: Adapts to different screen sizes and content lengths

### Two-Way Communication System

This project implements a **two-way communication system** between the browser extension and the Justice Definitions Project:

**📥 Pull Data:** Extension queries the Justice Definitions Project MediaWiki API to retrieve and display legal definitions from the curated knowledge base.

**📤 Send Requests:** When definitions are not found, users can submit requests for missing terms via webhook integration, enabling community-driven expansion of the database.

### Configuration System

**📁 Configuration:** The extension uses a centralized `config.js` file for easy customization:

- **External Resources** (ALL-CAPS): `WEBHOOK_URL`, `API_URL` - easily modifiable by developers
- **Internal Settings**: Display limits, timeouts, and extension metadata
- **No Setup Required**: Works out of the box with default Justice Definitions Project webhook
- **Custom Options**: Users can override webhook URL via Options page

### About Justice Definitions Project

This extension is built on the **Justice Definitions Project** - an expert-curated, credible knowledge base for legal terminology featuring:

- Expert review workflows and transparent sourcing
- Community contributions from students, researchers, and legal practitioners
- Versioned changes and public discussion for key updates

**Contributing:** If you're an expert or institution interested in curation, please open an issue or reach out to collaborate.

### Features

**🎯 Core Features:**
- ✅ **Right-click Definition Lookup** - Instant floating popups on text selection
- ✅ **Side Panel Interface** - Dedicated 25% width panel for extended browsing
- ✅ **Smart Context Detection** - Automatically switches between popup and panel modes
- ✅ **Two-way Communication** - Pull definitions and submit requests for missing terms
- ✅ **Centralized Configuration** - Easy customization via `config.js`
- ✅ **Responsive Design** - Adapts to content length and screen size
- ✅ **Google Sheets Integration** - Webhook system for definition requests

**🔧 Technical Features:**
- ✅ **Manifest V3** - Latest Chrome extension standard
- ✅ **Service Worker** - Efficient background processing
- ✅ **Content Scripts** - Seamless webpage integration
- ✅ **Storage API** - Persistent user preferences
- ✅ **Cross-origin Requests** - Secure API communication

### Development Status

**📋 Current Status:**
- ✅ **Version 0.6.0** - Latest stable release
- ✅ **Right-click functionality** - Primary interaction method
- ✅ **Side panel implementation** - Extended browsing interface
- ✅ **Webhook integration** - Google Apps Script deployment
- ✅ **Code cleanup** - Removed redundant functions and files
- ⚠️ **Development version** - Not published to Chrome Web Store

**🔓 Open Source:** This repository is publicly available. Developers can use it as a reference to build their own extensions or contribute enhancements.

### Recent Updates (v0.6.0)

**🆕 New Features:**
- **Right-click Integration** - Primary method for instant definition lookup
- **Side Panel Interface** - Dedicated browsing panel with search functionality
- **Smart Mode Detection** - Automatically switches between popup and panel based on context
- **Enhanced Webhook System** - Updated Google Apps Script integration for definition requests

**🔧 Improvements:**
- **Code Cleanup** - Removed redundant functions and temporary files
- **Performance Optimization** - Streamlined content scripts and background processing
- **UI/UX Enhancements** - Better popup positioning and responsive design
- **Configuration Management** - Centralized settings in `config.js`

**🐛 Bug Fixes:**
- Fixed reference to non-existent SVG assets
- Resolved popup positioning issues
- Improved error handling for webhook requests
- Enhanced cross-origin request compatibility

### License

[MIT](LICENSE)


 
