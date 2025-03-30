import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Define the structure of a search result item
interface SearchResult {
  url: string;
  title?: string; // Title might be optional depending on the search tool
  snippet: string;
}

// Define the expected structure of the AI's response (as specified in prompt-engineering.md)
interface AISummaryResponse {
  summary: string;
  citations: { id: number; url: string; title: string }[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt based on docs/prompt-engineering.md
const SYSTEM_PROMPT = `You are an AI assistant. Your task is to create a detailed, unbiased, factual summary based *only* on the provided Context. Do not use any prior knowledge. The level of detail should reflect the information available in the context. For each factual statement, cite the source using an inline numerical marker (e.g., [1], [2]) corresponding to the Sources list in the Context. Output ONLY a single JSON object containing two keys: "summary" (string) and "citations" (an array of objects, each with "id", "url", and "title"). Use the titles provided in the context for the citations list.`;

/**
 * Generates a summary using OpenAI GPT-4o based on provided context.
 * @param topic The user's original topic.
 * @param searchResults An array of search result objects.
 * @returns An object containing the summary and citations, or throws an error.
 */
export async function getSummaryFromOpenAI(
  topic: string,
  searchResults: SearchResult[]
): Promise<AISummaryResponse> {
  console.log('Formatting context for OpenAI...');

  // Format the context from search results
  let context = "Context:\n";
  searchResults.forEach((result, index) => {
    // Use index + 1 for user-friendly 1-based indexing in the prompt
    context += `Source [${index + 1}]:\nURL: ${result.url}\nTitle: ${result.title || 'N/A'}\nSnippet: ${result.snippet}\n\n`;
  });

  // Construct the user prompt
  const userPrompt = `Topic: ${topic}\n\n${context}\nSummarize the key facts based *only* on the context above, citing the sources with inline markers. Remember to output ONLY the JSON object.`;

  console.log('Calling OpenAI API...');
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Or your preferred model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2, // Lower temperature for more factual/deterministic output
      response_format: { type: "json_object" }, // Request JSON output
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error('OpenAI response content is empty.');
    }

    console.log('Received OpenAI response.');

    // Parse the JSON response
    try {
      const parsedResponse: AISummaryResponse = JSON.parse(responseContent);
      // Basic validation of the parsed structure
      if (!parsedResponse.summary || !Array.isArray(parsedResponse.citations)) {
          throw new Error('Invalid JSON structure received from OpenAI.');
      }
      console.log('Successfully parsed OpenAI JSON response.');
      return parsedResponse;
    } catch (parseError) {
      console.error("Failed to parse OpenAI JSON response:", responseContent);
      throw new Error(`Failed to parse summary JSON from AI: ${parseError}`);
    }

  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    // Rethrow or handle specific errors as needed
    if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API Error: ${error.status} ${error.name} ${error.message}`);
    }
    throw new Error('Failed to get summary from OpenAI.');
  }
}
