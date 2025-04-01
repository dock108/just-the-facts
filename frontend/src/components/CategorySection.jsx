import React from 'react';
import SummaryItem from './SummaryItem';

// Component to display summaries for a specific category
function CategorySection({ categoryName, summaries, isLoading }) {
  
  return (
    <section style={{ marginBottom: '2em' }}>
      <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '0.3em', marginBottom: '1em' }}>
        {categoryName}
      </h2>
      {
        isLoading ? (
          <p>Loading {categoryName} summaries...</p>
        ) : summaries && summaries.length > 0 ? (
          summaries.map((item) => {
            // Ensure item has necessary properties
            // Parse the comma-separated 'sources' string into an array of links
            const sourceLinksArray = item.sources 
              ? item.sources.split(',').map(link => link.trim()).filter(link => !!link) // Split, trim, and remove empty strings
              : []; // Default to empty array if no sources

            return (
              <SummaryItem 
                key={item.id} // Use a unique key, assuming 'id' from Supabase
                summary={item.summary} 
                sourceLinks={sourceLinksArray} // Pass the array of links
              />
            );
          })
        ) : (
          <p>No summaries available for {categoryName} today.</p>
        )
      }
    </section>
  );
}

export default CategorySection; 