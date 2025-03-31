# Just the Facts

Just the Facts is an AI-powered web application designed to provide concise, unbiased, and fact-based summaries of user-requested topics or events. Ideal for quickly obtaining clear and objective information without opinion or unnecessary detail.

## Features

- **Concise Summaries:** Quickly provides objective, factual summaries.
- **Real-time Web Search:** Uses Serper API to gather the latest information.
- **Citations Included:** Clearly referenced credible sources.
- **Easy Copy & Share:** Effortlessly copy and share summaries.
- **Responsive Design:** Optimized for seamless use on any device.
- **Privacy-Focused:** User requests are securely processed without persistent storage.

## Technology Stack

- **Frontend:** React with TypeScript
- **Styling:** Tailwind CSS
- **API:** Vercel Serverless Functions
- **Language Model:** OpenAI GPT-4o
- **Web Search:** Serper API
- **Validation:** Zod
- **Hosting:** Vercel

## Project Structure

```
just-the-facts/
├── client/                   # Frontend application
│   ├── api/                  # Vercel serverless functions
│   │   ├── health.ts         # Health check endpoint
│   │   ├── summarize.ts      # Main API endpoint
│   │   ├── openaiService.ts  # OpenAI integration
│   │   └── webSearchService.ts # Web search integration
│   ├── public/               # Static files
│   ├── src/                  # React source code
│   │   ├── App.tsx           # Main application component
│   │   ├── AdSenseUnit.tsx   # AdSense integration
│   │   └── ...               # Other components
│   ├── index.html            # HTML entry point
│   └── package.json          # Dependencies and scripts
├── docs/                     # Project documentation
└── README.md                 # Project overview
```

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- OpenAI API key
- Serper API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/just-the-facts.git
cd just-the-facts/client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the client directory and add your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
SERPER_API_KEY=your_serper_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Deployment

This project is configured for easy deployment on Vercel:

1. Push your code to GitHub
2. Create a new project on Vercel and connect your repository
3. Configure the following settings:
   - Framework Preset: Vite
   - Root Directory: client
   - Build Command: npm run build
   - Output Directory: dist
4. Add the required environment variables in Vercel:
   - OPENAI_API_KEY
   - SERPER_API_KEY
5. Deploy

## Usage

1. Enter a topic or event into the input field.
2. Click "Summarize" to generate your concise, unbiased summary.
3. Review the summary and citations provided.
4. Use the "Copy" button to copy your summary easily.

## Contributing

We welcome contributions! Please submit a Pull Request to participate.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or reach out to the maintainers.

