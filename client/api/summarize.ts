import { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { performWebSearch } from './webSearchService';
import { getSummaryFromOpenAI } from './openaiService';

// Define the schema for the request body
const SummarizeRequestSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters long" }).max(500, { message: "Topic must be 500 characters or less" }),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get API keys from environment variables - use Vite env vars for local dev
  const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const SERPER_API_KEY = process.env.VITE_SERPER_API_KEY || process.env.SERPER_API_KEY;

  // Enhanced debug logging for API keys
  console.log(`OpenAI API Key configured: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`Serper API Key configured: ${SERPER_API_KEY ? 'Yes' : 'No'}`);

  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key is missing.');
    return res.status(500).json({ message: 'OpenAI API key is not configured.' });
  }

  if (!SERPER_API_KEY) {
    console.error('Serper API key is missing.');
    return res.status(500).json({ message: 'Search API key is not configured.' });
  }

  try {
    // 1. Validate request body
    console.log('Validating request body');
    console.log('Request body:', req.body);
    
    const validationResult = SummarizeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return res.status(400).json({ errors: validationResult.error.errors });
    }

    const { topic } = validationResult.data;
    console.log(`Received topic for summarization: "${topic}"`);

    // 2. Perform web search
    console.log(`Calling web search service for topic: "${topic}"`);
    let searchResults;
    try {
      searchResults = await performWebSearch(topic, SERPER_API_KEY);

      if (!searchResults || searchResults.length === 0) {
        console.warn('Web search returned no results for topic:', topic);
        return res.status(404).json({ message: 'No relevant information found from web search for this topic.' });
      }

      console.log(`Web search successful, found ${searchResults.length} results`);
    } catch (searchError) {
      console.error("Web search failed:", searchError);
      const message = searchError instanceof Error ? searchError.message : 'Failed to perform web search.';
      return res.status(500).json({ message });
    }

    // 3. Call OpenAI API with dynamically fetched context
    console.log('Calling OpenAI service with search results...');
    try {
      const { summary, citations } = await getSummaryFromOpenAI(topic, searchResults, OPENAI_API_KEY);
      console.log('Successfully received summary from OpenAI service.');
      console.log('Summary length:', summary.length);
      console.log('Number of citations:', citations.length);

      // 4. Send Response
      return res.status(200).json({
        summary,
        citations,
      });
    } catch (openaiError) {
      console.error("Error from OpenAI service:", openaiError);
      const message = openaiError instanceof Error ? openaiError.message : 'Failed to generate summary.';
      return res.status(500).json({ message });
    }
  } catch (error) {
    console.error("Unhandled error in summarize function:", error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return res.status(500).json({ message });
  }
} 