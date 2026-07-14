# Privacy Guardrails

Privacy mode is a hard network boundary.

- Maintain the global Zustand `privacyMode` flag.
- When `privacyMode` is active, block external requests to OpenAI, Gemini, Anthropic, and OpenRouter.
- Force utilities through local tiers: WebGPU/WebLLM first, Ollama second.
- Do not silently load third-party CDN scripts in privacy mode.
- Show clear warnings when local context limits or local-only execution constraints affect the requested task.
- TXT and Markdown parsing can run offline. PDF/DOCX parsing must avoid third-party network loading in privacy mode unless local parser dependencies are vendored and lazy-loaded.
