# backend/main.py
# This script integrates OpenAI to generate daily news summaries based on prompts
# and stores them in a Supabase database.

# --- Installation Instructions ---
# 1. Ensure Python is installed.
# 2. Navigate to the project root directory (where requirements.txt is).
# 3. Create and activate a virtual environment (recommended):
#    python -m venv venv
#    source venv/bin/activate  # On Windows use venv\Scripts\activate
# 4. Install dependencies:
#    pip install -r requirements.txt
# 5. Ensure you have a .env file inside the 'backend' directory with your keys:
#    OPENAI_API_KEY=your_openai_key
#    SUPABASE_URL=your_supabase_project_url
#    SUPABASE_KEY=your_supabase_anon_key
#    SERPER_API_KEY=your_serper_api_key
# 6. Update SUPABASE_URL in .env with your actual Supabase project URL.
# 7. Run the script from the project root directory:
#    python backend/main.py
# ---

import os
import re
import json  # Added for Serper API interaction
from datetime import date, datetime
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
import requests  # Added for Serper API requests

# --- Configuration ---
# Load environment variables from .env file located in the same directory as the script
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Use the anon key
SERPER_API_KEY = os.getenv("SERPER_API_KEY")  # Load Serper Key

# Load model from .env or use default
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o")  # Default to gpt-4o if not set

# Adjust the path to be relative to the script's location
PROMPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'prompts')
DAILY_PROMPTS_FILE = os.path.join(PROMPTS_DIR, "daily-prompts.md")

# Supabase Table Schema Definition (for reference)
# Table Name: daily_summaries
# Columns:
#   id: bigint (auto-incrementing primary key)
#   created_at: timestamp with time zone (default: now())
#   generation_date: timestamptz (index)
#   category: text (index)
#   summary: text
#   sources: text (optional, depends on prompt/model output)

# --- OpenAI Client Initialization ---
# (Adding this function back as it seemed to be removed)
def initialize_openai_client() -> OpenAI:
    """Initializes and returns the OpenAI client."""
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not found in backend/.env file.")
        exit(1)
    return OpenAI(api_key=OPENAI_API_KEY)

# --- Serper API Integration ---

def fetch_serper_results(query: str, num_results: int = 5) -> list[dict]:
    """
    Fetches real-time search results from Serper API based on a given query.

    Args:
        query (str): Search query.
        num_results (int): Number of results to fetch (default 5).

    Returns:
        list[dict]: A structured list of top relevant articles containing
                    'title', 'link', and 'snippet'. Returns empty list on error.
    """
    if not SERPER_API_KEY:
        print("Error: SERPER_API_KEY not found in backend/.env file. Skipping search.")
        return []

    url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": query,
        "num": num_results,
        "tbs": "qdr:d"  # Restrict search to the past 24 hours (d=day)
    })
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    try:
        print(f"  [Serper] Fetching results for query: '{query}'")
        response = requests.post(url, headers=headers, data=payload, timeout=10)  # Added timeout
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        results = response.json()
        organic_results = results.get('organic', [])  # Get the list of organic results

        # Structure the results
        structured_results = [
            {
                "title": item.get('title'),
                "link": item.get('link'),
                "snippet": item.get('snippet')
            }
            for item in organic_results if item.get('title') and item.get('link') and item.get('snippet')
        ]
        print(f"  [Serper] Found {len(structured_results)} relevant results.")
        return structured_results

    except requests.exceptions.RequestException as e:
        print(f"Error during Serper API request: {e}")
        return []
    except json.JSONDecodeError:
        print("Error decoding Serper API response.")
        return []
    except Exception as e:
        print(f"An unexpected error occurred during Serper fetch: {e}")
        return []

# --- OpenAI Integration (Modified) ---

def get_openai_summary_with_context(client: OpenAI, category_instruction: str, serper_context: list[dict]) -> tuple[str, str]:
    """
    Generates a summary using OpenAI, informed by Serper search results.

    Args:
        client (OpenAI): Initialized OpenAI client.
        category_instruction (str): The specific instruction for the news category.
        serper_context (list[dict]): A list of dicts from Serper (title, link, snippet).

    Returns:
        tuple[str, str]: (summary_text, comma_separated_sources) or error messages.
    """
    # Prepare context string from Serper results
    context_str = "\n\nRelevant articles from the last 24 hours:\n"
    source_links = []
    if serper_context:
        for idx, item in enumerate(serper_context, 1):
            context_str += f"{idx}. Title: {item['title']}\n   Link: {item['link']}\n   Snippet: {item['snippet']}\n"
            source_links.append(item['link'])  # Collect links for the sources column
    else:
        context_str += "No specific articles found for context.\n"

    # Construct the system prompt including the Serper context
    system_prompt = (
        f"You are an AI assistant providing concise, factual news summaries based ONLY on the provided context.\n"
        f"Follow these instructions precisely:\n"
        f"1. Analyze the following articles provided under 'Relevant articles...':\n{context_str}\n"
        f"2. Based *only* on the information in these articles, {category_instruction}\n"
        f"3. Limit the summary to 2-3 sentences.\n"
        f"4. Ensure neutrality and factual accuracy.\n"
        f"5. IMPORTANT: Do NOT include information not present in the provided article snippets. If the articles don't provide enough information for a summary, state that clearly."
        # Removed explicit request for URLs here, as we source them from Serper context
    )

    # User message can be simpler now as context is in system prompt
    user_message = "Generate the summary based on the provided context."

    try:
        print("  [OpenAI] Generating summary with Serper context...")
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.0,  # Even lower temperature for strict adherence to context
            max_tokens=250    # Adjusted back down slightly as context is provided
        )
        if response.choices:
            summary_text = response.choices[0].message.content.strip()
            # Sources are now directly from the serper_context links
            sources_csv = ", ".join(source_links) if source_links else "No sources used"
            return summary_text, sources_csv
        else:
            return "Error: No response choices received from API.", "N/A"

    except Exception as e:
        print(f"Error calling OpenAI API with context: {e}")
        return f"Error generating summary with context: {e}", "N/A"

