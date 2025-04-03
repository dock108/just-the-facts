# backend/main.py
# This script integrates OpenAI to generate daily news summaries based on prompts
# and stores them in a Supabase database. It uses Serper News API to fetch articles.

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
#    SERPER_API_KEY=your_serper_api_key  # Key from serper.dev
# 6. Update SUPABASE_URL in .env with your actual Supabase project URL.
# 7. Run the script from the project root directory:
#    python backend/main.py
# ---

import os
import json  # Added for Serper API request
import requests  # Added for Serper API request
from datetime import date, datetime
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client
# Removed urlparse import
# Removed NewsApiClient import
# Removed re import (no longer needed)
# Removed timedelta import (no longer needed)

# --- Configuration ---
# Load environment variables from .env file located in the same directory as the script
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")  # Load Serper Key

# Load model from .env or use default
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o")

# Adjust the path to be relative to the script's location
PROMPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'prompts')
DAILY_PROMPTS_FILE = os.path.join(PROMPTS_DIR, "daily-prompts.md")  # This remains but is unused by load_category_prompts

# Supabase Table Schema Definition (for reference)
# Table Name: daily_summaries
# Columns:
#   id: bigint (auto-incrementing primary key)
#   created_at: timestamp with time zone (default: now())
#   generation_date: timestamptz (index)
#   category: text (index)
#   summary: text
#   sources: text (stores JSON string: '[{"name": "Source Name", "url": "..."}, ...]')

# --- OpenAI Client Initialization ---
def initialize_openai_client() -> OpenAI:
    """Initializes and returns the OpenAI client."""
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY not found in backend/.env file.")
        exit(1)
    return OpenAI(api_key=OPENAI_API_KEY)

# --- Serper News API Integration (NEW) ---
def fetch_serper_articles(query: str, num_results: int = 5) -> list[dict]:
    """
    Fetches recent news articles from Serper News API based on a query.

    Args:
        query (str): Search query (e.g., category name).
        num_results (int): Max number of results to fetch.

    Returns:
        list[dict]: A list of articles, formatted similarly to the previous API.
                    Keys include 'title', 'link' (as 'url'), 'snippet' (as 'description'),
                    'source'. Returns empty list on error or if no key is found.
    """
    if not SERPER_API_KEY:
        print("Error: SERPER_API_KEY not found in backend/.env file. Skipping Serper search.")
        return []

    serper_url = "https://google.serper.dev/news"
    payload = json.dumps({
        "q": query,
        "num": num_results,
        "tbs": "qdr:d"  # Filter for results from the last 24 hours ('d' for day)
    })
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }

    try:
        print(f"  [Serper] Fetching results for query: '{query}' (last 24 hours)")
        response = requests.post(serper_url, headers=headers, data=payload)
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        search_results = response.json()
        articles = search_results.get('news', [])

        # Map Serper response fields to the expected format
        formatted_articles = []
        for article in articles:
            # Ensure basic required fields exist
            if article.get('link') and article.get('title') and article.get('snippet'):
                formatted_articles.append({
                    "title": article.get("title"),
                    "url": article.get("link"),  # Map 'link' to 'url'
                    "description": article.get("snippet"),  # Map 'snippet' to 'description'
                    "content": article.get("snippet"),  # Also map to 'content' as a fallback
                    "source": {"name": article.get("source", "N/A")},  # Wrap source name in dict
                    "publishedAt": article.get("date", None)  # Serper provides 'date'
                })

        print(f"  [Serper] Found {len(formatted_articles)} relevant articles.")
        return formatted_articles[:num_results]  # Ensure we don't exceed num_results

    except requests.exceptions.RequestException as e:
        print(f"Error during Serper API request: {e}")
        # Attempt to get more specific error details from response if available
        try:
            error_details = response.json()
            print(f"  Serper Error Details: {error_details}")
        except Exception:
            # If response wasn't JSON or doesn't exist
            if 'response' in locals() and response is not None:
                print(f"  Serper Response Status: {response.status_code}")
                print(f"  Serper Response Text: {response.text[:200]}...")  # Log snippet of text
        return []
    except json.JSONDecodeError:
        print("Error decoding Serper JSON response.")
        print(f"  Serper Response Text: {response.text[:200]}...")
        return []
    except Exception as e:
        print(f"An unexpected error occurred during Serper fetch: {e}")
        return []


