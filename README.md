# What is Wyse?
Wyse is a modern financial intelligence platform that brings all your Nigerian bank accounts and transactions into one unified, intelligent dashboard. With Wyse, you can instantly search, filter, and chat with your financial data using natural language—no more endless scrolling or manual reconciliation. Whether you’re a small business owner or an individual, Wyse helps you track spending, spot trends, and answer questions like “How much did I spend on supplies last month?” in seconds. By automating the tedious process of reviewing and categorizing transactions, Wyse saves you hours of painful reconciliation, reduces errors, and gives you real-time insights that empower smarter decisions and financial peace of mind.

# Wyse Backend API

This is the backend API for Wyse, a financial intelligence platform I built to help users connect multiple Nigerian bank accounts, manage transactions, and get insights using natural language AI.

## Features

- Secure user authentication (JWT, OTP)
- Multi-bank account linking via Mono API
- Real-time transaction sync and management
- Natural language search and chat over transactions (MindsDB integration)
- Support for both OpenAI and Google Gemini AI engines
- Per-user data isolation and privacy
- Automatic background sync jobs
- Robust error handling and security best practices

## Why I Built This

I wanted to create a modern, privacy-focused financial dashboard that makes it easy for anyone and business of all size to:
- See all their bank accounts and transactions in one place
- Ask questions like "How much did I spend on food last month?" and get instant answers
- Use the latest AI models for semantic search and insights

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- MindsDB (for AI features)
- OpenAI or Google Gemini API key
- Mono API credentials

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd wyse-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and fill in your config:
   ```bash
   cp env.example .env
   # Edit .env with your keys and settings
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### MindsDB Setup
- You can run MindsDB locally, with Docker, or use MindsDB Cloud.
- Make sure your `.env` has the correct host, port, and API keys for your chosen AI engine.

## API Overview

### Authentication
- `POST /api/auth/send-otp` — Send OTP for email verification
- `POST /api/auth/verify-otp` — Verify OTP
- `POST /api/auth/signup` — Register
- `POST /api/auth/signin` — Login
- `POST /api/auth/reset-passcode` — Reset passcode

### User & Account Management
- `GET /api/user/profile` — Get profile
- `PUT /api/user/profile` — Update profile
- `GET /api/user/preferences` — Get preferences
- `PUT /api/user/preferences` — Update preferences
- `POST /api/mono/exchange-code` — Link a bank account
- `GET /api/mono/account-data` — Get account info
- `GET /api/mono/transactions` — Get transactions

### AI & Insights
- `POST /api/ai/query-transactions` — Ask questions about your transactions
- `POST /api/ai/chat` — Chat with the AI about your finances
- `GET /api/ai/engines` — List available AI engines
- `POST /api/ai/switch-engine` — Switch AI engine
- `GET /api/ai/evaluate` — Evaluate your knowledge base (admin only)
- `POST /api/ai/setup` — (Re)initialize your AI setup (admin only)

## How It Works
- Every user gets a private knowledge base for their transactions (MindsDB).
- All new and existing transactions are automatically synced to the knowledge base.
- I use metadata columns for advanced filtering (date, category, amount, etc.).
- Background jobs keep everything up to date.
- You can use natural language to search, filter, and chat about your finances.

## Deployment
- For production, set `NODE_ENV=production` and use your production database and API keys.
- You can use PM2 or any process manager to keep the server running.

## Testing
```bash
npm test
```

## Contributing
This project is a personal build, but if you have ideas or spot issues, feel free to open an issue or pull request.

## License
MIT 