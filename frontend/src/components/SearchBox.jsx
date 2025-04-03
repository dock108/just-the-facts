import React, { useState } from 'react';

// Component for user query input and displaying search results in newspaper style
function SearchBox() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null); // To store the summary result
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

    try {
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
      
      // The API now returns { summary: "..." } with embedded footnotes and sources
      if (data.summary) {
        setResult(data.summary);
      } else {
        throw new Error('Received invalid data from search API.');
      }

    } catch (err) {
      console.error("Search failed:", err);
      setError(err.message || 'An error occurred during the search.');
      setResult(null); // Clear previous results on error
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to convert markdown links in footnotes to HTML
  const convertMarkdownLinks = (text) => {
    if (!text) return '';

    // 1. Process headers with ** to make them bold
    let processedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. Process inline footnote references like [^1^] or [1]
    // Makes them superscript
    processedText = processedText.replace(/\[\^?(\d+)\^?\]/g, 
      '<sup class="footnote-ref">$1</sup>');

    // 3. Process the source list lines.
    // Handles both [^1^]: [Desc](URL) and 1: [Desc](URL) formats.
    // It looks for a line starting with optional [^, a number, ^], :, optional whitespace,
    // then the markdown link [Desc](URL).
    processedText = processedText.replace(/^\s*\[?\^?(\d+)\^?\]?:\s*\[(.*?)\]\((https?:\/\/[^()]+)\)/gm, 
      '<sup class="footnote-source-num">$1</sup>: <a href="$3" target="_blank" rel="noopener noreferrer">$2</a>');

    // 4. Process any remaining standard markdown links [text](url) that weren't part of a source line
    processedText = processedText.replace(/\[(.*?)\]\((https?:\/\/[^()]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 5. Fallback for malformed source lines that might just have number: and no link (to prevent rendering raw markdown)
    // This will just render the number as superscript followed by colon.
    processedText = processedText.replace(/^\s*\[?\^?(\d+)\^?\]?:/gm, 
      '<sup class="footnote-source-num">$1</sup>:');

    return processedText;
  };

  // Process the text into sections: paragraphs and sources
  const processSearchResult = () => {
    if (!result) return { paragraphs: [], sources: [] }; // Return empty array for sources
    
    const parts = result.split(/Sources:/i);
    const mainContent = parts[0].trim();
    const sourcesSection = parts.length > 1 ? parts[1].trim() : '';
    
    // Split the main content by double newlines to get paragraphs
    const paragraphs = mainContent.split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
      
    // Split the sources section by newline to get individual source lines
    const sourcesLines = sourcesSection.split(/\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return { 
      paragraphs, 
      sources: sourcesLines // Return array of source lines
    };
  };

  const { paragraphs, sources } = result ? processSearchResult() : { paragraphs: [], sources: [] };

  return (
    <section className="search-section" style={{ 
      margin: '2em 0', 
      padding: '1.5em', 
      borderTop: '3px solid #333',
      borderBottom: '1px solid #ddd',
      backgroundColor: '#f9f9f9' 
    }}>
      <h3 style={{ 
        fontSize: '1.4rem', 
        fontWeight: 'bold',
        marginBottom: '1em',
        fontFamily: 'Georgia, serif'
      }}>Search Just the Facts</h3>
      
      <form onSubmit={handleSubmit} style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '1.5em' 
      }}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Enter your search query (e.g., 'latest AI developments')"
          maxLength={MAX_QUERY_LENGTH}
          aria-label="Search Query"
          style={{ 
            flexGrow: 1, 
            padding: '10px 12px', 
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !query.trim()}
          style={{
            padding: '10px 15px',
            cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
            backgroundColor: isLoading ? '#ccc' : '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
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

      {/* Display Result in Newspaper Style */}      
      {result && (
        <div className="search-results newspaper-style" style={{ 
          marginTop: '1.5em', 
          fontFamily: 'Georgia, serif',
          lineHeight: '1.6'
        }}>
          {paragraphs.map((paragraph, index) => {
            // Check if this is likely a header (starts with ** or contains **)
            const isHeader = /^\*\*.*\*\*/.test(paragraph);
            
            return isHeader ? (
              // Render header with newspaper styling
              <h4 
                key={`header-${index}`} 
                style={{
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  marginTop: index > 0 ? '1.5em' : '0',
                  marginBottom: '0.75em',
                  fontFamily: 'Georgia, serif'
                }}
                dangerouslySetInnerHTML={{ __html: convertMarkdownLinks(paragraph) }}
              />
            ) : (
              // Render paragraph with newspaper styling
              <p 
                key={`para-${index}`}
                style={{
                  marginBottom: '1em',
                  textAlign: 'justify',
                  fontSize: '1rem'
                }}
                dangerouslySetInnerHTML={{ __html: convertMarkdownLinks(paragraph) }}
              />
            );
          })}
          
          {/* Display Sources with proper formatting */}
          {sources && sources.length > 0 && ( // Check if sources array has items
            <div className="sources-section" style={{ 
              marginTop: '1.5em',
              paddingTop: '1em',
              borderTop: '1px solid #ddd',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              <h5 style={{ 
                fontWeight: 'bold', 
                marginBottom: '0.5em',
                fontSize: '1rem'
              }}>Sources:</h5>
              <div 
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25em' 
                }}>
                {/* Map over the sources array and render each line */}  
                {sources.map((sourceLine, index) => (
                  <div 
                    key={`source-${index}`}
                    dangerouslySetInnerHTML={{ __html: convertMarkdownLinks(sourceLine) }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default SearchBox; 