# --- Prompt Handling ---

def load_and_parse_daily_prompts(file_path: str) -> dict[str, str]:
    """
    Loads prompts from the daily prompts file and parses them into a dictionary.
    Assumes prompts are separated by '---' on its own line,
    and category titles are marked with '**'.
    """
    print(f"  [Parser] Attempting to load and parse: {file_path}")  # Debug Log
    prompts = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()  # Read all lines

        sections = []
        current_section_lines = []
        for line in lines:
            # Check if the line *is* the separator
            if line.strip() == '---':
                # If we have accumulated lines, finalize the section
                if current_section_lines:
                    sections.append("\n".join(current_section_lines).strip())  # Join back and strip
                current_section_lines = []  # Start a new section
            else:
                current_section_lines.append(line)  # Add line to current section

        # Add the last accumulated section if any lines remain
        if current_section_lines:
            sections.append("\n".join(current_section_lines).strip())

        print(f"  [Parser] Found {len(sections)} sections using manual line splitting.")  # Debug Log

        if len(sections) < 2:  # Expect at least header and one prompt section
            print(f"Error: Could not find at least one '---' separator line in {file_path}. Required format not met.")
            exit(1)

        # Skip the first section (assumed to be general instructions)
        print("  [Parser] Skipping first section (assumed instructions).")
        prompt_sections = sections[1:]

        for idx, section_content in enumerate(prompt_sections, start=1):
            # Section content is already stripped from the splitting logic above
            print(f"\n  [Parser] Processing Section {idx}...")  # Debug Log
            if not section_content:
                print("  [Parser] Skipping empty section.")  # Debug Log
                continue

            lines = section_content.split('\n')  # Split the section content back into lines
            category = None
            prompt_text = None
            category_found_on_line = -1

            # First pass: Find the Category Title
            for i, line in enumerate(lines):
                line_stripped = line.strip()
                if not line_stripped:
                    continue  # Skip empty lines

                # Look for **Category**
                match = re.match(r"\*\*(.+?)\*\*", line_stripped)
                if match:
                    category = match.group(1).strip()
                    category_found_on_line = i
                    print(f"    [Parser] Found Category: '{category}' on line index {i}")  # Debug Log
                    break  # Stop looking for category once found

                # Handle Miscellaneous category if not bolded (fallback)
                if category is None and line_stripped.lower() == "miscellaneous":
                    category = "Miscellaneous"
                    category_found_on_line = i
                    print(f"    [Parser] Found Category (fallback): '{category}' on line index {i}")  # Debug Log
                    break  # Stop looking for category once found

            # Second pass: Find the Prompt Text (must be after category title)
            if category is not None:
                # Start searching from the line *after* the category title
                start_search_index = category_found_on_line + 1
                if start_search_index < len(lines):
                    for line in lines[start_search_index:]:
                        line_stripped = line.strip()
                        if not line_stripped:
                            continue  # Skip empty lines

                        if line_stripped.startswith('"') and line_stripped.endswith('"'):
                            prompt_text = line_stripped.strip('"')
                            # Escape quotes in the prompt text for safe printing
                            safe_prompt_snippet = prompt_text.replace('"', '\"')[:50]
                            print(f"    [Parser] Found Prompt: \"{safe_prompt_snippet}...\"")  # Debug Log
                            break  # Stop looking for prompt once found
                else:
                    print(f"    [Parser] Warning: No lines found after category title '{category}' to search for prompt.")

            # Store if both were found for this section
            if category and prompt_text:
                prompts[category] = prompt_text
                print(f"  [Parser] Successfully parsed Category and Prompt for: '{category}'")  # Debug Log
            else:
                section_start = lines[0].strip() if lines else "[empty section]"
                warning_msg = f"  [Parser] Warning: Failed to parse section starting with: '{section_start}' - "
                if not category:
                    warning_msg += "Could not find a '**Category**' title or 'Miscellaneous' line. "
                elif not prompt_text:
                    # Corrected formatting for the warning message
                    warning_msg += f"Found category '{category}', but could not find a subsequent quoted \"Prompt...\" line."
                print(warning_msg)

        print(f"\n  [Parser] Parsing complete. Total prompts loaded: {len(prompts)}")  # Debug Log
        if not prompts:
            print(f"Error: No prompts were successfully parsed from {file_path}. Please check the file format ensures each section after '---' has a **Category** and a \"Prompt\" line.")
            exit(1)

        return prompts

    except FileNotFoundError:
        print(f"Error: Daily prompts file not found at {file_path}")
        exit(1)
    except Exception as e:
        print(f"Error reading or parsing prompts file {file_path}: {e}")
        exit(1)


