## Just the Facts Development Standards & Best Practices

### Code Style Guide

- **Languages & Frameworks:**
  - JavaScript/TypeScript, React.js (frontend), Node.js (backend).

- **Coding Conventions:**
  - Consistently use ES6+ syntax.
  - Follow Airbnb JavaScript style guide for readability and maintainability.
  - Clearly and descriptively name all variables and functions.
  - Limit functions to manageable sizes to enhance readability and ease maintenance.

- **Code Documentation:**
  - Implement JSDoc comments detailing function purpose, parameters, and return values.
  - Clearly document API endpoints specifying input and expected output.

### Project Directory Structure

```
JustTheFacts/
├── backend/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   └── utils/
└── frontend-web/
    ├── components/
    ├── pages/
    ├── utils/
    └── assets/
```

### Git Workflow Guidelines

- **Branching Model:** Git Flow
  - Primary branches: `main` (production), `develop` (staging).
  - Feature branches: `feature/description`.
  - Bugfix branches: `bugfix/description`.

- **Commit Messages:**
  - Use clear commit descriptions:
    - `feat:` for new features
    - `fix:` for bug fixes
    - `docs:` for documentation updates
    - `refactor:` for code improvements

- **Pull Requests:**
  - Clearly describe PRs and reference related issues.
  - At least one peer review is mandatory before merging into `develop`.

### API Contract Documentation

- **API Endpoint Definitions:**
  - Clearly define endpoints, HTTP methods (GET, POST, etc.), request payloads, and responses.
  - Standardize JSON response structures:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

- **Error Handling:**
  - Uniform error codes and descriptive messages:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERR_CODE",
    "message": "Detailed error description"
  }
}
```

### Error Handling & Logging

- **Logging Practices:**
  - Structured logging for clarity and ease of debugging.
  - Log levels: `error`, `warn`, `info`, `debug`.

- **Error Management:**
  - Clearly defined error handling practices for both frontend and backend.
  - Avoid logging sensitive information or exposing it through error messages.

### Maintenance & Monitoring

- **Code Maintenance:**
  - Regular updates to dependencies and security patches.
  - Incremental refactoring to manage technical debt effectively.

- **System Monitoring:**
  - Backend health-check endpoints for service availability.
  - Utilize tools such as Sentry and Firebase Analytics to monitor performance and user activity.

### Cursor MDC Usage Guide

- Develop MDC files for each key functional area.
- Regularly update MDC files throughout the development cycle.
- Provide detailed explanations and rationales for best practices, decisions, and changes.

