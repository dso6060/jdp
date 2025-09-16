<p align="center">JUSTICE DEFINTIONS PROJECT</p>

---

<br>

<p>
This project aims to make legal language accessible by connecting any webpage selection to a reliable community‑maintained <a href="https://jdc-definitions.wikibase.wiki/wiki/The_Justice_Definitions_Project">Justice Definitions Project</a>. Built for researchers, students, and practitioners, the extension lets you select a term on any page and instantly shows a concise
definition preview sourced from the Justice Definitions Project (MediaWiki), curated and reviewed
by experts. The goal is to provide credible, up‑to‑date explanations
grounded in Indian legal context while remaining easy to consult during everyday reading.
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

- Select any word/term on a webpage and open the extension popup
- The extension searches the Justice Definitions Project for the most relevant page
- Displays a concise definition preview and links to the full wiki page

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

### Development Status

**📋 Current Status:**
- ✅ Core functionality working (JDP lookups)
- ✅ Two-way communication system implemented
- ✅ Centralized configuration system
- 🔄 Version 0.5.2 (latest)
- ⚠️ Development version (not published to Chrome Web Store)

**🔓 Open Source:** This repository is publicly available. Developers can use it as a reference to build their own extensions or contribute enhancements.

### License

[MIT](LICENSE)


 
