import axios from 'axios';

// Define the structure we want to return
export interface SearchResultItem {
  url: string;
  title: string;
  snippet: string;
}

// Define structure of Serper API organic result item (based on their documentation)
interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  // Add other fields if needed
}

// Define structure of Serper API response
interface SerperResponse {
  organic: SerperOrganicResult[];
  // Add other fields like 'searchParameters', 'relatedSearches' if needed
}

const SERPER_API_URL = 'https://google.serper.dev/search';

/**
 * Performs a web search using the Serper.dev API.
 * @param query The search query string.
 * @returns A promise that resolves to an array of search result items.
 * @throws An error if the API key is missing or the search fails.
 */
export async function performWebSearch(query: string, apiKey: string): Promise<SearchResultItem[]> {
  if (!apiKey) {
    console.error('SERPER_API_KEY is missing.');
    throw new Error('Search API key is not configured.');
  }

  console.log(`Performing Serper web search for query: "${query}"`);

  try {
    console.log('Making request to Serper API...');
    const response = await axios.post<SerperResponse>(
      SERPER_API_URL,
      {
        q: query,
        num: 10 // Request up to 10 results
      },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // Increased timeout to 15 seconds
      }
    );

    console.log('Received response from Serper API');
    
    if (response.data && response.data.organic) {
      console.log(`Serper search returned ${response.data.organic.length} organic results.`);
      // Map the Serper results to our desired format
      const results = response.data.organic.map(item => ({
        url: item.link,
        title: item.title || 'Untitled',
        snippet: item.snippet || 'No snippet available.'
      }));
      
      console.log('First result title:', results[0]?.title || 'No results');
      return results;
    } else {
      console.warn('Serper API returned unexpected response structure:', JSON.stringify(response.data).substring(0, 200) + '...');
      return []; // Return empty array if no organic results
    }

  } catch (error) {
    console.error('Error calling Serper API:', error);
    if (axios.isAxiosError(error)) {
      // Log more details for Axios errors
      if (error.code === 'ECONNABORTED') {
        console.error('Serper API request timed out');
        throw new Error('Web search request timed out. Please try again.');
      }
      
      console.error('Serper API request failed');
      console.error('Status:', error.response?.status);
      console.error('Status text:', error.response?.statusText);
      console.error('Response data:', error.response?.data);
      
      if (error.response?.status === 429) {
        throw new Error('Web search service is currently rate limited. Please try again in a few minutes.');
      }
      
      throw new Error(`Web search failed: ${error.response?.data?.message || error.message}`);
    }
    throw new Error('An unexpected error occurred during web search.');
  }
} 