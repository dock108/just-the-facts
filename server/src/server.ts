import express, { Request, Response, Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { z } from 'zod'; // Import zod
// Potentially import web search tool/API client here if needed
import { getSummaryFromOpenAI } from './openaiService'; // Import the OpenAI service
import { performWebSearch } from './webSearchService'; // Import the new search service
// Import or define web_search tool interaction logic
// This might involve calling a function that wraps the tool call
// For now, assume direct access/call simulation within the handler

// Load environment variables
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3001; // Default to 3001 if PORT not in .env

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Define the schema for the request body
const SummarizeRequestSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters long" }).max(500, { message: "Topic must be 500 characters or less" }),
});

// Simple route for testing
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'UP' });
});

// Summarize endpoint
app.post('/api/summarize', async (req: Request, res: Response) => {
  // 1. Validate request body
  const validationResult = SummarizeRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ errors: validationResult.error.errors });
  }

  const { topic } = validationResult.data;

  console.log(`Received topic for summarization: ${topic}`);

  try {
    // 2. Perform REAL-TIME Web Search using the service
    console.log(`Calling web search service for: ${topic}`);
    let searchResults;
    try {
      // **** Call the actual web search service ****
      const rawSearchResults = await performWebSearch(topic);

      if (!rawSearchResults || rawSearchResults.length === 0) {
        console.warn('Web search service returned no results for topic:', topic);
        throw new Error('No relevant information found from web search for this topic.');
      }

      // Assign results to the outer scope variable
      searchResults = rawSearchResults;

      console.log(`Web search successful, passing ${searchResults.length} results to AI:`, searchResults);

    } catch (searchError) {
      console.error("Web search failed:", searchError);
      const message = searchError instanceof Error ? searchError.message : 'Failed to perform web search.';
      throw new Error(message); // Propagate the error
    }

    // 3. Call OpenAI API with dynamically fetched context
    console.log('Calling OpenAI service...');
    const { summary, citations } = await getSummaryFromOpenAI(topic, searchResults);
    console.log('Received summary and citations from OpenAI service.');

    // 4. Send Response
    res.json({
      summary: summary,
      citations: citations,
    });

  } catch (error) {
    console.error("Error processing summarization request:", error);
    // Send a more informative error message based on the caught error
    const message = error instanceof Error ? error.message : 'Failed to generate summary.';
    res.status(500).json({ message });
  }
});

// Export the Express app for Vercel
export default app;
