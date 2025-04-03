'use client'; // Required for hooks like useState, useEffect

import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient'; // Import Supabase client
import SearchBox from '../components/SearchBox';
import CategorySection from '../components/CategorySection';
import styles from './page.module.css'; // Import the CSS Module

// Define categories - match these with your backend categories if possible
const categories = [
  'World News', 'US News', 'Politics', 'Sports', 'Technology', 
  'Finance', 'Healthcare', 'Major Weather Events', 'Miscellaneous'
];

// Helper function to generate IDs
const generateCategoryId = (categoryName) => {
  return `category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
};

export default function Home() {
  // --- DEBUG LOGGING --- 
  console.log("Home component rendering...");
  // --- DEBUG LOGGING --- 

  const [summaries, setSummaries] = useState({}); // Store summaries by category
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch today's summaries from Supabase when the component mounts
  useEffect(() => {
    // --- DEBUG LOGGING --- 
    console.log("useEffect hook running...");
    // --- DEBUG LOGGING --- 

    const fetchSummaries = async () => {
      // --- DEBUG LOGGING --- 
      console.log("fetchSummaries function started...");
      // --- DEBUG LOGGING --- 

      if (!supabase) {
        // --- DEBUG LOGGING ---
        console.error("fetchSummaries: Supabase client is null!");
        setError("Supabase client not initialized. Check .env.local");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        // Removed date filtering logic
        console.log(`Fetching latest summaries for each category...`);

        // Fetch latest summaries, ordered by creation time descending
        // Consider adding a .limit() here if performance is a concern (e.g., .limit(100))
        const { data, error: dbError } = await supabase
          .from('daily_summaries')
          .select('id, category, summary, sources, created_at') // Select created_at for ordering
          // Removed .gte filter for generation_date
          .order('created_at', { ascending: false }); // Order by created_at to get latest first

        // --- DEBUG LOGGING START ---
        console.log("Raw data fetched from Supabase (ordered by created_at desc):", data);
        if (dbError) {
          console.error("Supabase DB Error during fetch:", dbError);
        }
        // --- DEBUG LOGGING END ---

        if (dbError) {
          throw dbError;
        }

        // Group summaries, keeping only the LATEST for each category
        const latestSummariesByCategory = data.reduce((acc, summary) => {
          const categoryFromDb = summary.category;
          // Standardize the key, e.g., convert to lowercase for comparison and storage
          const standardizedCategoryKey = categoryFromDb?.toLowerCase(); 
          
          if (!standardizedCategoryKey) return acc; // Skip if category is missing/null

          // If we haven't seen this standardized category key yet, add this summary 
          // (it's the latest due to sorting)
          if (!acc[standardizedCategoryKey]) {
             // Store the summary using the STANDARDIZED key, 
             // but preserve the ORIGINAL category name within the summary object itself for display
            acc[standardizedCategoryKey] = [{ ...summary, category: categoryFromDb }]; 
          }
          // If we have seen it, do nothing (we already have the latest)
          return acc;
        }, {});

        // --- DEBUG LOGGING START ---
        console.log("Latest summary selected for each category (using standardized keys):", latestSummariesByCategory);
        // Specifically log the selected US News summary if it exists (using standardized key)
        const usNewsKey = 'us news'; // Use the standardized key for lookup
        if (latestSummariesByCategory[usNewsKey]) {
          console.log("Selected 'US News' Summary Object (standardized key):", latestSummariesByCategory[usNewsKey][0]);
          console.log("Selected 'US News' Summary Text (standardized key):", latestSummariesByCategory[usNewsKey][0]?.summary);
        } else {
          console.log("'US News' category not found in the latest fetched data using standardized key.");
        }
        // --- DEBUG LOGGING END ---

        // Map the standardized keys back to the expected Title Case for component props if needed
        // Or adjust CategorySection/Map logic to handle lowercase keys
        // For simplicity now, let's assume the rest of the component logic uses the category names
        // from the `categories` array defined at the top. We need to pass the correct data.
        
        // Create the final state object using the original Title Case categories from the top array
        const finalSummariesState = categories.reduce((stateAcc, titleCaseCategory) => {
            const lowerCaseKey = titleCaseCategory.toLowerCase();
            if (latestSummariesByCategory[lowerCaseKey]) {
                // Get the summary array stored under the lowercase key
                // The summary object inside still has the original casing in its .category property
                stateAcc[titleCaseCategory] = latestSummariesByCategory[lowerCaseKey];
            }
            return stateAcc;
        }, {});
        
        console.log("Final summaries state being set (using Title Case keys):");

        setSummaries(finalSummariesState); // Set state using Title Case keys

      } catch (err) {
        console.error("Error in fetchSummaries catch block:", err);
        setError(err.message || "Failed to load summaries from database.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Simple multi-column layout (example)
  // We now use CSS Grid defined in page.module.css
  const columnCount = 3; // Define logical columns for splitting data
  const categoriesPerColumn = Math.ceil(categories.length / columnCount);

  // Split categories into logical columns for mapping
  const columnsData = [];
  for (let i = 0; i < columnCount; i++) {
    columnsData.push(
      categories.slice(i * categoriesPerColumn, (i + 1) * categoriesPerColumn)
    );
  }

  // --- Scroll Function ---
  const scrollToCategory = (categoryId) => {
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start', // Align the top of the element to the top of the scroll container
      });
    }
  };

  // Define styles for ad placeholders
  const adRightStyle = {
    width: '200px', // Adjust width as needed
    height: '600px', // Adjust height as needed
    border: '1px dashed #ccc',
    backgroundColor: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    color: '#666',
    position: 'sticky', // Make it sticky relative to the main container
    top: '20px', // Adjust top spacing as needed
    alignSelf: 'flex-start' // Keep it at the top of the container flex space
  };

  const adBottomStyle = {
    position: 'fixed', // Fix position relative to the viewport
    bottom: 0,
    left: 0,
    width: '100%',
    height: '90px', // Adjust height as needed
    backgroundColor: 'rgba(240, 240, 240, 0.9)', // Slightly transparent background
    borderTop: '1px solid #ccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    color: '#333',
    zIndex: 1000, // Ensure it stays above other content
    boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' // Optional shadow for separation
  };

  const mainContainerStyle = {
    display: 'flex',
    gap: '20px' // Add space between main content and right ad
  };

  const contentAreaStyle = {
    flex: 1 // Allow the main content area to grow
  };

  const categoryNavStyle = {
    display: 'flex',
    overflowX: 'auto',
    padding: '6px 0', // Even smaller padding
    margin: '0.25em 0', // Minimal top/bottom margin
    borderTop: '1px solid #eee',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    scrollbarWidth: 'thin',
    scrollbarColor: '#ccc #f9f9f9'
  };

  const categoryButtonStyle = {
    padding: '8px 15px',
    margin: '0 5px',
    cursor: 'pointer',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    whiteSpace: 'nowrap', // Prevent wrapping
    fontSize: '0.9rem',
    transition: 'background-color 0.2s ease, border-color 0.2s ease'
  };

  return (
    // Apply flex container style to the wrapper around main content and right ad
    <div style={mainContainerStyle}>
      
      {/* Main Content Area */}
      <main className={styles.main} style={contentAreaStyle}>
        <header className={styles.header}> 
          <h1 className={styles.mainHeading}>
            Just the Facts
          </h1>
          <p className={styles.tagline}>
            Your daily dose of concise, factual news summaries.
          </p>
        </header>

        {/* --- Category Navigation Bar --- */}
        <nav style={categoryNavStyle} aria-label="Category quick links">
          {categories.map((category) => {
            const categoryId = generateCategoryId(category);
            return (
              <button 
                key={categoryId}
                onClick={() => scrollToCategory(categoryId)}
                style={categoryButtonStyle}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#eee'} // Simple hover effect
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                {category}
              </button>
            );
          })}
        </nav>

        {/* Search Box Section - Assuming it exists and is styled separately */}
        <SearchBox />

        {/* Daily Summaries Section - Use summariesSection class */}
        {/* We hide the overall h2 summariesHeading via CSS now */}
        <div className={styles.summariesSection}>
          {/* <h2 className={styles.summariesHeading}>Today's Summaries</h2> */}
          
          {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}
          
          {/* Column Layout - Use columnLayout class */}
          {/* We map over the logical columnsData to distribute categories into the grid columns */}        
          <div className={styles.columnLayout}>
            {columnsData.map((columnCategories, colIndex) => (
              // Each iteration here represents categories intended for ONE logical column,
              // but they will flow into the CSS Grid columns automatically.
              // We don't need an explicit .column div here if CSS grid handles placement.
              // However, keeping it might be useful for future styling or structure.
              <div key={colIndex} className={styles.column}>
                {columnCategories.map((category) => (
                  <CategorySection 
                    key={category} 
                    // --- Assign the generated ID --- 
                    id={generateCategoryId(category)}
                    categoryName={category}
                    summaries={summaries[category] || []} // Use summaries state variable
                    isLoading={isLoading && !summaries[category]} // Use summaries state variable
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Fallback if loading completes but no summaries are found at all */}
          {!isLoading && !error && Object.keys(summaries).length === 0 && (
             <p style={{ textAlign: 'center', marginTop: '2em', color: '#666' }}>
               No summaries found for today. Check back later!
             </p>
          )}
        </div>
        {/* Add padding to the bottom of main content to prevent overlap with fixed ad */}
        <div style={{ paddingBottom: `${adBottomStyle.height + 20}px` }}></div> 
      </main>

      {/* Right Ad Placeholder */}
      <aside style={adRightStyle}>
        Right Banner Ad (200x600)
      </aside>

      {/* Bottom Ad Placeholder - Placed outside the flex container to be fixed relative to viewport */}
      <div style={adBottomStyle}>
        Bottom Banner Ad (Fixed)
      </div>
    </div>
  );
} 