# Developer Guidelines & Conventions for AI Assistants — OmniBox AI

This document serves as the developer rules guide and project context anchor. Any AI agent modifying this project must adhere strictly to these conventions.

---

## 1. Technical Stack Constraints
* **Client-Only Architecture:** The application must remain a 100% serverless client-side SPA. No backend endpoints, API servers, or Node.js runtime servers. All features must run inside the user's browser sandbox.
* **Tooling:** React 19+, TypeScript (strict mode), Vite.
* **Styling:** Tailwind CSS v4 only. Do NOT create `tailwind.config.js` or install legacy v3 configuration scripts. Use CSS-first definitions inside `src/index.css`.
* **State Store:** Zustand only. Persist store configuration fields to `localStorage` where appropriate.
* **IndexedDB Store:** Dexie.js. Organize transactions and histories using indexed tables.

---

## 2. API Integrations & Streaming Conventions
* **Zero SDK Bloat:** Do NOT install SDK npm packages for OpenAI, Anthropic, Gemini, or OpenRouter. All cloud gateways must be called directly via standard browser `fetch` requests inside `src/services/StreamingClient.ts`.
* **Server-Sent Events (SSE):** Keep stream handlers highly optimized using the browser's `ReadableStream` reader and `TextDecoder` to avoid UI locking.
* **Localhost Daemon (Ollama):** Ollama endpoints should use the OpenAI compatibility path at `/v1/chat/completions`. Intercept connection drops to warn about CORS setup requirements.
* **CORS Restrictions:** Route Anthropic Claude models through OpenRouter by default, or support a custom base/proxy URL from the settings.

---

## 3. WebGPU Inference (WebLLM)
* **Progress Tracking:** WebLLM model loading (Gemma-2B, Phi-3) involves downloading large binary assets (1.5GB+). The UI must always show clear progress indicators (speed in MB/s, percentage, download state).
* **Hardware Validation:** Always verify WebGPU support via `navigator.gpu` before trying to initialize MLC WebLLM engine instances. Fallback gracefully to Ollama or Cloud gateways.

---

## 4. Privacy Toggle Guardrails
* **Privacy Toggle:** Maintain a global Zustand state `privacyMode` flag.
* **Execution Block:** When `privacyMode` is active:
  * Block external requests to OpenAI, Gemini, Anthropic, or OpenRouter.
  * Force all utilities to run through Tier 1 (WebGPU) or Tier 2 (Ollama).
  * Show clear warning overlays if the payload exceeds local model context lengths.

---

## 5. Design & Styling System
* **Theme:** Dark-Mode-First. Slate/Zinc background spectrum (`bg-zinc-950`, `text-zinc-100`).
* **Glassmorphism:** Use `backdrop-blur` and border transparency (`border-zinc-800/50`, `bg-zinc-900/30`) for dashboard components.
* **Glows:** Highlight system processing or local status using subtle indigo, violet, or emerald glowing accents (`shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]`).
* **Micro-Animations:** Use transition wrappers (`transition-all duration-200`) and slight transform scalers for buttons, tabs, and collapsible sidebars.

---

## 6. Development Workflow Rules
* **Conventional Commits:** All git commits must adhere to the Conventional Commits format (e.g., `feat(workspace): build schema translator`, `fix(api): repair sse parser`).
* **Character Limits:** Commit messages must not exceed 90 characters on the subject line.
* **Linting:** Resolve all ESLint / Oxlint warnings before building.
