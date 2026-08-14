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
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini API
- **Storage**: LocalStorage (Session-based)

## 🏃 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd AI-Personal-Finance-Coach
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. Run the application:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

## 📂 Project Structure

```
src/
├── components/       # Reusable UI components
├── pages/            # Page components (Dashboard, Budget, etc.)
├── services/         # API and service integrations
├── utils/            # Utility functions
└── App.jsx           # Main application component
```

## 🔐 API Key Security

Your Gemini API key is stored in the `.env` file. It is **NOT** committed to version control. Always ensure that `.env` is included in your `.gitignore` file.
