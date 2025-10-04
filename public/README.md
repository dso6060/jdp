# Justice Definitions Project Chrome Extension

<p align="center">
  <img src="assets/icon128.png" alt="Justice Definitions Project" width="64" height="64">
  <br>
  <strong>Version 1.0.0 - Production Release</strong>
</p>

---

## Overview

The **Justice Definitions Project Chrome Extension** provides instant access to legal definitions from an expert-curated knowledge base. Built for legal researchers, students, and practitioners, this extension seamlessly integrates with your browsing experience to deliver accurate, contextual legal definitions without disrupting your workflow.

### What This Extension Does

- **Instant Legal Definitions**: Right-click any legal term to get immediate definitions
- **Smart Search Interface**: Dedicated side panel for comprehensive legal term searches  
- **Request Missing Terms**: Submit requests for definitions not yet in the database
- **Seamless Integration**: Works on any webpage without navigation disruption
- **Expert-Curated Content**: Access to professionally reviewed legal terminology

## Key Features

### 🎯 **Core Functionality**
- **Right-Click Lookup**: Select any legal term and right-click for instant definition previews
- **Sliding Side Panel**: 400px overlay panel with built-in search and request functionality
- **Smart Content Display**: Automatically filters and displays the most relevant definition content
- **Request System**: Submit missing terms for expert review and addition to the database

### 🌍 **Advanced Capabilities**
- **Geolocation Tracking**: Captures user location data for analytics and insights
- **Intelligent Caching**: Prevents rate limiting and improves performance with 5-minute TTL
- **Context-Aware Responses**: Different feedback for popup vs. side panel interactions
- **Robust Error Handling**: Graceful fallbacks for edge cases and extension context issues

### 🔒 **Security & Reliability**
- **Background Script Proxy**: Bypasses CORS restrictions for secure API communication
- **Environment Configuration**: Sensitive data externalized from codebase
- **Input Validation**: Comprehensive data sanitization and validation
- **Memory Management**: Automatic cache cleanup prevents memory leaks

## Installation

### For End Users
1. Download the extension from the Chrome Web Store (coming soon)
2. Click "Add to Chrome" to install
3. The extension icon will appear in your browser toolbar

### For Developers
1. Clone this repository: `git clone https://github.com/your-repo/justice-definitions-extension`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the project folder
5. The extension will appear in your browser toolbar

## Usage Guide

### Right-Click Definition Lookup
1. **Select Text**: Highlight any legal term on any webpage
2. **Right-Click**: Choose "Look up definition" from the context menu
3. **View Definition**: A floating popup appears with the definition
4. **Request Missing Terms**: If no definition exists, click "Request Definition"

### Side Panel Search
1. **Open Panel**: Click the extension icon in your browser toolbar
2. **Search Terms**: Use the search bar to find legal definitions
3. **Browse Results**: View multiple definition options with "Read more" links
4. **Request Definitions**: Submit requests for terms not in the database

### Special Cases
- **PDF Documents**: Right-click lookup doesn't work on PDFs - use the side panel instead
- **Multiple Results**: Use "Read more" to view full definitions within the side panel
- **Wiki Navigation**: "View on Wiki" buttons open the full Justice Definitions Project page

## Technical Architecture

### Core Technologies
- **Chrome Extension Manifest V3**: Latest extension standard with enhanced security
- **JavaScript ES6+**: Modern JavaScript with async/await patterns
- **MediaWiki API**: Integration with Justice Definitions Project knowledge base
- **Google Apps Script**: Webhook endpoint for data collection and processing

### System Components

#### **Content Script** (`content.js`)
- Handles webpage interaction and user input
- Manages floating popups and side panel overlay
- Processes definition requests and displays results
- Implements intelligent content filtering and caching

#### **Background Script** (`background.js`)
- Acts as proxy for external API requests
- Bypasses CORS restrictions for secure communication
- Handles webhook requests to Google Apps Script
- Manages extension lifecycle and message routing

#### **Side Panel** (`sidepanel/`)
- Provides dedicated search interface
- Handles complex definition browsing
- Manages user requests and feedback
- Implements responsive design for various screen sizes

### Data Flow
1. **User Input**: Text selection or search query
2. **API Query**: MediaWiki API request for definition data
3. **Content Processing**: Filtering and formatting of definition content
4. **Display**: User-friendly presentation in popup or side panel
5. **Request Handling**: Webhook submission for missing terms
6. **Analytics**: Geolocation and usage data collection

### Security Implementation
- **Environment Variables**: Sensitive configuration externalized
- **Input Validation**: Comprehensive sanitization of user input
- **CORS Bypass**: Background script handles all external requests
- **Error Isolation**: Failures don't affect core functionality

## Development

### Prerequisites
- Node.js 16+ (for development tools)
- Chrome Browser (for testing)
- Google Apps Script account (for webhook endpoint)

### Project Structure
```
public/
├── manifest.json          # Extension configuration
├── content.js            # Main content script
├── background.js         # Service worker
├── config.js            # Configuration management
├── popup/               # Extension popup interface
├── sidepanel/           # Side panel interface
└── assets/              # Icons and demo images
```

### Key Development Tools
- **Chrome DevTools**: Extension debugging and testing
- **Google Apps Script**: Webhook endpoint development
- **MediaWiki API**: Definition data source
- **Git**: Version control and collaboration

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

## About the Justice Definitions Project

The [Justice Definitions Project](https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project) is an expert-curated knowledge base for legal terminology featuring:

- **Expert Review Workflows**: Professional validation of all definitions
- **Transparent Sourcing**: Clear attribution and citation of legal sources
- **Community Contributions**: Input from students, researchers, and practitioners
- **Versioned Changes**: Trackable modifications with public discussion
- **Open Access**: Free access to legal knowledge for all users

## Credits & Acknowledgments

### Original Development
- **Sandeep Suman** ([@SandeepKrSuman](https://github.com/SandeepKrSuman)) - Original lookup functionality and foundational architecture

### Version 1.0 Development Team
- **Justice Definitions Project Team** - Expert curation and content validation
- **Open Source Contributors** - Community feedback and feature suggestions

### Technologies & Services
- **Chrome Extensions API** - Browser integration and security
- **MediaWiki** - Knowledge base platform and API
- **Google Apps Script** - Webhook processing and data collection
- **IP Geolocation Services** - User location analytics

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Documentation**: Comprehensive guides available in the repository
- **Community**: Join discussions in the Justice Definitions Project community

## Version History

### Version 1.0.0 (Current)
- **Production Release**: Stable, feature-complete extension
- **Enhanced Security**: Environment-based configuration and CORS bypass
- **Improved Performance**: Intelligent caching and error handling
- **Better UX**: Context-aware responses and persistent UI elements
- **Geolocation Tracking**: User location analytics for insights
- **Chrome Web Store Ready**: Meets all submission requirements

---

<p align="center">
  <strong>Built with ❤️ for the legal community</strong>
  <br>
  <em>Making legal knowledge accessible to everyone</em>
</p>