# --- OpenAI Integration (Modified for footnote headers & Serper context) ---
def get_openai_summary_with_context(client: OpenAI, category: str, category_instruction: str, news_articles: list[dict]) -> str:
    """
    Generates a summary using OpenAI with short footnote headers, informed by Serper articles.
    The summary content itself should NOT include the main category title (e.g., **World News**).

    Args:
        client (OpenAI): Initialized OpenAI client.
        category (str): The name of the category being processed (for logging).
        category_instruction (str): The specific instruction for the news category.
        news_articles (list[dict]): A list of article dicts from Serper API.

    Returns:
        str: Formatted summary text with linked short footnote headers (without the main category title).
    """
    # --- 1. Pre-check for sufficient context ---
    if not news_articles:
        print(f"  [{category}] Warning: No articles provided from Serper. Skipping OpenAI generation.")
        return "Error: Insufficient data to generate summary."

    # --- 2. Prepare context string and structured sources ---
    context_str = "\n\nRelevant articles from the last 24 hours:\n"
    # Create a mapping from index to URL for the AI
    article_links = {idx: article.get('url') for idx, article in enumerate(news_articles, 1) if article.get('url')}

    for idx, article in enumerate(news_articles, 1):
        title = article.get('title', 'No Title')
        link = article.get('url')  # Use 'url' which we mapped from Serper's 'link'

        # Use 'description' (mapped from Serper's 'snippet')
        snippet = article.get('description', '')
        # Limit snippet length to avoid overly long context
        snippet = (snippet[:300] + '...') if len(snippet) > 300 else snippet  # Increased length slightly

        if not snippet or not link:  # Skip if no usable snippet or link
            print(f"  [{category}] Warning: Skipping article {idx} ('{title}') due to missing snippet or link.")
            continue

        # Source name is now nested under 'source' key
        source_name_raw = article.get('source', {}).get('name', 'N/A')
        # Add index and URL to context for AI linking
        context_str += f"{idx}. Title: {title}\n   Link: {link}\n   Source: {source_name_raw}\n   Snippet: {snippet}\n"

    # --- Debug log for Serper context ---
    # log_context_str = (context_str[:1000] + '...') if len(context_str) > 1000 else context_str # Removed shortening for debug
    # print(f"DEBUG: [{category}] Serper context being passed to OpenAI...:\n{log_context_str}")
    # --- End Debug log ---

    if not article_links:  # Check if we have any articles with links to reference
        print(f"  [{category}] Error: No valid articles with links remaining after filtering snippets. Cannot generate summary.")
        return "Error: No valid source data with content to generate summary."

    # --- 3. Construct the system prompt (UPDATED FOR NEWSPAPER FORMAT, FILTERING, NO PARTIAL QUOTES, LINKED FOOTNOTES, NO HEADER) ---
    system_prompt = (
        f"You are an AI assistant creating concise, factual news summaries formatted like newspaper articles, based ONLY on objective news reporting found in the provided context.\\n"
        f"Follow these instructions precisely:\\n"
        f"1. Analyze the articles provided under 'Relevant articles...'. Each article is numbered and has a Link.\\n"
        f"CONTEXT:\\n"
        f"-------\\n"
        f"{context_str}"
        f"-------\\n"
        f"2. **CRITICAL FILTERING STEP:** Before summarizing, evaluate each article snippet in the CONTEXT. **IGNORE and EXCLUDE** any articles that are primarily:\\n"
        f"   - Opinion pieces, editorials, or personal blogs.\\n"
        f"   - Analysis or commentary with a strong subjective viewpoint or advocacy.\\n"
        f"   - Articles focused heavily on polling data, survey results, or complex methodology rather than events.\\n"
        f"   - Subjective reviews or speculative content.\\n"
        f"   Focus ONLY on articles that present objective, factual news reporting.\\n"
        f"3. Based *only* on the factual information in the **filtered, objective articles**, {category_instruction}\\n"
        f"4. IMPORTANT: Do NOT include the main category title (like '**Category Name**') at the beginning of your response.\\n"
        f"5. Format each summary item like a short newspaper article: \\n"
        f"   a. Start with a short, bold Article Header (2-6 words) on its own line. Example: **New Trade Tariffs Announced**\\n"
        f"   b. Follow the header with a paragraph (2-5 sentences) summarizing the key factual information. DO NOT use bullet points.\\n"
        f"   c. Include footnote references like [¹], [²], etc. within the summary paragraph, referencing ONLY the objective articles used.\\n"
        f"6. **WRITING STYLE:**\\n"
        f"   a. Maintain a neutral, objective tone.\\n"
        f"   b. **AVOID partial quotes.** Do not pull short phrases in quotation marks (e.g., \"worst offenders\") out of context. If quoting is necessary, use a more complete, self-contained statement or paraphrase instead.\\n"
        f"   c. Ensure information is presented accurately and maintains the context provided in the source snippets. Do not misrepresent or oversimplify.\\n"
        f"7. Separate each article item (Header + Paragraph) with a single blank line.\\n"
        f"8. At the very end, include a 'Sources:' section.\\n"
        f"9. In the 'Sources:' section, list the footnote numbers corresponding ONLY to the objective articles summarized. Use a short descriptive header (1-3 words) AND make that header a Markdown link to the corresponding article's URL from the context.\\n"
        f"10. Example format for sources: [¹]: [Short Header](URL_from_context)\\n"
        f"11. Ensure neutrality and factual accuracy based *only* on the filtered, objective snippets.\\n"
        f"12. If, after filtering, NO objective articles provide sufficient information for the category, state that clearly (e.g., 'No objective news reports found for this category.'). Do NOT summarize subjective content.\"\n"
    )

    user_message = "Generate the summary content in newspaper article format (Header + Paragraph, no bullets) based *only* on the filtered, objective articles found in the provided context. Avoid partial quotes and maintain original context. Ignore opinion, polls, subjective analysis, and methodology-focused articles. Ensure sources reference only the objective articles used. Do not include the main category title in your response."

    # --- ADDED: Log the exact prompt being sent ---
    print(f"\n--- START OpenAI Prompt for [{category}] ---")
    print(f"System Prompt:\n{system_prompt}")
    print(f"User Message: {user_message}")
    print("--- END OpenAI Prompt ---\n")
    # --- END Log ---

    # --- 4. Call OpenAI API ---
    try:
        print(f"  [{category}] [OpenAI] Generating summary with linked footnote headers...")
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.1,  # Low temperature for factual summaries
            max_tokens=600    # Increased slightly for URLs in sources
        )
        if response.choices:
            summary_content = response.choices[0].message.content.strip()
            # --- ADDED: Log the RAW response from OpenAI ---
            print(f"--- START RAW OpenAI Response for [{category}] ---")
            print(summary_content)
            print("--- END RAW OpenAI Response ---")
            # --- END Log ---
            return summary_content
        else:
            print(f"  [{category}] Error: No response choices received from API.")
            return "Error: No response choices received from API."

    except Exception as e:
        print(f"  [{category}] Error calling OpenAI API with context: {e}")
        return f"Error generating summary with context: {e}"


