import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables from .env.local
config({ path: '.env.local' });

const app = express();
const port = 3001;

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Register API route handlers
const routeFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.ts') && file !== 'dev-server.js' && file !== 'webSearchService.ts' && file !== 'openaiService.ts');

console.log('Available API routes:');
routeFiles.forEach(file => {
  const routeName = file.replace('.ts', '');
  console.log(`- /api/${routeName}`);
});

// Define routes based on the API files
app.all('/api/:handler', async (req, res) => {
  const { handler } = req.params;
  const handlerFile = `${handler}.ts`;
  
  if (!routeFiles.includes(handlerFile)) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  try {
    // Dynamically import the handler module (this won't actually work with TypeScript directly)
    // In a real setup, you'd compile the TypeScript files first
    console.log(`Importing handler: ${handler}`);
    console.log('Environment variables:', {
      OPENAI_KEY: process.env.VITE_OPENAI_API_KEY ? 'Set' : 'Not set',
      SERPER_KEY: process.env.VITE_SERPER_API_KEY ? 'Set' : 'Not set'
    });
    
    // For testing, we'll just return a mock response
    if (handler === 'health') {
      return res.json({ status: 'UP' });
    } else if (handler === 'summarize') {
      return res.json({
        summary: 'This is a mock summary from the development server.',
        citations: [
          { id: 1, url: 'https://example.com', title: 'Example Source' }
        ]
      });
    } else {
      return res.status(501).json({ error: 'Not implemented yet' });
    }
  } catch (error) {
    console.error(`Error in handler ${handler}:`, error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Development API server running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 