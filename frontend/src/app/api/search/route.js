import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const MAX_QUERY_LENGTH = 500;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o"; // Consistent with backend

// Path to the general prompt file (relative to the project root)
const GENERAL_PROMPT_FILE_PATH = path.join(process.cwd(), 'prompts', 'general-prompt.md');

// Initialize OpenAI client (only if key is available)
let openai;
if (OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  console.error("API Route Error: OPENAI_API_KEY is not set in environment variables.");
}

// --- Helper Functions (Adapted from Python backend) ---

async function fetchSerperResults(query, numResults = 5) {
  if (!SERPER_API_KEY) {
    console.warn("API Route Warning: SERPER_API_KEY not set. Proceeding without search context.");
    return [];
  }

  const url = "https://google.serper.dev/search";
  const payload = JSON.stringify({
    q: query,
    num: numResults,
    tbs: "qdr:d" // Past 24 hours
  });
  const headers = {
    'X-API-KEY': SERPER_API_KEY,
    'Content-Type': 'application/json'
  };

  try {
    console.log(`[API Route - Serper] Fetching results for query: '${query}'...`);
    const response = await fetch(url, { 
      method: 'POST', 
      headers: headers, 
      body: payload,
      // Add timeout similar to python version if needed
      // signal: AbortSignal.timeout(10000) // Example: 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API responded with ${response.status}: ${errorText}`);
    }

    const results = await response.json();
    const organicResults = results?.organic || [];

    const structuredResults = organicResults
      .map(item => ({
        title: item?.title,
        link: item?.link,
        snippet: item?.snippet
      }))
      .filter(item => item.title && item.link && item.snippet);
      
    console.log(`[API Route - Serper] Found ${structuredResults.length} relevant results.`);
    return structuredResults;

  } catch (error) {
    console.error(`[API Route - Serper] Error during Serper API request:`, error);
    return []; // Return empty on error
  }
}

function loadGeneralPrompt() {
  try {
    console.log(`[API Route - Prompt] Loading general prompt from: ${GENERAL_PROMPT_FILE_PATH}`);
    // Use synchronous read for simplicity in API route setup phase
    // Consider async if becomes a performance bottleneck
    return fs.readFileSync(GENERAL_PROMPT_FILE_PATH, 'utf-8');
  } catch (error) {
    console.error(`[API Route - Prompt] Error reading general prompt file:`, error);
    // Return a default fallback prompt or re-throw error
    return "You are a helpful AI assistant providing concise summaries."; // Basic fallback
  }
}

async function generateSummaryForQuery(userQuery, generalPrompt, serperContext) {
  if (!openai) {
    return { summary: "Error: OpenAI client not initialized. Check server logs.", sources: [] };
  }

  let contextStr = "\n\nRelevant articles from the last 24 hours:\n";
  let sourceLinks = [];

  if (serperContext && serperContext.length > 0) {
    serperContext.forEach((item, idx) => {
      const title = item.title || 'N/A';
      const link = item.link || 'N/A';
      const snippet = item.snippet || 'N/A';
      contextStr += `${idx + 1}. Title: ${title}\n   Link: ${link}\n   Snippet: ${snippet}\n`;
      if (link !== 'N/A') {
        sourceLinks.push(link);
      }
    });
  } else {
    contextStr += "No specific articles found via Serper search. Summary will be based on general knowledge if possible, or indicate lack of information.\n";
  }

  const systemPrompt = (
    `${generalPrompt}\n\n` +
    `--- Current Task ---\n` +
    `User Query: '${userQuery}'\n` +
    `Based *only* on the provided context below (if any), generate a concise, factual summary addressing the user's query. ` +
    `If the context does not contain relevant information, state that clearly. ` +
    `The summary should be concise, potentially 2-3 paragraphs if the information warrants it, but do not artificially lengthen it with filler content. Prioritize clarity and factuality based on the context. ` +
    `Do NOT include the source URLs directly in your summary text; they will be listed separately based on the context provided.` +
    `${contextStr}\n` +
    `--- End Context ---`
  );

  const userMessage = `Please provide a summary for my query: '${userQuery}' using only the context given.`;

  try {
    console.log("[API Route - OpenAI] Generating summary...");
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 300 // Slightly increased for potentially longer summaries
    });

    const summaryText = response.choices?.[0]?.message?.content?.trim() || "Error: No summary content received from OpenAI.";
    
    console.log("[API Route - OpenAI] Summary generated successfully.");
    return { summary: summaryText, sources: sourceLinks };

  } catch (error) {
    console.error(`[API Route - OpenAI] Error calling OpenAI API:`, error);
    return { summary: `Error generating summary: ${error.message}`, sources: [] };
  }
}

// --- API Route Handler --- 

export async function POST(request) {
  try {
    const body = await request.json();
    const query = body?.query?.trim();

    // --- Input Validation ---
    if (!query) {
      return NextResponse.json({ message: 'Query parameter is required.' }, { status: 400 });
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json({ message: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.` }, { status: 400 });
    }
    // Basic sanitization check (more robust needed for production)
    if (/[<>{}]/.test(query)) {
         return NextResponse.json({ message: 'Query contains potentially disallowed characters.' }, { status: 400 });
    }

    // --- Core Logic ---
    // 1. Fetch Context with Serper
    const serperResults = await fetchSerperResults(query);

    // 2. Load General Prompt
    const generalPromptInstructions = loadGeneralPrompt();

    // 3. Generate Summary via OpenAI
    const { summary, sources } = await generateSummaryForQuery(
        query,
        generalPromptInstructions,
        serperResults
    );

    // --- Return Response ---
    return NextResponse.json({ summary, sources });

  } catch (error) {
    console.error("[API Route - Handler] Internal Server Error:", error);
    // Generic error for the client
    return NextResponse.json({ message: 'An unexpected error occurred on the server.' }, { status: 500 });
  }
} 