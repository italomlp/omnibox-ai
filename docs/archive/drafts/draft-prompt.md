# OmniBox AI — Product Requirements & Technical Architecture Specification
**Version:** 2.0 (Phased Deployment Rollout)
**Author:** Italo Menezes
**Architecture:** Client-Side Static Single Page Application (SPA)
**Hosting Targets:** GitHub Pages, Vercel, Netlify
**License:** Open Source

---

## 1. Executive Summary & Strategy

**OmniBox AI** is an open-source, serverless, Bring-Your-Own-Key (BYOK) technical Swiss Army Knife utility suite. Designed to run completely on the client side, it eliminates persistent backend infrastructure overhead, external database hosting costs, and API billing liabilities for the maintainer.

The application scales execution from quick, single-purpose micro-utilities to multi-step, deep-work macro flows.

### Core Inference Model Hierarchy
To minimize latency and user API costs, OmniBox AI prioritizes execution models from the bottom up:
1. **Tier 1: In-Browser WebGPU Execution (Zero-Setup Local)** — Runs directly inside the browser sandbox using `WebLLM` or `Transformers.js` via small, highly optimized models (e.g., *Phi-3, Gemma-2B*). Completely free, private, and independent of external setup.
2. **Tier 2: Localhost Daemon Integration (Hardware-Accelerated Local)** — Connects via direct client-side fetch calls to a user's locally running `Ollama` daemon (`http://localhost:11434`). Used when tasks exceed browser WebGPU capabilities but must remain entirely private on the user's machine.
3. **Tier 3: Cloud Foundations (BYOK Providers)** — Leverages the user's private API keys (OpenAI, Anthropic, Gemini, OpenRouter) over direct client-to-gateway HTTPS connections for complex, heavy reasoning tasks.

---

## 2. Phased Feature Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│                       OMNIBOX AI                            │
├──────────────────────────────┬──────────────────────────────┤
│ PHASE 1: FOUNDATION          │ PHASE 2: DEV UTILITIES       │
│ • Key/Provider Router        │ • Type & JSDoc Generator     │
│ • Local WebGPU Fallback      │ • SQL ⇄ Prisma ⇄ Zod         │
│ • Grammar & Tone Shifters    │ • Regex ⇄ Human Interpreter │
│ • Core Career Suit Validation│ • Prompt Squeezer & Variable │
├──────────────────────────────┴──────────────────────────────┤
│ PHASE 3: INTERACTIVE AGENTS & ADVANCED SEMANTICS             │
│ • Web Speech Interview Simulator                           │
│ • Edge Case Test Generator & Log-to-JSON Transformer       │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: Foundation, Local Pipeline, & Core Writing/Career Workspaces
*Focus: Build core routing, local storage pipelines, local WebGPU fallback execution, and high-frequency writing/career tools.*

*   **Infrastructure:** Secure Local Credentials UI Manager, Streaming Client Architecture Engine, and Dexie.js (IndexedDB) localized history management.
*   **WebGPU / Local-First Micro-Utilities:**
    *   **Grammar & Syntax Anchor:** Fixes structural syntax errors and runs context-aware punctuation repairs.
    *   **Tone Shifter Utility:** Modifies text snippets via high-density range sliders (e.g., *Diplomatic, Executive-Ready, Critical, Assertive*).
*   **Macro Deep-Work Features (Localhost Ollama or Cloud BYOK):**
    *   **ATS Optimizer & Parsing Validator:** Identifies font grouping compatibility, keyword distribution anomalies, and parsing blockers within resumes.
    *   **AI Semantic Suitability Indexing:** Evaluates structural hierarchy gaps and alignment with industry standards from an executive persona perspective.
    *   **Targeted Job Matrix Comparer:** Map candidate CVs directly against user-defined external Job Descriptions to pinpoint skill omissions.

### Phase 2: Software Development & Advanced AI Prompting Utilities
*Focus: Integrate low-token, text-transformation utilities customized for engineering workflows. High fallback usage of Tier 1 (In-browser WebGPU) models.*

*   **Developer Micro-Utilities:**
    *   **Structural JSDoc & Type Generator:** Maps raw JavaScript/JSON code arrays directly into strict TypeScript interfaces or standard JSDoc structures.
    *   **Schema Translator (SQL ⇄ Prisma ⇄ Zod):** Converts tabular database schemas into validation schemas or native code models via split-screen layouts.
    *   **Regex to Human Interpreter (and vice versa):** Explains cryptic regular expressions or converts plain language requirements into functional regex tokens.
*   **AI Engineering Micro-Utilities:**
    *   **System Prompt Variable Injector:** Parses standard mustache-style tokens (`{{USER_RESUME}}`) within a system prompt and dynamically updates input fields in the UI (0-token execution).
    *   **Prompt "Token Squeezer" (Compressor):** Strips structural redundancy and converts word phrases to symbol expressions to compress prompts by 30-40%.
*   **General Productivity Micro-Utilities:**
    *   **Timezone Meeting Matcher:** Parses raw, conversational descriptions of distributed team locations and maps them to a markdown calendar table.

### Phase 3: Interactive Workspaces, AI Testing, & Agentic Pipelines
*Focus: Deploy resource-intensive features requiring audio, structural execution loops, or sophisticated logic.*

