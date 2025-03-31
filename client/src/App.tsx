import { useState, useCallback } from 'react'
import './App.css'
import AdSenseUnit from './AdSenseUnit'

// Helper function to render summary with inline citation links
const renderSummaryWithCitations = (summary: string, citations: { id: number; url: string; title: string }[]) => {
  // Simple regex to find markers like [1], [12], etc.
  const citationRegex = /\[(\d+)\]/g;
  const parts = summary.split(citationRegex);

  return parts.map((part, index) => {
    // Even indices are regular text parts
    if (index % 2 === 0) {
      return part;
    } else {
      // Odd indices are the captured citation numbers (as strings)
      const citationId = parseInt(part, 10);
      const citation = citations.find(c => c.id === citationId);

      if (citation) {
        // Return a link (or potentially just styled text)
        // Linking to the citation in the list below might require IDs on list items
        return (
          <sup key={index} className="text-[#2E86AB] font-semibold mx-0.5">
            <a
              href={citation.url} // Link directly to the source URL
              target="_blank"
              rel="noopener noreferrer"
              title={`${citation.title || citation.url}`}
              className="hover:underline"
            >
              [{citationId}]
            </a>
          </sup>
        );
      } else {
        // If citation ID not found in the list, render the marker as text
        return `[${part}]`;
      }
    }
  });
};

function App() {
  const [topic, setTopic] = useState('');
  const [summary, setSummary] = useState('');
  const [citations, setCitations] = useState<{ id: number; url: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  const handleSummarize = async () => {
    setIsLoading(true);
    setError(null);
    setSummary('');
    setCitations([]);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.summary) {
          setSummary(data.summary);
          setCitations(data.citations || []);
        } else {
          throw new Error('Received invalid data from server.');
        }
      } else {
        throw new Error('Failed to fetch summary. Please try again.');
      }

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle copying text to clipboard
  const handleCopyToClipboard = useCallback(() => {
    if (!summary) return; // Don't copy if there's no summary

    navigator.clipboard.writeText(summary) // Use the raw summary text
      .then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000); // Reset after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        // Optionally show an error message to the user
        setError('Failed to copy summary.');
        setTimeout(() => setError(null), 3000);
      });
  }, [summary]); // Dependency on summary

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8 font-['Montserrat']">
      <header className="w-full max-w-3xl mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-center text-gray-800">Just the Facts</h1>
      </header>

      <main className="w-full max-w-3xl flex-grow flex flex-col items-center">
        {/* Input Section */}
        <div className="w-full mb-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-[#2E86AB] focus:border-[#2E86AB] resize-none text-gray-900 bg-white placeholder-gray-500 text-base"
            rows={4}
            placeholder="Enter topic or event..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isLoading}
          />
          <button
            className="w-full mt-4 bg-[#2E86AB] text-white py-2.5 px-4 rounded-md hover:bg-[#256A88] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F6C85F] disabled:opacity-50 transition duration-150 ease-in-out font-semibold text-lg shadow-sm disabled:shadow-none disabled:cursor-not-allowed"
            onClick={handleSummarize}
            disabled={isLoading || !topic.trim()}
          >
            {isLoading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center text-gray-600 my-6">
            <p className="mb-2">Searching sources and generating summary...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2E86AB] mx-auto"></div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="w-full p-4 mb-6 bg-red-100 border border-red-300 text-red-800 rounded-lg shadow-sm">
            <p><strong>Error:</strong> {error}</p>
          </div>
        )}

        {/* Output Section */}
        {!isLoading && summary && (
          <div className="w-full p-6 mb-6 border border-gray-200 rounded-lg bg-white shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Summary</h2>
              <button
                onClick={handleCopyToClipboard}
                className="px-3 py-1 text-sm bg-[#F6C85F] text-black rounded-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2E86AB] transition duration-150 ease-in-out shadow-sm"
              >
                {copyButtonText}
              </button>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap mb-6 text-base leading-relaxed">
              {renderSummaryWithCitations(summary, citations)}
            </p>

            {/* Citations list */}
            {citations.length > 0 && (
              <div className="mt-6 border-t border-gray-300 pt-4">
                <h3 className="text-xl font-semibold mb-3 text-gray-800">Sources</h3>
                <ul className="space-y-2">
                  {citations.map((cite) => (
                    <li key={cite.id} id={`citation-${cite.id}`} className="text-sm text-gray-600 break-words">
                       <span className="font-semibold text-gray-700">[{cite.id}]</span>
                       <a
                        href={cite.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[#2E86AB] hover:underline hover:text-[#F6C85F]"
                      >
                         {cite.title || cite.url}
                       </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* About Section (Only show if not loading and no summary displayed yet) */}
        {!isLoading && !summary && (
            <div className="w-full p-6 mb-6 border border-gray-200 rounded-lg bg-white shadow-md text-gray-700">
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">About Just the Facts</h2>
                <p className="mb-2 text-base leading-relaxed">
                    Enter any topic or event, and get a concise, unbiased summary based on real-time web search results.
                </p>
                <p className="text-base leading-relaxed">
                    Facts are cited with links to the sources used. Designed for quick, objective information.
                </p>
            </div>
        )}

      </main>

      {/* Footer with Ad Banner */}
      <footer className="w-full max-w-2xl mt-8 p-4 border-t border-gray-200 flex justify-center">
        {/* ToneSmith Bottom Banner Ad */}
        <AdSenseUnit adClient="ca-pub-4047556293825006" adSlot="7993973845" />
      </footer>
    </div>
  )
}

export default App
