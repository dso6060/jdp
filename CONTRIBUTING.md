# Contributing to Justice Definitions Project

Thank you for your interest in contributing to the Justice Definitions Project! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:
1. Check if the issue has already been reported
2. Verify you're using the latest version
3. Provide detailed information about the problem

When reporting issues, include:
- Browser and version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

### Suggesting Features

We welcome feature suggestions! Please:
1. Check existing issues first
2. Provide a clear description of the feature
3. Explain the use case and benefits
4. Consider implementation complexity

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/justice-definitions-extension.git
   cd justice-definitions-extension
   ```

3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up your development environment**:
   - Follow the [Setup Guide](docs/SETUP_GUIDE.md)
   - Create your own Google Apps Script backend
   - Configure the extension with your credentials

#### Development Guidelines

1. **Code Style**:
   - Use consistent indentation (2 spaces)
   - Follow existing code patterns
   - Add comments for complex logic
   - Use meaningful variable names

2. **Testing**:
   - Test your changes thoroughly
   - Test on multiple browsers if possible
   - Verify both positive and negative cases
   - Check for console errors

3. **Security**:
   - Never commit secrets or credentials
   - Follow security best practices
   - Review the [Security Documentation](docs/SECURITY.md)

#### Submitting Changes

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add: descriptive commit message"
   ```

2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**:
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots if UI changes
   - Request review from maintainers

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (if applicable)
- [ ] Documentation is updated
- [ ] No secrets or credentials are included
- [ ] Changes are tested on multiple browsers
- [ ] Commit messages are clear and descriptive

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested on Chrome
- [ ] Tested on Firefox
- [ ] Tested on Edge
- [ ] No console errors
- [ ] All existing functionality works

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
```

## 🏗️ Development Setup

### Local Development

1. **Set up your own backend**:
   - Create a Google Apps Script project
   - Deploy it as a web app
   - Get your deployment ID and access key

2. **Configure the extension**:
   - Update `extension/config.js` with your deployment ID
   - Update `extension/background.js` with your webhook config
   - Load the extension in developer mode

3. **Test your changes**:
   - Load the extension in your browser
   - Test all functionality
   - Check browser console for errors

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Side panel opens and closes correctly
- [ ] Definition searches work
- [ ] Webhook submissions work
- [ ] Rate limiting functions properly
- [ ] Security validation works
- [ ] Geographic logging works (if enabled)

## 📚 Documentation

### Documentation Standards

- Use clear, concise language
- Include code examples where helpful
- Keep documentation up-to-date
- Follow existing documentation patterns

### Types of Documentation

1. **Code Comments**: Explain complex logic
2. **README Updates**: Update setup instructions
3. **API Documentation**: Document new endpoints
4. **Security Documentation**: Update security guidelines

## 🔒 Security Considerations

### Security Guidelines

1. **Never commit secrets**:
   - Access keys
   - API tokens
   - Deployment IDs
   - Personal information

2. **Follow security best practices**:
   - Validate all inputs
   - Sanitize user data
   - Use HTTPS everywhere
   - Implement proper authentication

3. **Report security issues privately**:
   - Don't create public issues for security problems
   - Contact maintainers directly
   - Allow time for response before disclosure

## 🎯 Areas for Contribution

### High Priority

- Bug fixes and stability improvements
- Security enhancements
- Performance optimizations
- Documentation improvements

### Medium Priority

- New features and functionality
- UI/UX improvements
- Browser compatibility
- Testing and quality assurance

### Low Priority

- Code refactoring
- Style improvements
- Additional documentation
- Community tools and scripts

## 📞 Getting Help

### Community Support

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Email**: For security issues and private matters

### Resources

- [Setup Guide](docs/SETUP_GUIDE.md) - Detailed setup instructions
- [Security Documentation](docs/SECURITY.md) - Security best practices
- [README](README.md) - Main project documentation

## 🏆 Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation

## 📝 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the Justice Definitions Project! 🎉
