<p align="center">
  <img src="assets/icon128.png" alt="Justice Definitions Project" width="64" height="64">
  <br>
  <strong>JUSTICE DEFINITIONS PROJECT</strong>
</p>

---

A Chrome extension that provides instant access to legal definitions from the [Justice Definitions Project](https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project) - an expert-curated knowledge base for legal terminology. Features a sliding overlay panel that appears on top of webpages without disrupting the user's browsing experience. Built for researchers, students, and practitioners.

## Summary

**Justice Definitions Project Extension** is a Chrome extension that makes legal language accessible through two primary interaction methods:

1. **Right-Click Lookup**: Select any text on a webpage and right-click to get instant definition previews in a floating popup
2. **Sliding Overlay Panel**: Click the extension icon to open a 400px wide overlay that slides in from the right side, featuring built-in search functionality

**Key Benefits:**
- **Non-disruptive**: Overlay appears on top without affecting webpage layout
- **Instant access**: Right-click any legal term for immediate definitions
- **Request system**: Submit missing terms via webhook integration
- **Smooth UX**: 0.3s slide animations and click-outside-to-close functionality
- **Expert-curated**: Built on the Justice Definitions Project knowledge base

## Demo

<p align="center">
  <img src="assets/jdp_demo.gif" alt="Justice Definitions Project Extension Demo" width="800" height="450">
  <br>
  <em>See the extension in action: Right-click on legal terms for instant definitions, or use the sliding overlay panel for extended browsing.</em>
</p>

## Installation

1. Clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select project folder
5. Extension appears in toolbar

## Usage

*Watch the demo above to see the extension in action!*

### Right-Click Lookup (Primary Method)
1. **Select text** on any webpage
2. **Right-click** to trigger instant definition lookup
3. **Floating popup** appears with definition preview
4. **Request missing definitions** or close popup

### Sliding Overlay Panel (Extended Browsing)
1. **Click extension icon** to open sliding overlay panel (400px width)
2. **Panel slides in** from the right side without affecting webpage layout
3. **Search for terms** using the built-in search bar
4. **View results** directly within the overlay
5. **Click outside or close button** to slide panel out

### Smart Features
- **Context-aware**: Automatically switches between popup and overlay modes
- **Non-disruptive**: Overlay appears on top without affecting webpage layout
- **Smooth animations**: 0.3s slide transitions for professional feel
- **Click-outside closure**: Intuitive closing by clicking outside the overlay

## Features

### Core Features
- ✅ **Right-click definition lookup** - Instant floating popups
- ✅ **Sliding overlay panel** - 400px width overlay that slides in from right
- ✅ **Non-disruptive design** - Overlay appears on top without affecting webpage
- ✅ **Smooth animations** - 0.3s slide transitions for professional UX
- ✅ **Click-outside closure** - Intuitive closing by clicking outside overlay
- ✅ **Built-in search** - Search functionality within the overlay
- ✅ **Smart context detection** - Auto-switches between popup and overlay modes
- ✅ **Two-way communication** - Pull definitions and submit requests
- ✅ **Request definition system** - Submit missing terms via webhook integration

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
- **Content Scripts** - Seamless webpage integration with overlay system
- **Custom Overlay System** - Sliding div-based panel (no iframes)
- **Storage API** - Persistent user preferences
- **Cross-origin Requests** - Secure API communication
- **FormData Webhook** - Reliable data submission without navigation

## Status

- ✅ **Version 0.6.0** - Latest stable release
- ⚠️ **Development version** - Not published to Chrome Web Store
- 🔓 **Open Source** - Available for reference and contributions

### License

[MIT](LICENSE)


 