# --- Prompt Handling (NEW) ---
def load_category_prompts(prompts_dir: str) -> dict[str, str]:
    """
    Loads prompts from individual markdown files in the prompts directory.

    Args:
        prompts_dir (str): Path to the directory containing category prompt files.

    Returns:
        dict[str, str]: A dictionary mapping category names to their prompt instructions.
    """
    prompts = {}
    print(f"  [Prompts] Loading category prompts from: {prompts_dir}")

    try:
        # Get list of all markdown files in the directory
        prompt_files = [f for f in os.listdir(prompts_dir) if f.endswith('.md')]
        print(f"  [Prompts] Found {len(prompt_files)} markdown files")

        if not prompt_files:
            print(f"Error: No markdown files found in {prompts_dir}")
            exit(1)

        for filename in prompt_files:
            # Skip non-category files
            if filename in ['daily-prompts.md', 'premium-prompts.md', 'general-prompt.md']:
                continue

            # Extract category name from filename
            category = filename.replace('.md', '').replace('-', ' ').title()
            file_path = os.path.join(prompts_dir, filename)

            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read().strip()
                    prompts[category] = content
                    print(f"  [Prompts] Successfully loaded: {category} from {filename}")
            except Exception as e:
                print(f"  [Prompts] Error reading {filename}: {e}")

        print(f"  [Prompts] Successfully loaded {len(prompts)} category prompts")

        if not prompts:
            print(f"Error: No valid prompts could be loaded from {prompts_dir}")
            exit(1)

        return prompts

    except Exception as e:
        print(f"Error loading category prompts from {prompts_dir}: {e}")
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

