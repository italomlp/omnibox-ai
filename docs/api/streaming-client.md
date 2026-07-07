# Unified AI Streaming Client Specification — OmniBox AI

This document specifies the internal interface, mapping rules, and parsing logic for the custom, zero-dependency REST `StreamingClient` class in OmniBox AI.

---

## 1. Types & Interfaces

The API router operates using unified interfaces that abstract provider-specific terminology.

```typescript
export type InferenceModality = 'WEBGPU' | 'OLLAMA' | 'CLOUD_BYOK';

export interface ProviderConfig {
  providerId: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'webgpu';
  apiKey?: string;
  baseUrl?: string; // Optional custom proxy URL or Ollama daemon URL
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
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}
```

---

## 2. API Endpoint & Payload Mappings

### 2.1 OpenAI, OpenRouter, and Ollama (OpenAI Compatibility Mode)
These three providers share the `/v1/chat/completions` API structure. Our client maps them to a unified handler:

* **OpenAI Base URL:** `https://api.openai.com`
* **OpenRouter Base URL:** `https://openrouter.ai`
* **Ollama Base URL (Default):** `http://localhost:11434`
* **Target Endpoint:** `${baseUrl}/v1/chat/completions`

#### Request Headers:
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer KEY", // Omitted for Ollama if not configured
  "HTTP-Referer": "https://github.com/italomenezes/omnibox-ai", // OpenRouter specific
  "X-Title": "OmniBox AI" // OpenRouter specific
}
```

#### Request Payload:
```json
{
  "model": "selectedModel",
  "messages": [
    { "role": "system", "content": "systemPrompt (optional)" },
    { "role": "user", "content": "prompt" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
```

---

### 2.2 Google Gemini API
Gemini streams responses using standard REST POST endpoints with Server-Sent Events parameters.

* **Target Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

#### Request Headers:
```json
{
  "Content-Type": "application/json"
}
```

#### Request Payload:
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "systemPrompt \n\n User Prompt: prompt" } // System prompt prepended or configured in systemInstruction
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 2048
  }
}
```

---

### 2.3 Anthropic Claude API
Anthropic requires a custom header schema and uses standard Server-Sent Events.

* **Target Endpoint:** `${baseUrl || 'https://api.anthropic.com'}/v1/messages`

#### Request Headers:
```json
{
  "content-type": "application/json",
  "x-api-key": "apiKey",
  "anthropic-version": "2023-06-01",
  "anthropic-dangerously-allow-developer-in-browser": "true"
}
```

#### Request Payload:
```json
{
  "model": "selectedModel",
  "max_tokens": 2048,
  "system": "systemPrompt (optional)",
  "messages": [
    { "role": "user", "content": "prompt" }
  ],
  "stream": true
}
```

---

## 3. Server-Sent Events (SSE) Parsing Logic

Since standard SDKs are not installed, the client uses the browser's native `ReadableStream` reader to parse response buffers on-the-fly.

### 3.1 Standard Stream Reader Loop
1. Acquire a reader from the response body: `const reader = response.body.getReader()`.
2. Initialize a string decoder: `const decoder = new TextDecoder("utf-8")`.
3. In a loop, read buffer chunks: `const { value, done } = await reader.read()`.
4. Decode chunk value: `const chunkStr = decoder.decode(value, { stream: !done })`.
5. Accumulate chunks into a buffer and split by newlines (`\n`).
6. Iterate over lines:
   * Skip empty lines.
   * If line starts with `data: `, extract the trailing JSON content.
   * Special case check: If line matches `data: [DONE]`, terminate parsing.

### 3.2 Provider Token Extractors
* **OpenAI / OpenRouter / Ollama:**
  Parse JSON, read `choices[0].delta.content`.
* **Gemini:**
  Parse JSON, read `candidates[0].content.parts[0].text`.
* **Anthropic:**
  Filter lines for event types. Extract token chunk from `delta.text` when `type` equals `"content_block_delta"`.

---

## 4. CORS Exception Abstractions

The browser blocks network actions if origins are not matched. The `StreamingClient` intercepts errors to provide diagnostic help:

1. **Ollama CORS Interceptor:**
   * If a call to `http://localhost:11434` fails with `TypeError: Failed to fetch` or similar network exception:
   * Throw a specific `OllamaCORSException`.
   * The UI catches this exception and alerts the user to configure CORS on their machine:
     ```bash
     # macOS / Linux command guide
     launchctl setenv OLLAMA_ORIGINS "*"
     # or running in terminal
     OLLAMA_ORIGINS="*" ollama serve
     ```
2. **Anthropic CORS Interceptor:**
   * Direct browser calls to Anthropic's endpoints will fail. The router warns users about browser limitations and suggests:
     * Using their key through OpenRouter.
     * Running a local CORS proxy (e.g. `local-cors-proxy`) and setting the proxy URL as the `Base URL` in settings.
