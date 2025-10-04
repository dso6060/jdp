# Security Documentation

This document outlines security considerations, best practices, and recommendations for deploying and using the Justice Definitions Project browser extension in a secure manner.

## 🔒 Security Overview

The Justice Definitions Project extension is designed with security in mind, but proper configuration and deployment practices are essential for maintaining security in production environments.

## 🛡️ Security Features

### Built-in Security Measures

1. **Access Key Authentication**: Prevents unauthorized access to your webhook endpoint
2. **Rate Limiting**: Protects against abuse and DoS attacks
3. **Input Validation**: Sanitizes and validates all incoming data
4. **XSS Protection**: Basic protection against cross-site scripting attacks
5. **Geographic Logging**: Optional IP-based tracking for monitoring
6. **Request Logging**: Comprehensive logging for audit trails

### Security Configuration

```javascript
SECURITY: {
  ENABLE_ACCESS_KEY_VALIDATION: true,  // Always enable in production
  ACCESS_KEY: 'your_secure_key',       // Use a strong, random key
  LOG_REQUESTS: true,                  // Enable for audit trails
  LOG_IP_ADDRESSES: true,              // Enable for monitoring
  LOG_GEOGRAPHY: true                  // Enable for geographic analysis
}
```

## 🔐 Access Key Security

### Generating Secure Access Keys

**DO:**
- Use at least 32 characters
- Include uppercase, lowercase, numbers, and special characters
- Use a cryptographically secure random generator
- Store the key securely (password manager, environment variables)

**DON'T:**
- Use dictionary words or common phrases
- Use personal information
- Share keys in plain text
- Commit keys to version control

### Example Secure Key Generation

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Key Rotation

- **Regular Rotation**: Change access keys every 90 days
- **Emergency Rotation**: Change immediately if compromise is suspected
- **Update Both Sides**: Always update both Apps Script and extension configs simultaneously

## 🌐 Network Security

### HTTPS Requirements

- **Always use HTTPS** for your Google Apps Script deployment
- **Verify SSL certificates** are valid and up-to-date
- **Use secure headers** where possible

### CORS Considerations

The extension uses background scripts to bypass CORS restrictions:
- Background scripts have elevated permissions
- Requests are made from the extension context, not the webpage
- This approach is more secure than disabling CORS

## 📊 Rate Limiting

### Configuration Guidelines

```javascript
RATE_LIMIT_ENABLED: true,
MAX_REQUESTS_PER_HOUR: 1000,      // Adjust based on expected usage
MAX_REQUESTS_PER_MINUTE: 30       // Prevent rapid-fire attacks
```

### Rate Limiting Best Practices

1. **Monitor Usage Patterns**: Adjust limits based on actual usage
2. **Implement Graduated Responses**: Consider different limits for different user types
3. **Log Rate Limit Violations**: Monitor for potential attacks
4. **Use IP-based Tracking**: Combine with user-based tracking for better protection

## 🗂️ Data Privacy and Logging

### Logging Configuration

```javascript
// Minimal logging (privacy-focused)
SECURITY: {
  LOG_REQUESTS: true,           // Keep audit trail
  LOG_IP_ADDRESSES: false,      // Disable for privacy
  LOG_GEOGRAPHY: false          // Disable for privacy
}

// Full logging (monitoring-focused)
SECURITY: {
  LOG_REQUESTS: true,           // Full audit trail
  LOG_IP_ADDRESSES: true,       // Enable for security monitoring
  LOG_GEOGRAPHY: true           // Enable for usage analytics
}
```

### Data Retention

- **Google Sheets**: Data persists indefinitely by default
- **Apps Script Properties**: Rate limiting data auto-expires after 2 hours
- **Geolocation Cache**: Expires after 5 minutes

### Privacy Considerations

1. **IP Address Logging**: Can be disabled if privacy is a concern
2. **Geographic Data**: Optional feature for analytics
3. **Request Content**: Terms and URLs are logged for audit purposes
4. **User Agent**: Logged for debugging and analytics

## 🔍 Monitoring and Auditing

### Security Monitoring

1. **Regular Log Reviews**: Check Google Sheets for unusual patterns
2. **Failed Authentication Attempts**: Monitor for access key guessing
3. **Rate Limit Violations**: Watch for potential attacks
4. **Geographic Anomalies**: Unusual geographic patterns

### Audit Trail

The system logs:
- Request timestamps
- Source IP addresses (if enabled)
- Geographic location (if enabled)
- Request content (terms and URLs)
- Validation status
- Rate limit status

### Monitoring Tools

- **Google Sheets**: Built-in filtering and sorting
- **Google Apps Script Logs**: Execution history and errors
- **Browser Developer Tools**: Client-side debugging

## 🚨 Incident Response

### Security Incident Checklist

1. **Immediate Response**:
   - [ ] Rotate access keys
   - [ ] Check logs for compromise indicators
   - [ ] Review recent requests for anomalies

2. **Investigation**:
   - [ ] Analyze log patterns
   - [ ] Check for unauthorized access
   - [ ] Review rate limiting violations

3. **Recovery**:
   - [ ] Update configurations if needed
   - [ ] Implement additional monitoring
   - [ ] Document lessons learned

### Common Attack Vectors

1. **Access Key Guessing**: Mitigated by strong keys and rate limiting
2. **DoS Attacks**: Mitigated by rate limiting and request validation
3. **Data Injection**: Mitigated by input validation and sanitization
4. **Information Disclosure**: Mitigated by proper error handling

## 🔧 Hardening Recommendations

### Production Hardening

1. **Enable All Security Features**:
   ```javascript
   SECURITY: {
     ENABLE_ACCESS_KEY_VALIDATION: true,
     LOG_REQUESTS: true,
     LOG_IP_ADDRESSES: true,
     LOG_GEOGRAPHY: true
   }
   ```

2. **Implement Additional Validation**:
   - Add custom validation rules
   - Implement request signing
   - Add time-based tokens

3. **Monitor and Alert**:
   - Set up automated monitoring
   - Create alerts for suspicious activity
   - Regular security reviews

### Environment Security

1. **Google Account Security**:
   - Enable 2FA on your Google account
   - Use strong passwords
   - Regular security checkups

2. **Google Apps Script Security**:
   - Limit script sharing
   - Regular permission reviews
   - Monitor execution logs

3. **Google Sheets Security**:
   - Limit sheet sharing
   - Regular access reviews
   - Backup important data

## 📋 Security Checklist

### Before Deployment

- [ ] Generate secure access keys
- [ ] Configure rate limiting appropriately
- [ ] Enable security logging
- [ ] Test all security features
- [ ] Review and update all configurations

### After Deployment

- [ ] Monitor logs regularly
- [ ] Check for unusual patterns
- [ ] Review access patterns
- [ ] Update configurations as needed
- [ ] Rotate keys on schedule

### Ongoing Maintenance

- [ ] Monthly security reviews
- [ ] Quarterly key rotation
- [ ] Annual security assessment
- [ ] Regular backup verification
- [ ] Update documentation

## 🆘 Security Contacts

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. **DO** contact the maintainers privately
3. **DO** provide detailed information about the vulnerability
4. **DO** allow reasonable time for response before disclosure

### Security Resources

- [OWASP Browser Extension Security](https://owasp.org/www-project-browser-extension-security/)
- [Google Apps Script Security](https://developers.google.com/apps-script/guides/security)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)

## 📚 Additional Resources

- [README.md](../README.md) - Main project documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions
- [Google Apps Script Security Best Practices](https://developers.google.com/apps-script/guides/security)

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular reviews and updates are essential for maintaining a secure deployment.
