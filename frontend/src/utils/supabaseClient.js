import { createClient } from '@supabase/supabase-js'

// Fetch Supabase URL and Anon Key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Basic check to ensure the variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Supabase URL or Anon Key is missing.");
  console.error("Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in frontend/.env.local");
  // Optionally, throw an error or handle this case appropriately
  // throw new Error("Supabase configuration missing");
}

// Create and export the Supabase client instance
// Handle the case where keys might be missing during build/initial load gracefully
const client = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --- DEBUG LOGGING --- 
console.log("Supabase client initialized in utils:", client ? "Client OK" : "Client is NULL");
// --- DEBUG LOGGING --- 

export const supabase = client; 