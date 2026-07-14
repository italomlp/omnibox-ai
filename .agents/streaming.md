# Streaming Integrations

Cloud and local provider calls must stay SDK-free.

- Do not install OpenAI, Anthropic, Gemini, OpenRouter, or Ollama SDK packages.
- Implement provider calls with browser `fetch` inside `src/services/streaming/`.
- Keep SSE handlers optimized with `ReadableStream` readers and `TextDecoder`.
- Ollama should use the OpenAI-compatible path at `/v1/chat/completions`.
- Detect local Ollama connection failures and show CORS setup guidance.
- Route Anthropic usage through OpenRouter by default or allow a user-provided base/proxy URL.
- Keep request building, parsing, and stream execution modular.