# --- Supabase Integration ---

def initialize_supabase_client() -> Client | None:
    """Initializes and returns the Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Warning: SUPABASE_URL or SUPABASE_KEY not found in backend/.env file.")
        print("Supabase integration will be skipped.")
        return None
    try:
        client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase client initialized.")
        # Optional: Add a simple check here later if needed.
        return client
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        return None

def save_summary_to_supabase(client: Client, category: str, summary: str, sources: str):
    """Saves a generated summary to the Supabase 'daily_summaries' table."""
    if not client:
        print("Supabase client not initialized. Skipping database save.")
        return

    try:
        table_name = "daily_summaries"
        # Use datetime.now() and format as ISO string for Supabase
        generation_timestamp = datetime.now().isoformat()
        data_to_insert = {
            "generation_date": generation_timestamp,  # Store timestamp string
            "category": category,
            "summary": summary,
            "sources": sources
        }
        print(f"  Attempting to save summary for '{category}' to Supabase table '{table_name}'...")
        response = client.table(table_name).insert(data_to_insert).execute()

        # Check response structure (supabase-py v2)
        if response.data:
            print(f"    Successfully saved summary for category: {category}")
        else:
            # Check for specific errors if data is empty
            error_message = "Unknown error"  # Default error message
            if hasattr(response, 'error') and response.error:
                error_message = str(response.error)
            elif hasattr(response, 'message') and response.message:
                error_message = str(response.message)
            elif hasattr(response, 'details') and response.details:
                error_message = str(response.details)

            print(f"    Error saving summary for {category} to Supabase: {error_message}")
            status = getattr(response, 'status_code', 'N/A')
            print(f"    Response status: {status}")
            # print(f"    Full Response: {response}")  # Uncomment for deeper debugging
            print("    Please ensure the table 'daily_summaries' exists and has the correct schema/permissions.")
            print("    Also, verify SUPABASE_URL and SUPABASE_KEY in backend/.env are correct.")

    except Exception as e:
        print(f"  Error during Supabase insertion for category {category}: {e}")
        # Ensure data_to_insert is defined for the error message even if created above
        data_attempted_str = str(data_to_insert) if 'data_to_insert' in locals() else "{Could not capture data before error}"
        print(f"  Data attempted: {data_attempted_str}")

# --- Main Execution (Modified) ---

def main():
    """Main function to fetch context, generate summaries, and store them."""
    print("Starting daily summary generation with Serper context...")

    # 1. Initialize Clients
    openai_client = initialize_openai_client()
    supabase_client = initialize_supabase_client()

    # 2. Load Daily Prompts
    print(f"Loading prompts from: {DAILY_PROMPTS_FILE}")
    daily_prompts = load_and_parse_daily_prompts(DAILY_PROMPTS_FILE)
    print(f"Loaded {len(daily_prompts)} daily prompts.")

    # 3. Generate and Store Summaries for each category
    today = date.today()
    print(f"\nGenerating summaries for {today}...")

    for category, prompt_instruction in daily_prompts.items():
        print(f"\nProcessing category: {category}...")

        # 3a. Fetch Serper Results for the category
        # Construct a search query (e.g., "World News last 24 hours")
        search_query = f"{category} last 24 hours"
        serper_results = fetch_serper_results(search_query)

        # 3b. Generate Summary with OpenAI using Serper context
        if serper_results:  # Only proceed if we have search results
            summary_text, sources_csv = get_openai_summary_with_context(openai_client, prompt_instruction, serper_results)
        else:
            print("  Skipping OpenAI summary generation due to lack of Serper results.")
            summary_text = "Error: Could not fetch search results to generate summary."
            sources_csv = "N/A"

        # 3c. Save to Supabase
        if "Error:" not in summary_text:
            print("  Summary generated successfully.")
            save_summary_to_supabase(supabase_client, category, summary_text, sources_csv)
        else:
            print(f"  Failed to generate or save summary for {category}. Error: {summary_text}")
            # Optionally save error state to Supabase if desired
            # save_summary_to_supabase(supabase_client, category, summary_text, sources_csv)

    print("\nDaily summary generation process complete.")

if __name__ == "__main__":
    main() 