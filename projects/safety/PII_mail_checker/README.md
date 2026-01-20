# Email PII Monitor

A full-stack application for monitoring email communications and detecting sensitive information (PII) with ML-powered detection, real-time updates, and a modern React dashboard.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## Overview

Email PII Monitor scans your Gmail inbox for sensitive information like Social Security Numbers, credit card numbers, phone numbers, and other PII. It combines rule-based pattern matching with machine learning for high accuracy and low false positives.

## Features

### Core Capabilities
- **Hybrid PII Detection** - Rule-based patterns + TensorFlow.js ML model
- **Gmail Integration** - OAuth 2.0 connection with step-by-step setup wizard
- **Real-time Dashboard** - KPIs, charts, and trend analysis
- **Alert Management** - Filterable queue with bulk actions and triage workflow
- **Role-based Access** - Admin, Analyst, and Viewer roles

### PII Types Detected
| Type | Validation |
|------|------------|
| Social Security Numbers | Pattern + format validation |
| Credit Card Numbers | Luhn algorithm |
| Email Addresses | RFC compliance |
| Phone Numbers | Format validation |
| Bank Account Numbers | Length validation |
| Sensitive Keywords | Configurable list |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │Dashboard │ │ Alerts   │ │ Gmail    │ │ Settings         ││
│  │          │ │ Queue    │ │ Setup    │ │                  ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API + WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                    Express Backend                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │Auth/RBAC │ │ Findings │ │ ML       │ │ Gmail Service    ││
│  │ Service  │ │ Service  │ │ Detector │ │                  ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │PostgreSQL│   │TensorFlow│   │Gmail API │
    │ (Prisma) │   │   Model  │   │          │
    └──────────┘   └──────────┘   └──────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Option 1: Docker (Recommended)

```bash
# Start full stack
docker-compose up -d

# Access:
# - Frontend: http://localhost:80
# - Backend API: http://localhost:3000
# - PostgreSQL: localhost:5432
```

### Option 2: Local Development

```bash
# Clone repository
git clone https://github.com/mmorri/portfolio.git
cd projects/safety/PII_mail_checker

# Install backend dependencies
npm install

# Setup database
cp .env.example .env
# Edit .env with your DATABASE_URL
npx prisma generate
npx prisma db push

# Train ML model (optional but recommended)
npm run generate-data 500 0.5
npm run train

# Start backend
npm run dev

# In new terminal - setup frontend
cd frontend
npm install
npm run dev

# Access:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
```

## Gmail Integration

### Setup Steps

1. **Navigate to Gmail Setup** in the sidebar
2. **Follow the 5-step wizard:**
   - Create Google Cloud Project
   - Enable Gmail API
   - Configure OAuth Consent Screen
   - Create OAuth Credentials (use redirect URI: `http://localhost:3000/api/gmail/callback`)
   - Add credentials to `.env`
3. **Click "Connect Gmail Account"**
4. **Authorize with Google**
5. **Click "Scan Now"** to scan recent emails

### Environment Variables for Gmail

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
```

## Project Structure

```
PII_mail_checker/
├── src/                      # Backend source
│   ├── config/              # Configuration
│   │   ├── database.js      # Prisma client
│   │   └── index.js         # Environment config
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Authentication & RBAC
│   │   └── errorHandler.js  # Error handling
│   ├── routes/              # API routes
│   │   ├── auth.js          # Auth endpoints
│   │   ├── findings.js      # Findings CRUD
│   │   ├── gmail.js         # Gmail integration
│   │   ├── policy.js        # Policy management
│   │   └── audit.js         # Audit logs
│   ├── services/            # Business logic
│   │   ├── userService.js
│   │   ├── findingService.js
│   │   ├── gmailService.js
│   │   ├── policyService.js
│   │   ├── auditService.js
│   │   └── websocketService.js
│   ├── app.js               # Express app setup
│   └── index.js             # Entry point
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   │   ├── layout/      # Layout components
│   │   │   └── common/      # Shared components
│   │   ├── context/         # React context
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Page components
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── AlertsPage.tsx
│   │   │   ├── FindingDetailPage.tsx
│   │   │   ├── GmailSetupPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── LoginPage.tsx
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   └── nginx.conf
├── ml/                       # ML components
│   ├── MLPIIDetector.js     # Detection class
│   ├── train-model.js       # Training script
│   └── generate_training_data.js
├── prisma/
│   └── schema.prisma        # Database schema
├── tests/
│   ├── unit/
│   └── integration/
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Findings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/findings` | List findings (paginated) |
| GET | `/api/findings/:id` | Get finding details |
| GET | `/api/findings/statistics` | Get statistics |
| PATCH | `/api/findings/:id/status` | Update status |
| POST | `/api/findings/bulk-update` | Bulk update |
| POST | `/api/findings/:id/feedback` | Add ML feedback |

### Gmail
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gmail/setup-status` | Check configuration |
| GET | `/api/gmail/auth-url` | Get OAuth URL |
| GET | `/api/gmail/callback` | OAuth callback |
| GET | `/api/gmail/accounts` | List connected accounts |
| DELETE | `/api/gmail/accounts/:id` | Disconnect account |
| POST | `/api/gmail/scan/:accountId` | Scan emails |

### Policy & Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/policy` | Get user policy |
| PUT | `/api/policy` | Update policy |
| GET | `/api/audit` | Get audit logs (admin) |

### ML & Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ml/status` | ML model status |
| POST | `/api/ml/test` | Test detection |
| POST | `/api/analyze-email` | Analyze email |
| GET | `/api/health` | Health check |

## Environment Variables

### Backend (.env)
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pii_monitor"

# Session
SESSION_SECRET=your-secret-key-min-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# ML
ML_ENABLED=true
CONFIDENCE_THRESHOLD=0.8

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (frontend/.env)
```bash
VITE_API_URL=http://localhost:3000/api
```

## Database Schema

Key models in the Prisma schema:

- **User** - Authentication and roles
- **Session** - Session management
- **GmailAccount** - Connected Gmail accounts with OAuth tokens
- **Email** - Processed email metadata
- **Finding** - Detected PII with status and severity
- **Policy** - User-configurable detection settings
- **AuditLog** - Activity tracking
- **Feedback** - ML training feedback

## Scripts

```bash
# Backend
npm run dev              # Development server
npm start                # Production server
npm test                 # Run tests
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio
npm run train            # Train ML model
npm run generate-data    # Generate training data

# Frontend
cd frontend
npm run dev              # Development server
npm run build            # Production build
npm run preview          # Preview build
```

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **ML**: TensorFlow.js, Natural, Compromise
- **Auth**: express-session, bcryptjs
- **Security**: Helmet, CORS, rate-limiter-flexible

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite
- **UI**: Material UI (MUI)
- **State**: TanStack Query (React Query)
- **Routing**: React Router
- **Charts**: Recharts

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)
- **Real-time**: WebSocket (ws)

## Security Features

- **Rate Limiting** - Prevents API abuse
- **Helmet** - Secure HTTP headers
- **CORS** - Configurable origins
- **Session Security** - httpOnly, secure cookies
- **Password Hashing** - bcrypt with configurable rounds
- **RBAC** - Role-based access control
- **Audit Logging** - Track all sensitive operations
- **PII Redaction** - Sensitive values masked in UI

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**Maurizio Morri** - [GitHub](https://github.com/mmorri)
