# Technical Roadmap & Deployment Phases — OmniBox AI

This document maps out the phased development roadmap for OmniBox AI, defining the milestones, target features, and future system expansions.

---

## Phase 1: Foundation, Local Pipeline, & Core Writing/Career Workspaces
*Status: Current Phase*

Focuses on building the serverless infrastructure foundations, local browser execution capabilities, configuration stores, and the initial set of career-focused and writing-focused utilities.

### Infrastructure & Services
* **Zustand Settings Store:** Simple local management of credentials, model bindings, and dark-mode settings.
* **Dexie.js database mapping:** Setup IndexedDB database tables for storing analysis histories, resume documents, and query outputs.
* **Unified REST-based `StreamingClient` class:** Handles Server-Sent Events streaming from OpenAI, OpenRouter, Gemini, and Local Ollama.
* **WebLLM WebGPU Hook:** Validates WebGPU support, loads a small local language model (Gemma-2B or Phi-3), streams response tokens, and reports loading progress.

### WebGPU / Local-First Utilities
* **Grammar & Syntax Anchor:** Automatically resolves grammar, spelling, and structural syntax issues inside text snippets.
* **Tone Shifter Utility:** Modifies input text through high-density sliders representing dimensions like *Diplomatic*, *Executive-Ready*, *Critical*, and *Assertive*.

### Macro Career Suite (Ollama / Cloud BYOK)
* **ATS Optimizer & Parsing Validator:** Identifies keyword anomalies, formatting issues, and compatibility metrics inside candidate resumes.
* **AI Semantic Suitability Indexing:** Compares resumes against target industry expectations from an executive persona perspective.
* **Targeted Job Matrix Comparer:** Runs a side-by-side gap analysis comparing a resume file against a job description text, outputting an enhancement table.

---

## Phase 2: Software Development & Advanced AI Prompting Utilities
*Status: Planned*

Focuses on low-token engineering utilities, schema translations, and prompt optimization. These utilities rely heavily on local Tier 1 (WebGPU) or Tier 2 (Ollama) pipelines to remain free and fast.

### Developer Utilities
* **TypeScript Type & JSDoc Generator:** Scans raw JSON or JavaScript code snippets and generates clean, standard JSDoc comment blocks or strict TypeScript types and interfaces.
* **Schema Translator:** Split-screen translator supporting conversions between SQL schemas, Prisma schemas, and Zod validation objects.
* **Regex to Human Interpreter:** Converts plain-English queries into working regular expressions, or breaks down complex regex patterns into clear, step-by-step human explanations.

### Prompt Engineering Utilities
* **System Prompt Variable Injector:** Scans prompt templates for Mustache-style variables (e.g., `{{USER_RESUME}}`), dynamically rendering them into text fields in the UI (calculated at zero-token client expense).
* **Prompt Token Squeezer:** Minimizes system prompts by removing grammatical redundancy, replacing verbose phrases with shorthand structures, and utilizing symbols, compressing prompts by 30-40% to save tokens.

---

## Phase 3: Interactive Workspaces, AI Testing, & Agentic Pipelines
*Status: Planned*

Focuses on heavy execution pipelines, audio streams, and advanced agentic structures.

### Advanced Engineering Utilities
* **Smart Edge-Case Test Generator:** Evaluates target functions or components and outputs five highly critical test boundary conditions (e.g., zero, null, overflow limits).
* **Structured Git Committer:** Accepts a piped `git diff` output and automatically generates detailed, conventional commits complying with standard semantic versioning rules.
* **Cloud Log-to-JSON Transformer:** Transforms unstructured, messy application log strings into interactive, search-friendly JSON trees.

### Voice & Agentic Coach
* **Technical Interview Simulator:** Interactive audio workspace using the browser's native **Web Speech API** (Speech-to-Text and Text-to-Speech). It streams verbal technical questions, listens to user voice answers, translates them to text, and uses LLM reasoning to grade technical accuracy and delivery style, providing constructive feedback.

---

## Future Enhancements & Backlog
* **Credential Security:** Upgrade API key storage from plain `localStorage` to **AES-GCM Web Crypto API encryption** with a user-supplied master password.
* **Transformers.js RAG Engine:** Integrate Transformers.js to calculate vector embeddings of IndexedDB document histories, enabling local semantic search and local retrieval-augmented generation (RAG) across past workflows.
