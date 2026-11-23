# OmniBox AI Agent Guide

This root file is the quick entry point for agents modifying OmniBox AI. Read the linked files that apply to your task before editing.

## Non-Negotiables
- Keep the app a 100% client-side SPA. Do not add backend endpoints, API servers, or Node.js runtime servers.
- Use React 19+, TypeScript strict mode, Vite, Zustand, Dexie, and Tailwind CSS v4.
- Do not create `tailwind.config.js`; keep Tailwind v4 CSS-first definitions in `src/index.css`.
- Do not install OpenAI, Anthropic, Gemini, or OpenRouter SDK packages. Cloud gateways use browser `fetch` under `src/services/streaming/`.
- Preserve the global `privacyMode` guard: when enabled, block cloud requests and avoid silent third-party network loading.
- Resolve lint warnings before building.
- Name new branches by purpose using prefixes such as `feat/`, `fix/`, `docs/`, or `refactor/`; do not use an agent name as the prefix.
- Use Conventional Commits for commit messages; keep subject lines at most 90 characters.

## Topic Guides
- Architecture: [.agents/architecture.md](.agents/architecture.md)
- Styling: [.agents/styling.md](.agents/styling.md)
- Streaming integrations: [.agents/streaming.md](.agents/streaming.md)
- Privacy guardrails: [.agents/privacy.md](.agents/privacy.md)
- WebLLM/WebGPU: [.agents/webllm.md](.agents/webllm.md)
- Workflow: [.agents/workflow.md](.agents/workflow.md)

## Planning Docs
- Current backlog/status: [docs/refactoring-plan.md](docs/refactoring-plan.md)
- Durable implementation plans: [docs/plans/](docs/plans/)
