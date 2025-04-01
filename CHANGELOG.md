# Just the Facts - Changelog

**Date Format:** YYYY-MM-DD

## [0.2.0] - 2025-04-02

### Added
- Frontend MVP using Next.js (`frontend/` directory).
- Basic newspaper-inspired styling (`frontend/src/app/globals.css`).
- Supabase client setup for frontend (`frontend/src/utils/supabaseClient.js`, `frontend/.env.local`).
- Reusable frontend components (`SummaryItem.jsx`, `CategorySection.jsx`, `SearchBox.jsx`).
- Main page (`frontend/src/app/page.js`) displaying daily summaries fetched from Supabase.
- Logic to fetch latest summary per category (`created_at` based).
- Search box functionality calling a backend API route.
- Placeholder `/api/search` Next.js API route (`frontend/src/app/api/search/route.js`) replicating Serper+OpenAI logic.
- Frontend README (`frontend/README.md`).
- Ad placeholders on the frontend.

### Changed
- Updated `SummaryItem.jsx` to display all source links.
- Formatted source links in `SummaryItem.jsx` to remove http(s):// prefix.
- Constrained max-width of daily summaries section on desktop (`page.js`).
- Updated API route (`/api/search`) prompt to prevent sources in summary text.

### Removed
- Redundant `backend/search_query.py` script (logic moved to API route).
- Default Next.js `page.tsx` file.

### Fixed
- Supabase insert permissions error in `backend/main.py` by requiring `service_role` key.
- Duplicate page error in Next.js frontend build.
- Frontend not displaying Supabase data due to missing RLS read policy.
- Syntax error in `SummaryItem.jsx` during source link formatting.

## [0.1.0] - 2025-04-01

### Added
- Initial project structure and setup.
- Core dependencies: `openai`, `python-dotenv`, `supabase`, `requests`.
- Secure loading of API keys (`OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SERPER_API_KEY`) from `backend/.env`.
- Basic OpenAI API integration (`gpt-4o`, configurable via `OPENAI_MODEL` in `.env`) in `backend/main.py`.
- Initial prompt files (`general-prompt.md`, `daily-prompts.md`, `premium-prompts.md`) in `prompts/`.
- Supabase client initialization (`initialize_supabase_client`).
- Function to save summaries to Supabase (`save_summary_to_supabase`).
- Logic to load and parse daily prompts from `prompts/daily-prompts.md` (iteratively improved).
- Debug logging for prompt parsing.
- Serper API integration (`fetch_serper_results`) to fetch recent articles based on category.
- New OpenAI function (`get_openai_summary_with_context`) to generate summaries grounded in Serper results.
- `.gitignore` file with standard Python patterns.
- `backend/search_query.py` script for handling single user queries with input validation, Serper context fetching, OpenAI summarization based on `general-prompt.md`, and console output.

### Changed
- Moved `main.py` and `.env` into `backend/` directory.
- Updated OpenAI model from `gpt-4-turbo` to `gpt-4o`, then made configurable via `OPENAI_MODEL` environment variable.
- Refined `daily-prompts.md` structure with `---` separators between all categories.
- Modified main workflow (`main` function) to:
    - Fetch Serper results before generating summary.
    - Pass Serper results as context to OpenAI.
    - Use Serper result links directly as sources, removing footnote/extraction logic.
- Changed `generation_date` logic in `save_summary_to_supabase` to use full timestamp (`datetime.now().isoformat()`) instead of just date (requires manual `timestamptz` column type change in Supabase).
- Adjusted `max_tokens` and `temperature` for OpenAI calls.
- OpenAI system prompt structure in `get_openai_summary_with_context` to heavily emphasize using *only* provided Serper context.
- Relaxed summary length constraint in `backend/search_query.py` system prompt to allow 2-3 paragraphs if needed, rather than a strict 2-3 sentences.

### Removed
- Previous logic in `get_openai_summary` for footnote generation and URL extraction (superseded by Serper context approach).

### Fixed
- Corrected multiple prompt parsing issues in `load_and_parse_daily_prompts` related to file splitting and section processing.
- Addressed various Python linter warnings (indentation, spacing, multi-statement lines) throughout development.
- Corrected syntax errors introduced during automated edits. 