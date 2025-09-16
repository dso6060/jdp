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

### What this extension does

- Select any word/term on a webpage and open the extension popup
- The extension searches the Justice Definitions Project for the most relevant page
- It displays the first 140 characters from the page intro and links to the source, so you can read more in context

### Two-Way Communication System

This project implements a **two-way communication system** between the browser extension and the Justice Definitions Project:

**📥 Pull Data (Primary Function):**
- Extension queries the Justice Definitions Project MediaWiki API
- Retrieves and displays legal definitions from the curated knowledge base
- Provides instant access to expert-reviewed legal terminology
- Links back to the full wiki page for comprehensive information

**📤 Send Requests (Community Contribution):**
- When definitions are not found, users can submit requests for missing terms
- Requests are sent to the Justice Definitions Project team via webhook integration
- Enables community-driven expansion of the legal definitions database
- Helps identify gaps in coverage for the expert curation team

**🔄 Continuous Improvement:**
- User requests inform the Justice Definitions Project team about needed definitions
- Expert curators review and add new definitions based on community needs
- Extension automatically benefits from the growing knowledge base
- Creates a feedback loop between users and legal experts

### Configuration System

**📁 Config File (`config.js`):**
The extension uses a centralized configuration file that allows easy customization without modifying core code:

- **Webhook Settings**: Default webhook URL for Justice Definitions Project team
- **API Configuration**: MediaWiki API endpoints and timeouts
- **Display Settings**: Character limits, word counts, and formatting options
- **Extension Metadata**: Name, version, and description

**🔧 Easy Configuration:**
- Edit `config.js` to change webhook URLs, API endpoints, or display settings
- No need to modify popup.js or other core files
- Changes take effect after extension reload

**⚠️ Webhook Configuration:**
- **Default**: Requests automatically sent to Justice Definitions Project team
- **Custom**: Users can override via Options page for personal webhook URLs
- **No Setup Required**: Extension works out of the box with default webhook

### Known Issues & Troubleshooting

**⚠️ Webhook Configuration (Optional):**
- The "Request Definition" feature uses a default webhook URL (configurable in `config.js`)
- If you see "Configure request endpoint first" error, this is normal - the webhook is optional
- To use custom webhook: Right-click extension → Options → Enter your Apps Script URL
- Without custom webhook: Extension works perfectly using default Justice Definitions Project webhook
- With custom webhook: Can collect requests in your own Google Sheet

### Why “reliable” Justice Definitions

We are evolving this effort toward an expert‑curated, credible knowledge base for legal terminology.
The intent is to reduce ambiguity and ensure reliability by incorporating:

- Expert review workflows (domain experts vet definitions and updates)
- Transparent sourcing and citations
- Versioned changes and public discussion for key updates

While the extension already integrates with the Justice Definitions Project, the “credible”
designation reflects the ongoing work to formalise governance, review, and publishing standards.

### Governance and contributions

- Editorial guidance: legal academics and practitioners help set standards
- Review flow: submissions and edits are reviewed by experts before publication
- Community: students, researchers, and contributors can propose improvements and citations

If you’re an expert or institution and would like to participate in curation,
please open an issue or reach out to collaborate.

### Built on Justice Definitions content

This browser extension is a plugin built on top of the content created and maintained by the open‑source team behind the **Justice Definitions Project**. We gratefully acknowledge their work in curating reliable legal definitions and citations.

### Repository Status

**🔓 Public Repository:** This project is open source and publicly available on GitHub.

**📋 Current Status:**
- ✅ Core functionality working (JDP lookups)
- ✅ Two-way communication system implemented
- ✅ Centralized configuration system (`config.js`)
- ✅ Default webhook for Justice Definitions Project team
- ✅ Optional custom webhook configuration
- 🔄 Version 0.5.1 (latest)

**🐛 Known Issues:**
1. **Development Only:** This is a development version, not published to Chrome Web Store

### Open Source

This repository is open source. Developers can use it as a reference to build their own extensions
or contribute enhancements here. The extension uses a centralized configuration system that makes
it easy to customize webhook URLs, API endpoints, and display settings without modifying core code.

### License

[MIT](LICENSE)


 
