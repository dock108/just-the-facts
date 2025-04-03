'use client'; // Required for hooks like useState, useEffect

import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient'; // Import Supabase client
import SearchBox from '../components/SearchBox';
import CategorySection from '../components/CategorySection';
import styles from './page.module.css'; // Import the CSS Module

// Define static categories for nav bar and initial structure
const staticCategories = [
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
  // State to hold the dynamically ordered categories for columns
  const [columnCategories, setColumnCategories] = useState({ left: [], middle: [], right: [] });

  // Fetch today's summaries from Supabase when the component mounts
  useEffect(() => {
    // --- DEBUG LOGGING --- 
    console.log("useEffect hook running...");
    // --- DEBUG LOGGING --- 

    const fetchAndOrganizeSummaries = async () => {
      // --- DEBUG LOGGING --- 
      console.log("fetchAndOrganizeSummaries function started...");
      // --- DEBUG LOGGING --- 

      if (!supabase) {
        // --- DEBUG LOGGING ---
        console.error("fetchAndOrganizeSummaries: Supabase client is null!");
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

        // 1. Get the latest summary for each unique category
        const latestSummariesMap = new Map();
        data.forEach(summary => {
          const category = summary.category;
          if (category && !latestSummariesMap.has(category.toLowerCase())) {
            latestSummariesMap.set(category.toLowerCase(), {
              ...summary,
              // Calculate length for sorting
              summaryLength: summary.summary?.length || 0 
            });
          }
        });

        // Convert map values to array
        const latestSummariesArray = Array.from(latestSummariesMap.values());

        // 2. Sort summaries by length (descending)
        latestSummariesArray.sort((a, b) => b.summaryLength - a.summaryLength);

        // 3. Prepare summaries state (keyed by original Title Case category)
        const finalSummariesState = latestSummariesArray.reduce((acc, summary) => {
          // Find the original static category name (case-insensitive match)
          const originalCategoryName = staticCategories.find(staticCat => 
            staticCat.toLowerCase() === summary.category.toLowerCase()
          );
          if (originalCategoryName) {
            acc[originalCategoryName] = [summary]; // Store as an array
          }
          return acc;
        }, {});
        setSummaries(finalSummariesState);

        // 4. Distribute categories into columns
        const numMiddle = 4;
        const middleColCats = latestSummariesArray.slice(0, numMiddle).map(s => s.category);
        const remainingCats = latestSummariesArray.slice(numMiddle).map(s => s.category);
        
        // Distribute remaining between left and right
        const leftColCats = [];
        const rightColCats = [];
        remainingCats.forEach((cat, index) => {
          if (index % 2 === 0) {
            leftColCats.push(cat);
          } else {
            rightColCats.push(cat);
          }
        });

        // Find the original static category names for column arrays
        const findOriginalCase = (catList) => catList.map(catLower => 
          staticCategories.find(staticCat => staticCat.toLowerCase() === catLower.toLowerCase())
        ).filter(Boolean); // Filter out any nulls if a match wasn't found

        setColumnCategories({
          left: findOriginalCase(leftColCats),
          middle: findOriginalCase(middleColCats),
          right: findOriginalCase(rightColCats)
        });

      } catch (err) {
        console.error("Error fetching/organizing summaries:", err);
        setError(err.message || "Failed to load summaries.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndOrganizeSummaries();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Simple multi-column layout (example)
  // We now use CSS Grid defined in page.module.css
  const columnCount = 3; // Define logical columns for splitting data
  const categoriesPerColumn = Math.ceil(staticCategories.length / columnCount);

  // Split categories into logical columns for mapping
  const columnsData = [];
  for (let i = 0; i < columnCount; i++) {
    columnsData.push(
      staticCategories.slice(i * categoriesPerColumn, (i + 1) * categoriesPerColumn)
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
    padding: '8px 0',
    margin: '0', // Remove top/bottom margin
    borderTop: 'none', // Remove border
    borderBottom: '1px solid #eee', // Keep bottom border as separator
    backgroundColor: 'transparent', // Remove background
    scrollbarWidth: 'thin',
    scrollbarColor: '#ccc #f9f9f9'
  };

  const categoryButtonStyle = {
    padding: '8px 15px',
    margin: '0 5px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '0',
    backgroundColor: 'transparent',
    whiteSpace: 'nowrap',
    fontSize: '1rem',
    transition: 'color 0.2s ease',
    color: '#333'
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
          {/* Use staticCategories for nav bar consistency */}
          {staticCategories.map((category) => {
            const categoryId = generateCategoryId(category);
            return (
              <button 
                key={categoryId}
                onClick={() => scrollToCategory(categoryId)}
                style={categoryButtonStyle}
                // Add hover effect for transparent buttons
                onMouseOver={e => e.currentTarget.style.color = '#007bff'} 
                onMouseOut={e => e.currentTarget.style.color = '#333'}
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
            {/* Render Left Column */}
            <div className={styles.column}>
              {columnCategories.left.map((category) => (
                <CategorySection 
                  key={category} 
                  id={generateCategoryId(category)}
                  categoryName={category}
                  summaries={summaries[category] || []}
                  isLoading={isLoading && !summaries[category]}
                />
              ))}
            </div>
            {/* Render Middle Column (Longest) */}
            <div className={styles.column}>
              {columnCategories.middle.map((category) => (
                <CategorySection 
                  key={category} 
                  id={generateCategoryId(category)}
                  categoryName={category}
                  summaries={summaries[category] || []}
                  isLoading={isLoading && !summaries[category]}
                />
              ))}
            </div>
            {/* Render Right Column */}
            <div className={styles.column}>
              {columnCategories.right.map((category) => (
                <CategorySection 
                  key={category} 
                  id={generateCategoryId(category)}
                  categoryName={category}
                  summaries={summaries[category] || []}
                  isLoading={isLoading && !summaries[category]}
                />
              ))}
            </div>
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