def save_summary_to_supabase(client: Client, category: str, summary: str):
    """Saves a generated summary to the Supabase 'daily_summaries' table."""
    if not client:
        print("Supabase client not initialized. Skipping database save.")
        return

    # --- Log the data just before saving ---
    print(f"DEBUG: Saving to Supabase for {category}:")
    print(f"  Summary length: {len(summary)}")
    # --- End Log ---

    try:
        table_name = "daily_summaries"
        # Use datetime.now() and format as ISO string for Supabase
        generation_timestamp = datetime.now().isoformat()
        data_to_insert = {
            "generation_date": generation_timestamp,
            "category": category,
            "summary": summary,  # Contains summary text with footnotes
            "sources": "[]"      # Empty JSON array as sources are now in the summary text
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
            print("    Please ensure the table 'daily_summaries' exists and has the correct schema/permissions.")
            print("    Also, verify SUPABASE_URL and SUPABASE_KEY in backend/.env are correct.")

    except Exception as e:
        print(f"  Error during Supabase insertion for category {category}: {e}")
        # Ensure data_to_insert is defined for the error message even if created above
        data_attempted_str = str(data_to_insert) if 'data_to_insert' in locals() else "{Could not capture data before error}"
        print(f"  Data attempted: {data_attempted_str}")

# --- Main Execution (Updated for Category Prompts & Serper) ---
def main():
    """Main function to fetch context, generate summaries, and store them."""
    print("Starting daily summary generation with individualized category prompts using Serper API...")

    # 1. Initialize Clients
    openai_client = initialize_openai_client()
    supabase_client = initialize_supabase_client()

    # 2. Load Category Prompts
    print(f"Loading category prompts from: {PROMPTS_DIR}")
    category_prompts = load_category_prompts(PROMPTS_DIR)
    print(f"Loaded {len(category_prompts)} category prompts.")

    # Track used article URLs for deduplication
    used_article_urls = set()

    # 3. Generate and Store Summaries for each category
    today = date.today()
    print(f"\nGenerating summaries for {today}...")

    for category, prompt_instruction in category_prompts.items():
        print(f"\nProcessing category: {category}...")

        # 3a. Fetch Serper Articles for the category
        serper_articles_raw = fetch_serper_articles(query=category, num_results=7)  # Fetch using Serper

        # Filter out already used articles
        serper_articles = [
            article for article in serper_articles_raw
            if article.get('url') not in used_article_urls  # Use 'url' field now
        ]

        if len(serper_articles) < len(serper_articles_raw):
            print(f"  Filtered out {len(serper_articles_raw) - len(serper_articles)} duplicate articles.")

        # 3b. Generate Summary Content (without header) with OpenAI
        summary_content = ""
        if serper_articles:
            # Pass category name to the function for logging
            summary_content = get_openai_summary_with_context(openai_client, category, prompt_instruction, serper_articles)

            # Track used URLs to avoid duplicates in other categories
            for article in serper_articles:
                if article.get('url'):
                    used_article_urls.add(article.get('url'))
        else:
            print(f"  [{category}] No relevant articles found via Serper. Skipping summary generation.")
            # Prepare content for the 'no articles' case (without header)
            summary_content = "No relevant articles were found for this category in the last 24 hours."

        # 3c. Save the raw content (or error/message) to Supabase
        # The header **Category** is now handled solely by the frontend CategorySection component
        # final_summary_text = f"**{category}**\n\n{summary_content}" # REMOVED THIS LINE

        # Check if the content generation resulted in an error message or no articles found
        if summary_content.startswith("Error:"):
            print(f"  Failed to generate summary for {category}. Error: {summary_content}")
            # Save the error message (without manual header)
            save_summary_to_supabase(supabase_client, category, summary_content)
        elif not serper_articles:
            # Also save the 'no articles' message (without manual header)
            print("  Saving 'no articles' message.")
            save_summary_to_supabase(supabase_client, category, summary_content)
        else:
            # Summary content generation was successful
            print("  Summary content generated successfully.")
            save_summary_to_supabase(supabase_client, category, summary_content)  # Save raw content

    print("\nDaily summary generation process complete.")


if __name__ == "__main__":
    main()

# --- Testing Instructions ---
#
# To test this implementation:
#
# 1. Ensure all required category prompt files exist in the prompts/ directory:
#    - world-news.md
#    - us-news.md
#    # ... (rest of the category files)
#    - miscellaneous.md
#    * Ensure each prompt file instructs the AI to output linked footnotes like: [¹]: [Header](URL)
#
# 2. Verify your .env file in the backend/ directory contains valid API keys for:
#    - OpenAI
#    - Serper (SERPER_API_KEY)
#    - Supabase (if using database storage)
#
# 3. Ensure you have installed the required packages:
#    pip install -r requirements.txt
#
# 4. Run the script from your project root directory:
#    python backend/main.py
#
# 5. Check the console output for:
#    - Successful loading of category prompts
#    - Successful article fetching (from Serper) for each category
#    - Generated summaries with proper footnote format
#
# 6. If using Supabase, verify the summaries are saved with proper formatting:
#    - Each summary should start with the category title (e.g., **Technology**)
#    - The summary content should NOT have a duplicate category title.
#    - Each point should include footnote references [¹], [²], etc.
#    - At the end, there should be a Sources section with linked headers: [¹]: [Short Header](URL)
#
# Example expected summary format (Raw text stored in Supabase):
#
# **Technology**
#
# - The NFL announced it will adopt camera-based technology from Sony to measure first downs starting this fall.[¹]
# - Apple unveiled its new M4 chip with significantly improved AI performance.[²]
#
# **Sources:**
# [¹]: [NFL Technology](http://example.com/nfl-sony-tech)
# [²]: [Apple M4](http://example.com/apple-m4-release)
#
# Troubleshooting:
# - If no articles are found, check your SERPER_API_KEY and usage limits.
# - If articles are found but OpenAI fails, check your OPENAI_API_KEY and usage limits.
# - If summaries don't include proper linked footnotes, review the system prompt in `get_openai_summary_with_context` and the instructions in each category file.
# - Ensure the `requests` library is installed (`pip install requests`).
# - Remember: The application displaying this data needs to render the Markdown (especially links) for it to appear correctly in a browser. 