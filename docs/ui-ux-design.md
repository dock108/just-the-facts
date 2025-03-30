## Just the Facts UI/UX Design Document

### Wireframes & User Flow

#### Single-Screen Layout:
- **Header:** Clear and professional logo with app name "Just the Facts."
- **Topic Input Field:**
  - Placeholder: "Enter topic or event..."
  - Single-line input for clarity and simplicity.
- **Summarize Button:**
  - Centered directly below the input field.
  - Text: "Summarize"
- **Output Display:**
  - Area prominently displayed beneath the button.
  - Displays the generated summary text.
  - Summary text will include inline, numerical markers (e.g., [1], [2]) corresponding to sources.
  - These markers should be styled subtly (e.g., superscript) and ideally link to the corresponding source in the list below.
  - Below the summary text, a clearly separated section titled "Sources" or "References" lists the full source details (e.g., Title and URL) corresponding to the inline markers.
  - "Copy to Clipboard" button/icon adjacent to summarized text.
- **Bottom Banner:**
  - Reserved for ad placement (Google AdSense).

#### Interaction Flow:
1. User types a topic or event in the input field.
2. User taps "Summarize" button.
3. The application displays a loading indicator or progress status (e.g., "Searching sources...", "Summarizing...") while the backend processes the request.
4. Generated factual summary appears in the output display area, replacing the loading indicator.
5. User can copy the summary to the clipboard or share it easily.

### UI Style Guide

- **Color Palette:**
  - Primary Color: #2E86AB (Blue - professional, trustworthy)
  - Secondary Color: #FFFFFF (White - clear, neutral background)
  - Accent Color: #F6C85F (Yellow - highlights key interactive elements)
  - Text Color: #000000 (Black - maximum readability)

- **Typography:**
  - Header Font: Montserrat Bold, 24px
  - Body Text: Montserrat Regular, 16px
  - Button Text: Montserrat SemiBold, 18px

- **Icons:**
  - Minimalistic, line-based icons for clarity and professionalism.

- **Spacing & Layout:**
  - Uniform margins (16px) around elements.
  - Optimal spacing (8px-12px) between interactive and text elements.

### Accessibility Considerations

- Intuitive labels and placeholder texts.
- Strong color contrasts for enhanced readability.
- Comprehensive keyboard navigation support.

### Responsive Design

- Ensure consistent functionality and visual appeal across all standard web browsers and various device screen sizes.