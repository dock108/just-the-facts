import React from 'react';

// Component to display a single summary item and its sources
function SummaryItem({ summary, sourceLinks }) {
  // Basic check for essential props
  if (!summary) {
    console.warn('SummaryItem missing summary', { summary });
    return null;
  }

  // Ensure sourceLinks is an array, even if empty
  const links = Array.isArray(sourceLinks) ? sourceLinks : [];

  return (
    <div style={{ marginBottom: '1.5em', borderBottom: '1px solid #eee', paddingBottom: '1em' }}>
      <p className="text-serif" style={{ marginBottom: '0.5em' }}>
        {summary}
      </p>
      {/* Render sources only if the array is not empty */}      
      {links.length > 0 && (
        <div style={{ marginTop: '0.5em' }}>
          <strong style={{ fontSize: '0.9em', color: '#444' }}>Sources:</strong>
          <ul style={{ listStyle: 'decimal inside', paddingLeft: '0', marginTop: '0.2em' }}>
            {links.map((link, index) => {
              // Basic validation
              if (!link || typeof link !== 'string' || !link.startsWith('http')) {
                return null; // Skip rendering invalid links
              }
              // Format display text: remove protocol prefix
              const displayLink = link.replace(/^https?:\/\//, '');
              
              return (
                <li key={index} style={{ marginBottom: '0.2em' }}>
                  <a 
                    href={link} // Keep the full URL for the actual link
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ fontSize: '0.85em', color: '#555' }}
                  >
                    {displayLink} {/* Display the formatted link text */}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SummaryItem; 