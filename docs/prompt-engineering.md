## Just the Facts AI & Prompt Engineering Guidelines

### GPT-4o Integration Overview
Just the Facts utilizes OpenAI's GPT-4o model. The key process involves: 1) Performing a real-time web search based on the user's topic. 2) Providing the search results (content snippets, URLs) as context to GPT-4o. 3) Instructing GPT-4o to generate a concise, unbiased, and factual summary *based solely on the provided context*, including specific citations linking back to the provided source URLs.

### Prompt Structure

- **System Message:** Clearly instruct GPT-4o on its role, emphasizing summarizing *only* from the provided context and the required citation format.
  - Example: "You are an AI assistant. Your task is to create a concise, unbiased, factual summary based *only* on the provided Context. Do not use any prior knowledge. For each factual statement, cite the source using an inline numerical marker (e.g., [1], [2]) corresponding to the Sources list in the Context. Output the summary followed by a structured list of the cited sources."

- **User Message Structure:**
  ```
  Topic: [User-specified topic or event]

  Context:
  [Source 1 URL]: [Content snippet from Source 1]
  [Source 2 URL]: [Content snippet from Source 2]
  ...

  Summarize the key facts based *only* on the context above, citing the sources with inline markers.
  ```

### Example Prompt
```
System: You are an AI assistant... [rest of system message as above]...

User:
Topic: Recent advancements in perovskite solar cell efficiency.

Context:
[https://example.com/source1]: Recent research achieved 25.5% efficiency for perovskite cells...
[https://example.com/source2]: Tandem silicon-perovskite cells have now surpassed 30% efficiency...
[https://example.com/source3]: Stability remains a key challenge, though new encapsulation techniques show promise...

Summarize the key facts based *only* on the context above, citing the sources with inline markers.
```

### Expected Output
- A concise, objective summary derived *only* from the provided context.
- Inline numerical citations (e.g., [1], [2]) linking facts to the specific sources provided in the context.
- A structured list of the cited sources below the summary.
- Example:
  ```json
  {
    "summary": "Recent advancements have pushed perovskite solar cell efficiency to 25.5% [1]. Tandem cells combining silicon and perovskite have exceeded 30% efficiency [2]. While stability is still a challenge, progress is being made with new encapsulation methods [3].",
    "citations": [
      { "id": 1, "url": "https://example.com/source1", "title": "Source Title Extracted/Generated for source1" },
      { "id": 2, "url": "https://example.com/source2", "title": "Source Title Extracted/Generated for source2" },
      { "id": 3, "url": "https://example.com/source3", "title": "Source Title Extracted/Generated for source3" }
    ]
  }
  ```

### Prompt Engineering Best Practices

- **Clarity:** Clearly define the role and the constraint of using *only* provided context.
- **Specificity:** Explicitly instruct the model on the exact output format required (summary text, inline markers, structured source list).
- **Context Grounding:** Emphasize that no external knowledge should be used; the summary must be verifiable against the provided context snippets.
- **Neutrality:** Instruct for unbiased language.
- **Source Citation:** Mandate inline numerical citations linked directly to the provided source URLs.

### Sensitive Content & Moderation

- Implement OpenAI's content moderation endpoints to ensure content appropriateness.
- Clearly instruct GPT-4o to refrain from generating or endorsing content that could be considered harmful, discriminatory, or offensive.

### Handling Edge Cases

- **Ambiguous Inputs:** Provide guidelines for GPT-4o to request clarification or offer general, fact-based information.
- **Complex or Controversial Topics:** Direct GPT-4o to remain neutral and factual, explicitly highlighting areas of consensus or clearly presenting differing factual viewpoints.
- **Long or Broad Inputs:** Instruct GPT-4o to provide concise summaries focused on the most critical and relevant information.

### Output Formatting

- The final output from the AI interaction should be structured (e.g., JSON) containing:
  - A `summary` field with the text, including inline numerical markers.
  - A `citations` field containing an array of objects, each with an `id` (matching the marker), `url` (from the context), and potentially a `title` (extracted or generated from the source).

### Iteration & Feedback

- Regularly assess and refine prompts based on feedback and review of generated summaries.
- Continuously improve accuracy, neutrality, and clarity of GPT-4o outputs.