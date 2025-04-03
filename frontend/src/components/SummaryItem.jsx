import React from 'react';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import styles from './SummaryItem.module.css'; // Import the CSS Module

// Component displays summary text (which includes Markdown footnotes)
function SummaryItem({ summary }) { // Removed sourceLinks prop
  // Basic check for essential props
  if (!summary) {
    console.warn('SummaryItem missing summary');
    return null;
  }

  // The source links are now embedded within the summary Markdown,
  // so we don't need to parse the separate sourceLinks prop anymore.

  return (
    // Use styles from the CSS module
    <div className={styles.itemContainer}>
      {/* Render the summary using ReactMarkdown */}
      <ReactMarkdown
        // Use summaryText class, remove inline style, keep global text-serif if needed
        className={`${styles.summaryText} text-serif`}
        // Configure link handling: open in new tab
        components={{
          a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
        }}
      >
        {summary}
      </ReactMarkdown>
      
      {/* The sources list is now part of the rendered Markdown */}
      {/* Remove the old sources list rendering logic */}
      
    </div>
  );
}

export default SummaryItem; 