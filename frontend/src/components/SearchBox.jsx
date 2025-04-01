import React, { useState } from 'react';

// Component for user query input and displaying search results
function SearchBox() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null); // To store the summary result
  const [sources, setSources] = useState([]); // To store source links
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const MAX_QUERY_LENGTH = 500;

  const handleInputChange = (event) => {
    const value = event.target.value;
    if (value.length <= MAX_QUERY_LENGTH) {
      setQuery(value);
      if (error) setError(''); // Clear error on typing
    } else {
      setError(`Query cannot exceed ${MAX_QUERY_LENGTH} characters.`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    setSources([]);

    try {
      // **IMPORTANT**: This assumes a backend API endpoint at /api/search
      // This endpoint needs to be created separately (e.g., using Next.js API routes)
      // and should execute your backend/search_query.py script.
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }), // Send sanitized query
      });

      if (!response.ok) {
        // Handle HTTP errors (like 500 from the server)
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch search results.' }));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      // Assuming the API returns { summary: "...", sources: ["url1", "url2"] }
      if (data.summary) {
        setResult(data.summary);
        setSources(data.sources || []);
      } else {
        throw new Error('Received invalid data from search API.');
      }

    } catch (err) {
      console.error("Search failed:", err);
      setError(err.message || 'An error occurred during the search.');
      setResult(null); // Clear previous results on error
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section style={{ margin: '2em 0', padding: '1.5em', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
      <h3>Search Just the Facts</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '1em' }}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Enter your query (e.g., 'latest AI developments')"
          maxLength={MAX_QUERY_LENGTH}
          aria-label="Search Query"
          style={{ flexGrow: 1, padding: '8px 12px', border: '1px solid #ccc' }}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            backgroundColor: isLoading ? '#ccc' : '#333',
            color: 'white',
            border: 'none',
            transition: 'background-color 0.2s ease'
          }}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      
      {/* Display Error */}      
      {error && <p style={{ color: 'red', fontSize: '0.9em', marginBottom: '1em' }}>Error: {error}</p>}
      
      {/* Display Loading Indicator */}      
      {isLoading && <p>Loading search results...</p>}

      {/* Display Result */}      
      {result && (
        <div style={{ marginTop: '1em', borderTop: '1px solid #eee', paddingTop: '1em' }}>
          <h4 style={{ marginBottom: '0.5em' }}>Search Result:</h4>
          <p className="text-serif">{result}</p>
          {sources.length > 0 && (
            <div style={{ marginTop: '1em' }}>
              <strong>Sources:</strong>
              <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '0.5em' }}>
                {sources.map((link, index) => (
                  <li key={index} style={{ marginBottom: '0.3em' }}>
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.85em', color: '#555' }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default SearchBox; 