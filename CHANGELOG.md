# Just the Facts - Changelog

**Date Format:** YYYY-MM-DD

## [Unreleased] - YYYY-MM-DD

## [0.2.0] - 2025-04-02

### Added
- CSS Modules (`page.module.css`, `CategorySection.module.css`, `SummaryItem.module.css`) for frontend component styling.
- Subtle border, padding, and background to summary items for visual separation.
- Hover effects (underline, color change) for source links.
- Frontend MVP using Next.js (`frontend/` directory).
- Basic newspaper-inspired styling (`frontend/src/app/globals.css`).
- Supabase client setup for frontend (`frontend/src/utils/supabaseClient.js`, `frontend/.env.local`).
- Reusable frontend components (`SummaryItem.jsx`, `CategorySection.jsx`, `SearchBox.jsx`).
- Main page (`frontend/src/app/page.js`) displaying daily summaries fetched from Supabase.
- Logic to fetch latest summary per category (`created_at` based).
- Search box functionality calling a backend API route.
- Placeholder `/api/search` Next.js API route (`frontend/src/app/api/search/route.js`) replicating Serper+OpenAI logic.
- Frontend README (`frontend/README.md`).
- Ad placeholders (sticky right, fixed bottom) on the frontend (`page.js`).
- Category Navigation Bar with smooth scroll-to-section functionality (`page.js`).
- Dynamic column population logic: places 4 longest summaries in the middle column (`page.js`).

### Changed
- **Refactored Frontend UI/UX:** Migrated inline styles to CSS Modules across `page.js`, `CategorySection.jsx`, and `SummaryItem.jsx`.
- **Layout & Styling:**
    - Updated column layout (`page.module.css`) for better centering and responsiveness.
    - Changed main content background to white (`page.module.css`).
    - Removed backgrounds/borders from Category Nav Bar and Search Box for seamless integration (`page.js`, `SearchBox.jsx`).
    - Reduced vertical spacing between header, nav, search, and content sections (`page.js`, `SearchBox.jsx`, `page.module.css`).
    - Added padding to page bottom (`page.module.css`) to allow scrolling past fixed bottom ad.
- **Scaling & Typography:**
    - Addressed oversized elements by standardizing on `rem` units and setting a base `html` font size of `10px` in `globals.css` for global scaling.
    - Adjusted font sizes for headings, body text, and sources/footnotes based on the new `10px` base `rem`.
    - Increased overall font sizes slightly for better readability (`page.module.css`, `CategorySection.module.css`, `SearchBox.jsx`, `page.js`).
- **Search Functionality:**
    - Updated search results display to match newspaper style (bold headers, footnotes) (`SearchBox.jsx`).
    - Updated search prompt (`general-prompt.md`) to filter out summaries focused on reactions/commentary about news.
    - Improved footnote parsing/rendering robustness (`SearchBox.jsx`).
    - Modified source link display in search results to show URL explicitly (`SearchBox.jsx`).
- Updated fonts used in `globals.css` to Georgia and Helvetica Neue.
- Updated API route (`/api/search`) prompt to prevent sources in summary text and enforce footnote format.

### Removed
- Redundant `backend/search_query.py` script (logic moved to API route).
- Default Next.js `page.tsx` file.

### Fixed
- Supabase insert permissions error in `backend/main.py` by requiring `service_role` key.
- Duplicate page error in Next.js frontend build.
- Frontend not displaying Supabase data due to missing RLS read policy.
- Syntax error in `SummaryItem.jsx` during source link formatting.
- Major oversized scaling issue on desktop views.
- JavaScript parsing errors in `/api/search/route.js` (template literal syntax).

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