*   **Advanced Engineering Tools:**
    *   **Smart Edge-Case Test Generator:** Analyzes specific function logic blocks to output 5 hyper-targeted boundary test conditions.
    *   **Structured Git Committer:** Accepts output chunks from `git diff` commands and builds compliant conventional commit documentation.
    *   **Raw Log-to-JSON Transformer:** Cleanly formats cluttered cloud application execution outputs into an interactive JSON tree.
*   **Interactive Macro Workspace:**
    *   **Technical Interview Simulator & Coach:** An interactive technical interview sandbox powered by the browser's Web Speech API. It streams vocal questions, captures audio answers, and uses AI to provide actionable feedback on technical precision and soft skills.

---

## 3. Technical & Architectural System Design

```
                 ┌─────────────────────────────┐
                 │    OmniBox AI UI (SPA)      │
                 └──────────────┬──────────────┘
                                │
              Determines Execution Environment
                                │
     ┌──────────────────────────┼──────────────────────────┐
     ▼                          ▼                          ▼
```

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ Tier 1: WebGPU  │        │ Tier 2: Ollama  │        │ Tier 3: BYOK    │
│ (In-Browser)    │        │ (Localhost)     │        │ (Cloud Gate)    │
│ • TransformersJS│        │ • Port 11434    │        │ • Direct HTTPS  │
│ • WebLLM        │        │ • Zero API Cost │        │ • Streaming SSE │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

### 3.1 Inference Engine Selector Interface
```typescript
export type InferenceModality = 'WEBGPU' | 'OLLAMA' | 'CLOUD_BYOK';

export interface ProviderConfig {
  providerId: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'webgpu';
  apiKey?: string;
  baseUrl?: string;
  selectedModel: string;
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string, usageStats?: TokenUsage) => void;
  onError: (error: Error) => void;
}
```

### 3.2 Secure Multi-Provider Storage Schema

All secret credential keys must be routed straight into browser-level memory context routines:

* **API Keys:** Saved via standard browser `localStorage`. They are directly bound to request headers via secure client actions and never traverse external routing layers.
* **Data Integrity & Context History:** Application states, document mappings, and analysis outputs are saved locally to `IndexedDB` via a lightweight wrapper like **Dexie.js**, avoiding data loss between page reloads.

### 3.3 Privacy Hard-Drop Mode Strategy

The application features a global UI **Privacy Toggle**.

When turned on:

* The application blocks external cloud network threads at the client-side router level.
* The routing layer forces all features—including advanced macro workspaces—to run exclusively via local execution pipelines (Tier 1 WebGPU or Tier 2 Ollama).
* If a feature requires a larger context window than local models can handle, the UI clearly displays an isolated warning explaining why the task cannot be run locally.

---

## 4. Architectural Execution Prompts (AI-Ready Templates)

Use the following step-by-step prompts within development agents (such as Cursor, Cline, or OpenCode) to construct OmniBox AI incrementally from scratch:

### Step 1: Baseline Orchestration Router & Streaming Client Component

```text
"Write a production-ready TypeScript API router class for a client-side React SPA that implements a unified Bring-Your-Own-Key orchestration engine. The router must manage connectivity configs for OpenAI, Anthropic, Gemini, OpenRouter, and a Localhost Ollama instance. Provide support for SSE (Server-Sent Events) chunk streaming so text responses update the UI reactively. Include complete client error abstractions to intercept CORS errors for Ollama endpoints (typically hosted on http://localhost:11434), and return explicit setup guidelines when a connection attempt drops."
```

### Step 2: High-Density Workspace Shell & Storage Schema Design

```text
"Create a dense, responsive workspace layout component using Tailwind CSS optimized for heavy daily utility use. The layout must feature a collapsible configurations layout sidebar for key management and provider selections, a central dynamic workspace region switcher, and a session history panel backed by Dexie.js for IndexedDB storage. Minimize outer margin spacing to keep tool content readable and compact. Do not apply flex or grid directly to the root document body elements; manage layout components via standard structural blocks and absolute layout elements."
```

### Step 3: Local-First WebGPU Integration Core

```text
"Implement an explicit execution engine routing layer that initializes WebLLM or Transformers.js to support Tier 1 WebGPU local AI processing inside the browser. Write a wrapper function that verifies browser WebGPU hardware feature flags. If compatible, dynamically load a tiny model variant (like Gemma-2B or Phi-3) to process simple writing workflows locally. Ensure that if WebGPU allocation fails, the routing wrapper catches the exception and falls back to Ollama or a Cloud BYOK provider seamlessly."
```

### Step 4: Split-Screen Macro Career Engineering Suite

```text
"Build a multi-purpose CV Analyzer workspace view component in React. Build out side-by-side text input frames that let users paste a raw Markdown or raw text resume file against an external Target Job Description block. Provide three distinct structured system prompts within the component logic: 1) A strict keyword extraction validator mimicking traditional ATS tracking systems, 2) An expert AI semantic evaluator targeting leadership qualities, and 3) A direct Gap-Analysis comparison model. Output results into structured markdown component views containing actionable enhancement tables."
```
