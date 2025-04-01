# Just the Facts - Frontend

This directory contains the frontend code for the "Just the Facts" web application, built with Next.js and React.

## Features

*   Displays daily news summaries fetched from a Supabase backend.
*   Organizes summaries by category in a multi-column layout.
*   Includes a search bar to query for specific topics (requires a backend API endpoint).
*   Minimalist, newspaper-inspired design.
*   Responsive layout for different screen sizes.
*   Placeholders for advertisements.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Database Client:** [Supabase JS Client](https://supabase.com/docs/library/js/getting-started)
*   **Styling:** Global CSS (minimalist)

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   A running Supabase instance with the `daily_summaries` table.
*   API keys for Supabase.

### Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    *   Rename the `.env.local.example` file (if you create one) or create a new file named `.env.local` in the `frontend` directory.
    *   Add your Supabase credentials:
        ```
        NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
        Replace the placeholders with your actual Supabase URL and Anon Key. These keys are safe for browser exposure according to Supabase documentation.

### Running the Development Server

1.  **Start the development server:**
    ```bash
    npm run dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) (or the port indicated in your terminal) in your browser to see the application.

## Project Structure

```
frontend/
├── public/           # Static assets
├── src/
│   ├── app/          # Next.js App Router files
│   │   ├── globals.css # Global styles
│   │   ├── layout.js   # Root layout
│   │   └── page.js     # Main page component
│   ├── components/     # Reusable React components
│   │   ├── CategorySection.jsx
│   │   ├── SearchBox.jsx
│   │   └── SummaryItem.jsx
│   └── utils/          # Utility functions
│       └── supabaseClient.js # Supabase client initialization
├── .env.local        # Local environment variables (Supabase keys - MUST BE CREATED)
├── next.config.mjs   # Next.js configuration
├── package.json      # Project dependencies and scripts
└── README.md         # This file
```

## Important Notes

*   **Search Functionality:** The search box currently calls a placeholder endpoint `/api/search`. You need to implement this API endpoint in your backend (e.g., using Next.js API Routes, Flask, FastAPI) to execute the `backend/search_query.py` script and return the results (summary and sources) in JSON format.
*   **Supabase Table:** Assumes a Supabase table named `daily_summaries` with columns like `id`, `category`, `summary`, `sources`, and `generation_date` (timestamptz).
*   **Styling:** Uses basic inline styles and global CSS. For larger applications, consider CSS Modules or a UI library.
