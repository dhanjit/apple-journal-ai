# CLAUDE.md

## Commands
- **Install Dependencies**: `npm install`
- **Development**: `vercel dev` (runs frontend and API locally)
- **Deploy**: `vercel deploy --prod`
- **Frontend Only**: Open `webapp/index.html` in browser (API features won't work without Vercel)

## Architecture
- **Frontend**: Vanilla HTML/CSS/JS located in `webapp/`.
    - `app.js`: Core logic, UI handling, Local AI (`window.ai`), and Cloud AI integration.
    - `style.css`: All application styling.
- **Backend**: Vercel Serverless Functions in `api/`.
    - `api/chat.js`: Edge Runtime function using Vercel AI SDK to stream responses from Google Gemini or Anthropic Claude.
- **Data**: Parses Apple Journal export (HTML/text) completely client-side.

## Tech Stack
- **Runtime**: Node.js / Vercel Edge Runtime
- **AI SDK**: `ai`, `@ai-sdk/google`, `@ai-sdk/anthropic`
- **Validation**: `zod`
- **Local AI**: Chrome Prompt API (`window.ai`)

## Code Style
- **JavaScript**: ES Modules (`import`/`export`). Modern ES6+ syntax (async/await, arrow functions).
- **CSS**: Vanilla CSS, no preprocessors.
- **Indentation**: 4 spaces.
- **Formatting**: Semicolons used, single quotes preferred for strings.
- **Error Handling**: API calls should return JSON error objects `{ error: "message" }`.
