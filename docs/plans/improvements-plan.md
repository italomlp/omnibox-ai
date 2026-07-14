# Implementation Plan — OmniBox AI Improvements

This plan outlines the enhancements to be made to the OmniBox AI codebase before proceeding with new features. The changes focus on layout responsiveness on mobile, updating the LLM models, adding career tool descriptions, exposing activity history, supporting local CV file parsing, and introducing a global light mode.

---

## User Review Required

> [!IMPORTANT]
> **Decisions & Feedback Incorporated:**
> 1. **Default Gemini Model:** We will use `gemini-2.5-flash` as the default Gemini model.
> 2. **Light Mode Aesthetic:** We will use the sleek slate-zinc theme (`bg-zinc-50` / `text-zinc-900`) for light mode.
> 3. **Custom Model Inputs (All Providers):** To keep the app future-proof for new releases (like GPT-5 or Claude 4.5/5/Mythos), we will add an editable custom text input next to the suggestions dropdown in the Settings panel for **every** provider (including OpenRouter and Ollama).
> 4. **Accessibility (a11y):** The Career Suite help card will be built with full accessibility in mind (using proper semantic HTML5 landmarks, ARIA labels, focus states, and keyboard accessibility).
> 5. **Modular History Workspace:** We will decompose the History workspace into focused, reusable components (`HistoryWorkspace.tsx`, `HistoryList.tsx`, `HistoryItemCard.tsx`, and `HistoryDetailPanel.tsx`) to avoid a cluttered single-file implementation.

---

## Proposed Changes

We will group our modifications into six areas:

### 1. Mobile Responsiveness & Layout
- Modify [AppSidebar.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/components/layout/AppSidebar.tsx) to:
  - Add a dark backdrop overlay for mobile when the sidebar is open.
  - Position the sidebar absolutely on mobile screens (`fixed md:static left-0 top-0 h-full z-30`) so it does not squish the main view.
  - Translate the sidebar off-screen (`-translate-x-full`) when closed on mobile, and bring it on-screen (`translate-x-0`) when opened.
- Modify [App.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/App.tsx) and [AppHeader.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/components/layout/AppHeader.tsx) to handle these responsive layout actions and close the sidebar when clicking the backdrop on mobile.

---

### 2. Model List Upgrades & Custom Model Config
- Modify [providers.ts](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/config/providers.ts):
  - **Gemini**: Add `gemini-2.5-flash` (default), `gemini-2.5-pro`, and `gemini-2.0-flash`.
  - **OpenAI**: Add `o3-mini`, `o1`, `gpt-4o-mini`, and `gpt-4o`.
  - **Anthropic**: Add `claude-3-7-sonnet-20250219`.
  - **OpenRouter**: Add `deepseek/deepseek-r1:free`, `google/gemini-2.5-flash:free`, `openai/o3-mini`, and `meta-llama/llama-3.3-70b-instruct`.
  - **Ollama**: Add `deepseek-r1`, `llama3.3`, and `qwen2.5`.
  - **WebGPU**: Use supported WebLLM prebuilt IDs only, with `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` as the balanced default.
- Modify [SettingsPanel.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/settings/SettingsPanel.tsx):
  - Add a text input next to or below the model selection dropdown for all providers. This will display the currently active model and allow the user to type in any arbitrary model ID (e.g. `gpt-5-preview` or `claude-5-sonnet`) directly.

---

### 3. Career Diagnostics Definitions (a11y Compliant)
- Modify [CareerWorkspace.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/career/CareerWorkspace.tsx):
  - Add a clean, keyboard-accessible Help Card containing semantic definitions of **ATS Audit**, **Semantic Suitability**, and **Gap Analysis Matrix**.
  - Ensure correct ARIA descriptions, contrast ratios, and tab indices.

---

### 4. Modular Activity History Workspace
- Create a new directory `src/features/history/` containing:
  - [HistoryWorkspace.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/history/HistoryWorkspace.tsx) [NEW]: Orchestrates state loading from Dexie.
  - [HistoryList.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/history/HistoryList.tsx) [NEW]: Renders search inputs, workspace category tabs, and filters.
  - [HistoryItemCard.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/history/HistoryItemCard.tsx) [NEW]: Individual item preview card with basic actions.
  - [HistoryDetailPanel.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/history/HistoryDetailPanel.tsx) [NEW]: Side-by-side or collapsible detailed view of prompt inputs and generated outputs.
- Update [WorkspaceRouter.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/components/layout/WorkspaceRouter.tsx) and [App.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/App.tsx) to integrate the history workspace.

---

### 5. Local File Selection & Markdown CV Parser
- Create [pdfParser.ts](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/utils/pdfParser.ts) [NEW]:
  - Extract text client-side from local PDF files using a dynamically loaded instance of `pdf.js` from cdnjs.
  - Extract text/formatting from `.docx` files using `mammoth.js` from cdnjs.
- Modify [CareerWorkspace.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/features/career/CareerWorkspace.tsx) to:
  - Add a styled file input element next to the resume text field.
  - Parse the selected file (supporting `.pdf`, `.docx`, `.txt`, `.md`) and automatically set it in the resume text editor.
  - Automatically save the parsed document under the file's name in IndexedDB `documents` so it appears in the stored resume lists.

---

### 6. Light Mode Option
- Modify [useUIStore.ts](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/store/useUIStore.ts) to track `theme: 'dark' | 'light'` (persisted).
- Modify [AppHeader.tsx](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/components/layout/AppHeader.tsx) to show a light/dark toggle button (using Sun/Moon icons).
- Modify [index.css](file:///Volumes/ExternalSSD/dev/me/omnibox-ai/src/index.css) to add class-based style overrides for `html.light` to change dark-mode colors (`bg-zinc-950`, `.glass-panel`, borders, background colors, and typography) into a premium, clean light-mode theme.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify there are no TypeScript compile or bundler errors.
- Run `npm run lint` (`oxlint`) to check for code standard violations.

### Manual Verification
- Test responsiveness in browser desktop/mobile layouts.
- Upload `.pdf` and `.docx` files in Career Workspace to ensure text is parsed and saved properly.
- Switch between Light and Dark mode to confirm styles are consistent.
- Perform diagnostics using Gemini / OpenAI to ensure history saves and displays in the new Activity History page.
