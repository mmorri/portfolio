# Email PII Monitor

A Node.js backend system for monitoring email communications and flagging emails containing sensitive information (PII) for further review, with Gmail API integration.

## Features

- **PII Detection**: Automatically detects SSNs, credit cards, phone numbers, email addresses, and bank account numbers
- **Sensitive Content Flagging**: Identifies emails containing confidential keywords
- **Risk Scoring**: Assigns risk levels (LOW, MEDIUM, HIGH, CRITICAL) based on content analysis
- **Gmail Integration**: Real-time monitoring of Gmail inbox with OAuth 2.0 authentication
- **RESTful API**: Complete API for email analysis and monitoring management
- **Review Workflow**: Track and manage flagged emails through review process

## Quick Start

### Prerequisites

- Node.js 16+ 
- Google Cloud Project with Gmail API enabled
- OAuth 2.0 credentials from Google Cloud Console

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/email-pii-monitor.git
cd email-pii-monitor
