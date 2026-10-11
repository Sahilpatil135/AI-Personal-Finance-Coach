# AI Personal Finance Coach

AI-powered personal finance coach designed specially for students. This application simplifies budgeting, spending tracking, and financial goal-setting through an interactive AI chatbot.

## 🚀 Features

- **AI Chatbot**: Powered by **Gemini AI** for intelligent financial guidance.
- **Budget Management**: Create and track monthly budgets for different categories.
- **Expense Tracking**: Log expenses on-the-go and monitor where your money goes.
- **Financial Goals**: Set savings goals and track your progress.
- **Insights & Reports**: Visual charts and summaries to understand your spending habits.

## 🛠️ Tech Stack

- **Frontend**: React, Vite
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (`pg`)
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini API
- **Authentication**: JWT

## 🏃 Getting Started

### Prerequisites

- Node.js
- npm or yarn
- PostgreSQL

### Installation

1. Install and configure the backend:
   ```bash
   cd server
   npm install
   ```
   Create `server/.env` with `DATABASE_URL`, `SECRET_KEY`, and optionally `FRONTEND_URL` and `PORT`.

2. Start the backend:
   ```bash
   npm run dev
   ```

3. In another terminal, start the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Configure `client/.env` with `VITE_GEMINI_API_KEY` if using the Gemini chatbot.

   The backend listens on `http://localhost:8000` by default, matching the frontend API client.

## 📂 Project Structure

```
server/src/
├── api/              # Express route handlers
├── auth/             # JWT authentication middleware
├── database/         # PostgreSQL pool and schema setup
├── schemas/          # Request validation
├── services/         # Finance and authentication services
└── utils/            # Shared helpers

client/src/
├── components/       # Reusable UI components
├── pages/            # Page components (Dashboard, Budget, etc.)
├── services/         # API and service integrations
└── App.jsx           # Main application component
```

## 🔐 API Key Security

Keep the Gemini key in `client/.env` and backend credentials in `server/.env`. These files should not be committed to version control.

## How To Run The Project

1. On the first terminal, enter `cd server` and run `npm run dev`.

2. On the second terminal, enter `cd client` and run `npm run dev`.