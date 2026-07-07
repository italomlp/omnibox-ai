# Architectural Decisions — OmniBox AI

This document outlines the core technical architecture decisions, justifications, and implications for OmniBox AI.

---

## 1. Core Framework & Build Tooling
* **Decision:** Vite + React + TypeScript.
* **Justification:** Vite provides the fastest and most lightweight development and compilation loop for static client-side single-page applications. React provides a robust component model suitable for building interactive utility dashboards, and TypeScript ensures strict type safety across our state stores and API router.
* **Implications:** The application compiles entirely to static HTML, JS, and CSS files. It has zero server-side dependencies and can be hosted for free on GitHub Pages, Vercel, or Netlify.

---

## 2. Navigation & Workspace Switcher
* **Decision:** State-based Workspace Switcher (using Zustand).
* **Justification:** Since OmniBox AI is designed as a high-density utility dashboard (similar to a desktop app with a sidebar and main panel), nested URL routes are unnecessary. Implementing a state-driven workspace switcher avoids router bundle weight, routing compiler steps, and the classic "404 on page refresh" issue when hosting SPA routes on static hosting environments like GitHub Pages.
* **Implications:** The active workspace is tracked as a single string ID in the global store. Transitioning between tools is instant and does not trigger page reloads or URL history rewrites.

---

## 3. Styling Stack
* **Decision:** Tailwind CSS v4.
* **Justification:** Tailwind CSS v4 integrates natively with Vite via a dedicated compiler plugin (`@tailwindcss/vite`). It uses a CSS-first configuration format (eliminating `tailwind.config.js`), resulting in faster compilation times, smaller bundle sizes, and seamless styling capabilities.
* **Implications:** Utility classes are compiled at build time. We style the application directly using Tailwind's layout and colors, applying standard glassmorphism filters (`backdrop-blur`) and dark-mode-first colors.

---

## 4. State & Database Storage
* **Decision:** Zustand for global configuration, Dexie.js (IndexedDB) for heavy transaction histories.
* **Justification:** 
  * **Zustand** is a highly performant, minimal state manager. It allows us to manage global configuration (API keys, settings, active provider models, privacy mode) in a central place with automatic persistence via `localStorage`.
  * **Dexie.js** provides a clean, promise-based wrapper around browser `IndexedDB`. This is essential for storing larger amounts of structured data—such as candidate resumes, gap-analysis logs, and past query history logs—which would exceed `localStorage` size limits or degrade UI thread performance.
* **Implications:** Configuration is synced automatically to standard local storage. Deep-work data is saved to IndexedDB, surviving browser refreshes and tab restarts.

---

## 5. Local Inference (Tier 1 WebGPU)
* **Decision:** WebLLM (MLC-LLM) as the primary local LLM engine.
* **Justification:** WebLLM allows us to load, cache, and run small language models (like Gemma-2B or Phi-3-mini) directly inside the browser using WebGPU hardware acceleration. It supports streaming tokens out of the box and provides an OpenAI-compatible API interface.
* **Implications:** Users with compatible GPUs can process writing and grammar tasks with 100% privacy, zero network requests, and zero API costs. Model files (1.5GB to 3GB) are downloaded on first load and cached in browser storage for future instant access.

---

## 6. Secure BYOK API Router & CORS Abstractions
* **Decision:** A custom, REST-based `streamLLM` utility function composed of modular request building, SSE parsing, and stream execution modules making direct `fetch` requests with manual SSE (Server-Sent Events) chunk parsing.
* **Justification:** Using individual npm SDK packages for OpenAI, Anthropic, Gemini, OpenRouter, and Ollama introduces significant dependency bloat. By implementing a lightweight modular streaming client under `src/services/streaming/`:
  * We avoid SDK packages entirely, reducing bundle size.
  * We route OpenAI, OpenRouter, and Ollama requests through a single standard code path since they all support the OpenAI-compatible `/v1/chat/completions` API structure.
  * We handle provider-specific CORS limits directly in the client.
* **CORS Constraints & Mitigations:**
  * **Ollama (Localhost):** The user's local Ollama daemon must be run with CORS enabled (e.g. `OLLAMA_ORIGINS="*"`). The router catches fetch connection drops and alerts the user with setup instructions.
  * **Anthropic:** Anthropic's cloud gateway blocks direct browser requests due to CORS restrictions. The client provides a `Base URL / Proxy` input setting in the UI. Users can either route Anthropic models via **OpenRouter** (which supports Anthropic models and is browser CORS-friendly) or run a local CORS proxy tunnel to direct key requests to Anthropic's servers.
  * **OpenAI & Gemini:** Supported client-side. OpenAI requests use custom headers, and Gemini requests call their standard REST stream endpoint.

---

## 7. Security Backlog: API Key Storage
* **Decision:** Plain `localStorage` for Phase 1. Add a backlog item to upgrade to client-side encryption.
* **Justification:** While `localStorage` is vulnerable to XSS-based theft, implementing client-side encryption (using AES-GCM via the browser's Web Crypto API with a user-supplied master password) adds user workflow friction (entering a password on startup) and development overhead. We prioritize rapid prototype validation in Phase 1 and log the security upgrade for the next release.
* **Mitigation:** The application will not load any external third-party script CDN files, minimizing the vectors for client-side XSS injection.
