# GitHub Issue Template: API Cleanup Layer Improvements

## Issue Title
**Improve API cleanup layer for better display output from MediaWiki pages**

## Issue Type
- [ ] Bug
- [x] Enhancement
- [ ] Feature Request
- [ ] Documentation

## Priority
- [ ] Low
- [ ] Medium
- [x] High
- [ ] Critical

## Description

The current API cleanup layer for processing MediaWiki content is insufficient and produces unclear, messy display output. The extension needs a more robust cleanup system to handle various MediaWiki markup patterns and provide cleaner, more readable definition previews.

## Current Problem

### Issues with Current Implementation:
1. **Basic cleanup only**: Current regex patterns only handle basic MediaWiki markup
2. **Incomplete extraction**: MediaWiki API extracts may contain unwanted formatting
3. **Poor fallback handling**: Snippet cleanup is rudimentary and misses many patterns
4. **Inconsistent output**: Display quality varies significantly between different wiki pages
5. **Missing patterns**: Many MediaWiki markup patterns are not handled

### Current Cleanup Code (popup.js lines 107-120):
```javascript
// TODO: Issue #1 - Improve API cleanup layer for better display output
// Current cleanup is basic and may not handle all MediaWiki markup patterns
if (!extractText) {
  const snippetHtml = first.snippet || "";
  const tmp = document.createElement("div");
  tmp.innerHTML = snippetHtml;
  const snippetText = (tmp.textContent || tmp.innerText || "");
  extractText = snippetText
    .replace(/\[\[[^\]]+\]\]/g, "")       // remove [[...]] wiki links/categories
    .replace(/\{\{[^}]+\}\}/g, "")          // remove {{...}} templates
    .replace(/==+[^=]*==+/g, "")               // remove == headings ==
    .replace(/\s+/g, " ")
    .trim();
}
```

## Expected Behavior

The cleanup layer should:
1. **Handle all MediaWiki markup patterns** (tables, lists, references, etc.)
2. **Provide consistent, clean output** regardless of source page formatting
3. **Preserve essential content** while removing formatting artifacts
4. **Handle edge cases** like nested markup, special characters, and complex templates
5. **Improve readability** of definition previews

## Proposed Solutions

### Option 1: Enhanced Regex-Based Cleanup
- Expand regex patterns to handle more MediaWiki markup
- Add specific handlers for tables, lists, references, and citations
- Implement multi-pass cleanup for nested markup

### Option 2: MediaWiki Parser Integration
- Use MediaWiki's own parsing capabilities
- Leverage existing MediaWiki cleanup libraries
- More accurate but potentially more complex

### Option 3: Custom Parser
- Build a dedicated MediaWiki markup parser
- Handle specific patterns used in Justice Definitions Project
- Most control but requires significant development

## Technical Details

### Files Affected:
- `popup/popup.js` (lines 107-120)
- Potentially new utility file for cleanup functions

### API Endpoints:
- MediaWiki API: `https://jdc-definitions.wikibase.wiki/w/api.php`
- Current parameters: `action=query&prop=extracts&explaintext=1&exintro=1&exsectionformat=plain`

### Test Cases Needed:
1. Pages with complex tables
2. Pages with multiple references
3. Pages with nested templates
4. Pages with special characters
5. Pages with mixed content types

## Acceptance Criteria

- [ ] All MediaWiki markup patterns are properly cleaned
- [ ] Display output is consistent and readable
- [ ] No formatting artifacts in definition previews
- [ ] Performance is maintained or improved
- [ ] Edge cases are handled gracefully
- [ ] Code is well-documented and maintainable

## Additional Context

This issue affects the core user experience of the extension. Poor cleanup results in:
- Confusing definition previews
- Reduced user trust in the extension
- Poor readability of legal definitions
- Inconsistent user experience

## Labels
- `enhancement`
- `api`
- `cleanup`
- `mediawiki`
- `high-priority`

---

**To create this issue:**
1. Go to https://github.com/dso6060/jdp/issues/new
2. Copy the title and description above
3. Add appropriate labels
4. Assign to appropriate milestone
5. Submit the issue
