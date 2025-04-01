'use client'; // Required for hooks like useState, useEffect

import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient'; // Import Supabase client
import SearchBox from '../components/SearchBox';
import CategorySection from '../components/CategorySection';

// Define categories - match these with your backend categories if possible
const categories = [
  'World News', 'US News', 'Politics', 'Sports', 'Technology', 
  'Finance', 'Healthcare', 'Major Weather Events', 'Miscellaneous'
];

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
        console.log("Raw data fetched from Supabase (ordered):", data);
        if (dbError) {
          console.error("Supabase DB Error:", dbError);
        }
        // --- DEBUG LOGGING END ---

        if (dbError) {
          throw dbError;
        }

        // Group summaries, keeping only the LATEST for each category
        const latestSummariesByCategory = data.reduce((acc, summary) => {
          const category = summary.category;
          // If we haven't seen this category yet, add this summary (it's the latest due to sorting)
          if (!acc[category]) {
            acc[category] = [summary]; // Store as an array for consistency with CategorySection
          }
          // If we have seen it, do nothing (we already have the latest)
          return acc;
        }, {});

        // --- DEBUG LOGGING START ---
        console.log("Latest summary for each category:", latestSummariesByCategory);
        // --- DEBUG LOGGING END ---

        setSummaries(latestSummariesByCategory); // Set state with the filtered summaries

      } catch (err) {
        console.error("Error fetching summaries:", err);
        setError(err.message || "Failed to load summaries from database.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Simple multi-column layout (example)
  // You might want a more sophisticated CSS Grid or Flexbox setup
  const columnCount = 3; // Adjust number of columns
  const categoriesPerColumn = Math.ceil(categories.length / columnCount);

  const columns = [];
  for (let i = 0; i < columnCount; i++) {
    columns.push(
      categories.slice(i * categoriesPerColumn, (i + 1) * categoriesPerColumn)
    );
  }

  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column' }}>
      <header style={{ textAlign: 'center', margin: '2em 0' }}>
        <h1 style={{ fontSize: '3em', borderBottom: '1px solid #ccc', paddingBottom: '0.2em' }}>
          Just the Facts
        </h1>
        <p style={{ fontSize: '1.1em', color: '#555', marginTop: '0.5em' }}>
          Your daily dose of concise, factual news summaries.
        </p>
      </header>

      {/* Search Box Section */}      
      <SearchBox />

      {/* Ad Placeholder - Side (example positioning) */}      
      {/* This would likely need more complex layout integration */}
      {/* <div className="ad-placeholder ad-side" style={{ position: 'absolute', right: '20px', top: '150px' }}>Side Ad</div> */}

      {/* Daily Summaries Section */}      
      <div style={{ marginTop: '2em' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5em' }}>Today's Summaries</h2>
        
        {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}
        
        {/* Example multi-column layout - Added max-width */}        
        <div style={{ display: 'flex', flexDirection: 'row', gap: '30px', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' /* Center the container */ }}>
          {columns.map((columnCategories, colIndex) => (
            <div key={colIndex} style={{ flex: '1', minWidth: '280px' /* Adjust min-width for responsiveness */ }}>
              {columnCategories.map((category) => (
                <CategorySection 
                  key={category} 
                  categoryName={category}
                  summaries={summaries[category] || []} // Pass summaries for this category
                  isLoading={isLoading && !summaries[category]} // Show loading only if data hasn't arrived for this specific category
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

      {/* Ad Placeholder - Bottom */}      
      <div className="ad-placeholder ad-bottom">
        Bottom Banner Ad Area
      </div>
    </main>
  );
} 