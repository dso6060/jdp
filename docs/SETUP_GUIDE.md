# Complete Setup Guide

This guide will walk you through setting up your own instance of the Justice Definitions Project browser extension from scratch.

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ A Google account
- ✅ A modern web browser (Chrome, Firefox, Edge, or Safari)
- ✅ Basic computer skills
- ✅ About 30-45 minutes to complete the setup

## 🎯 Part 1: Google Apps Script Backend Setup

### Step 1: Create a New Google Apps Script Project

1. **Open Google Apps Script**:
   - Go to [script.google.com](https://script.google.com)
   - Sign in with your Google account if prompted

2. **Create a new project**:
   - Click the "+" button or "New Project"
   - You'll see a default `Code.gs` file with some sample code

3. **Replace the default code**:
   - Delete all existing code in `Code.gs`
   - Copy the entire contents from `google-apps-script/Code.gs` in this repository
   - Paste it into your Google Apps Script editor

### Step 2: Create a Google Sheet

1. **Create a new Google Sheet**:
   - Go to [sheets.google.com](https://sheets.google.com)
   - Click "+" to create a new blank sheet

2. **Get the Sheet ID**:
   - Look at the URL in your browser's address bar
   - The URL will look like: `https://docs.google.com/spreadsheets/d/1ABC123...XYZ/edit`
   - Copy the long string between `/d/` and `/edit` (this is your Sheet ID)
   - Save this ID - you'll need it in the next step

### Step 3: Configure Your Apps Script

1. **Update the configuration**:
   - In your Google Apps Script editor, find the `CONFIG` object at the top
   - Replace the placeholder values:

   ```javascript
   const CONFIG = {
     // Replace with your actual Google Sheet ID
     SHEET_ID: '1ABC123...XYZ', // Your Sheet ID from Step 2
     
     SECURITY: {
       ENABLE_ACCESS_KEY_VALIDATION: true,
       // Replace with a secure random string (at least 16 characters)
       ACCESS_KEY: 'your_super_secure_random_key_here_123456',
       // ... rest of the config
     }
   };
   ```

2. **Generate a secure access key**:
   - Use a password generator or create a random string
   - Make it at least 16 characters long
   - Include letters, numbers, and special characters
   - Save this key securely - you'll need it for the browser extension

### Step 4: Deploy Your Apps Script

1. **Save your project**:
   - Press `Ctrl+S` (or `Cmd+S` on Mac)
   - Give your project a name like "Justice Definitions Webhook"

2. **Deploy as a web app**:
   - Click the "Deploy" button (next to the Save button)
   - Select "New deployment"
   - Click the gear icon and choose "Web app"

3. **Configure the deployment**:
   - **Description**: "Justice Definitions Webhook"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone"
   - Click "Deploy"

4. **Get your deployment URL**:
   - Copy the web app URL (it will look like: `https://script.google.com/macros/s/ABC123...XYZ/exec`)
   - Save this URL - you'll need it for the browser extension
   - The deployment ID is the long string between `/s/` and `/exec`

### Step 5: Test Your Backend

1. **Test the health endpoint**:
   - Open the web app URL in a new browser tab
   - You should see a JSON response like:
   ```json
   {
     "success": true,
     "message": "Justice Definitions Project Webhook is running",
     "version": "1.0.0-open-source"
   }
   ```

2. **Check the logs**:
   - Go back to your Google Apps Script editor
   - Click "Executions" in the left sidebar
   - You should see a successful execution

## 🎯 Part 2: Browser Extension Setup

### Step 1: Download and Prepare the Extension

1. **Download the extension files**:
   - Clone or download this repository
   - Navigate to the `public` folder

2. **Update the configuration**:
   - Open `public/config.js` in a text editor
   - Replace the deployment ID:
   ```javascript
   const DEPLOYMENT_ID = 'YOUR_ACTUAL_DEPLOYMENT_ID_HERE';
   ```

3. **Update the background script**:
   - Open `public/background.js` in a text editor
   - Replace the webhook configuration:
   ```javascript
   const WEBHOOK_CONFIG = {
     ENDPOINT: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec/webhook',
     ACCESS_KEY: 'your_same_secure_access_key_from_apps_script'
   };
   ```

### Step 2: Load the Extension in Chrome

1. **Open Chrome Extensions page**:
   - Type `chrome://extensions/` in your address bar
   - Or go to Menu → More Tools → Extensions

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the extension**:
   - Click "Load unpacked"
   - Navigate to and select the `public` folder
   - The extension should now appear in your extensions list

4. **Pin the extension**:
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "Justice Definitions Project" and click the pin icon

### Step 3: Test the Extension

1. **Test basic functionality**:
   - Go to any website with legal text
   - Select some text that might be a legal term
   - Click the extension icon or right-click and look for the extension option

2. **Test the side panel**:
   - The side panel should open showing the search interface
   - Try searching for a legal term

3. **Test webhook submission**:
   - Submit a request for a new definition
   - Check your Google Sheet - you should see a new row with the request

## 🎯 Part 3: Verification and Troubleshooting

### Verify Everything is Working

1. **Check the Google Sheet**:
   - Open your Google Sheet
   - You should see headers: ID, Term, Page URL, Status, etc.
   - New rows should appear when you submit requests

2. **Check Apps Script logs**:
   - Go to your Google Apps Script project
   - Click "Executions" to see request logs
   - Look for successful executions

3. **Check browser console**:
   - Press F12 to open Developer Tools
   - Go to the Console tab
   - Look for any error messages

### Common Issues and Solutions

#### Issue: Extension not loading
**Solution**: 
- Make sure you selected the `public` folder, not the root folder
- Check that `manifest.json` exists and is valid JSON
- Try refreshing the extensions page

#### Issue: Webhook requests failing
**Solution**:
- Double-check that your deployment ID matches in both files
- Verify your access key is the same in both places
- Make sure your Apps Script deployment is set to "Anyone" access
- Check the Apps Script execution logs for error details

#### Issue: Side panel not opening
**Solution**:
- Try clicking the extension icon in the toolbar
- Check if the extension is pinned and visible
- Look for error messages in the browser console

#### Issue: Definitions not loading
**Solution**:
- Check your internet connection
- Verify the API endpoint in your configuration
- Look for network errors in the browser's Network tab

## 🎯 Part 4: Customization (Optional)

### Customizing the Extension

1. **Change the extension name**:
   - Edit `public/manifest.json`
   - Update the "name" field

2. **Add your own icons**:
   - Replace the files in `public/assets/` with your own icons
   - Keep the same file names and sizes

3. **Modify the UI**:
   - Edit CSS files in `public/sidepanel/` and `public/popup/`
   - Change colors, fonts, and layout as desired

### Advanced Configuration

1. **Disable geographic logging**:
   - In your Apps Script, set `GEOGRAPHIC_LOGGING.ENABLED: false`

2. **Adjust rate limiting**:
   - Modify `MAX_REQUESTS_PER_HOUR` and `MAX_REQUESTS_PER_MINUTE`

3. **Change the API endpoint**:
   - Update `API_URL` in `public/config.js` to point to your own definition database

## 🎉 Congratulations!

You now have a fully functional Justice Definitions Project browser extension running on your own infrastructure! 

### Next Steps

- **Test thoroughly**: Try the extension on different websites
- **Monitor usage**: Check your Google Sheet regularly for new requests
- **Customize further**: Modify the UI and functionality to match your needs
- **Share with others**: Load the extension on other computers using the same setup

### Support

If you run into any issues:
1. Check this troubleshooting section
2. Review the main README.md file
3. Check the browser console and Apps Script execution logs
4. Create an issue in this repository's GitHub Issues

---

**Remember**: Keep your access keys and deployment IDs secure. Never share them publicly or commit them to version control.
