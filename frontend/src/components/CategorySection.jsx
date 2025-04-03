import React from 'react';
import SummaryItem from './SummaryItem';
import styles from './CategorySection.module.css'; // Import the CSS Module

// Component to display summaries for a specific category
function CategorySection({ categoryName, summaries, isLoading }) {
  
  return (
    // Use styles from the CSS module
    <section className={styles.section}>
      <h2 className={styles.heading}>
        {categoryName}
      </h2>
      {
        isLoading ? (
          <p className={styles.loadingText}>Loading {categoryName} summaries...</p>
        ) : summaries && summaries.length > 0 ? (
          summaries.map((item) => {
            // Ensure item has necessary properties
            // const sourceLinksArray = item.sources 
            //   ? item.sources.split(',').map(link => link.trim()).filter(link => !!link) // Split, trim, and remove empty strings
            //   : []; // Default to empty array if no sources

            const sourcesJsonString = item.sources || '[]'; // Re-enabled: Default to empty JSON array string

            return (
              <SummaryItem 
                key={item.id} // Use a unique key, assuming 'id' from Supabase
                summary={item.summary} 
                sourceLinks={sourcesJsonString} // Re-enabled: Pass the JSON string
              />
            );
          })
        ) : (
          <p className={styles.noSummariesText}>No summaries available for {categoryName} today.</p>
        )
      }
    </section>
  );
}

export default CategorySection; 