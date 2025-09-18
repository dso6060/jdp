# Justice Definitions Project

A Chrome extension that provides instant access to legal definitions from the [Justice Definitions Project](https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project) - an expert-curated knowledge base for legal terminology.

## Installation

1. Clone this repository
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select project folder
5. Extension appears in toolbar

## Usage

### Right-Click Lookup
1. Select text on any webpage
2. Right-click to get definition
3. Request missing definitions or close popup

### Sliding Overlay Panel
1. Click extension icon to open panel
2. Search for terms using the search bar
3. Request missing definitions using the button
4. Click outside to close panel

### PDF Pages
Right-click lookup does not work on PDF documents. For PDF pages, use the side panel and type the words you want to look up.

## Features

- **Right-click definition lookup** - Instant floating popups with real API data
- **Sliding overlay panel** - 400px width overlay with built-in search functionality
- **Request definition system** - Submit missing terms via webhook integration
- **Google Sheet integration** - Automatic data collection for expert review

### Request System
- **Pull Data**: Queries Justice Definitions Project MediaWiki API for definitions
- **Send Requests**: Submit missing term requests via webhook integration
- **Tracking**: Requests logged to [Google Sheet](https://docs.google.com/spreadsheets/d/15mdKhoJuhdzpeSCL0STRLFI5umMaDF5CCf0D5qiWbOY/edit?usp=sharing) for prototype iteration
- **Prototype**: Google Sheet serves as data collection system for future backend development

## About

Built on the [Justice Definitions Project](https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project) - an expert-curated knowledge base for legal terminology featuring:
- Expert review workflows and transparent sourcing
- Community contributions from students, researchers, and legal practitioners
- Versioned changes and public discussion

**Contributing:** Open an issue if you're interested in curation or collaboration.

## Technical Details

- **Manifest V3** - Latest Chrome extension standard
- **Service Worker** - Efficient background processing with message handling
- **Content Scripts** - Seamless webpage integration with overlay system
- **Custom Overlay System** - Sliding div-based panel (no iframes)
- **Storage API** - Persistent user preferences
- **Cross-origin Requests** - Secure API communication
- **FormData Webhook** - Reliable data submission without navigation
- **Event Listener Architecture** - Proper function scope and error handling
- **Extension Context Validation** - Prevents crashes during reloads
- **Comprehensive Debugging** - Detailed logging for troubleshooting
- **Fallback Mechanisms** - Multiple function exposure methods for reliability

## Status

- **Version 0.8.0** - Latest stable release with full webhook integration
- **Development version** - Not published to Chrome Web Store
- **Open Source** - Available for reference and contributions

## Credits

The lookup functionality in this extension was originally developed by **Sandeep Suman** ([@SandeepKrSuman](https://github.com/SandeepKrSuman)). This project builds upon their foundational work to provide enhanced legal definition lookup capabilities.

## License

[MIT](LICENSE)