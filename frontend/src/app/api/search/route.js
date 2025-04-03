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
    `${generalPrompt}\\n\\n` +
    `--- Current Task ---\\n` +
    `User Query: \'${userQuery}\'\\n` +
    `CONTEXT:\\n${contextStr}\\n` +
    `--- End Context ---\\n\\n` +
    `Based *only* on the provided context above (if any), generate a newspaper-style summary addressing the user\'s query. ` +
    `Follow the newspaper format exactly: start with a bold header, use footnote references \`[^1^]\`, \`[^2^]\`, etc. within paragraphs. ` +
    `End with a 'Sources:' section. This section MUST start with the heading 'Sources:' on its own line. ` +
    `Each source cited in the text MUST be listed on a **separate new line** immediately following the 'Sources:' heading. ` +
    `Each source line MUST follow the exact format: \`[^NUMBER^]: [Short Description](URL)\`. ` +
    `Example of the required Sources section format:\\n` +
    `Sources:\\n` +
    `[^1^]: [Article Title 1](https://example.com/1)\\n` +
    `[^2^]: [Article Title 2](https://example.com/2)\\n` +
    `Ensure the output adheres strictly to this formatting. Do NOT deviate from the specified Sources format. ` +
    `If the context does not contain relevant information, use the format for insufficient information. ` +
    `Present ONLY factual information from the context provided.`
  );

  const userMessage = `Please provide a newspaper-style summary for my query: \'${userQuery}\' using only the context given, adhering strictly to the specified footnote and "Sources:" section formatting.`;

  try {
    console.log("[API Route - OpenAI] Generating newspaper-style summary...");
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 600 // Increased for footnote formatting
    });

    const summaryText = response.choices?.[0]?.message?.content?.trim() || "Error: No summary content received from OpenAI.";
    
    console.log("[API Route - OpenAI] Newspaper-style summary generated successfully.");
    
    // We're no longer separately returning sourceLinks since they're now embedded in the summary
    // with the [¹]: [Short Header](URL) format
    return { 
      summary: summaryText,
      sources: [] // Empty since sources are now embedded in the summary text
    };

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