# AI Beehive Monitoring Dashboard

This project is a modern, real-time dashboard to monitor beehive health metrics including temperature, humidity, weight, and sound. It features an interactive AI chatbot (powered by Google Gemini) for insightful analysis of sensor data and images.

This project was bootstrapped with Vite.

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

## Environment Setup

You need to set up your environment variables to run this application.

1.  Create a file named `.env` in the root of the project.
2.  Add your Google Gemini API key to this file:

    ```
    VITE_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```

    **Note:** You can get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Getting Started

1.  **Install dependencies:**
    Open your terminal in the project root and run:

    ```bash
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```

This will start the Vite development server. Open your browser and navigate to the URL provided in the terminal (usually `http://localhost:5173`). The application will reload automatically when you make changes to the code.

## Available Scripts

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run preview`: Serves the production build locally.
- `npm run lint`: Lints the codebase for potential errors.
