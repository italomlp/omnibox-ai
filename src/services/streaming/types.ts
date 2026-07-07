import type { ProviderId } from '../../config/providers'

/** Payload describing what to send to any LLM provider. */
export interface LLMRequest {
  prompt: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

/** Callbacks wired into the SSE stream lifecycle. */
export interface StreamCallbacks {
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}

/** Provider-agnostic fetch configuration produced by buildProviderRequest. */
export interface ProviderRequestConfig {
  url: string
  headers: HeadersInit
  body: string
}

// ---------------------------------------------------------------------------
// Provider-specific request body shapes
// ---------------------------------------------------------------------------

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Body shape for OpenAI, OpenRouter, and Ollama (OpenAI-compatible). */
export interface OpenAIRequestBody {
  model: string
  messages: OpenAIMessage[]
  temperature: number
  max_tokens: number
  stream: true
}

export interface GeminiPart {
  text: string
}

export interface GeminiContent {
  role: 'user'
  parts: GeminiPart[]
}

/** Body shape for Gemini REST streaming endpoint. */
export interface GeminiRequestBody {
  contents: GeminiContent[]
  generationConfig: {
    temperature: number
    maxOutputTokens: number
  }
}

/** Body shape for Anthropic Messages API. */
export interface AnthropicRequestBody {
  model: string
  max_tokens: number
  messages: { role: 'user'; content: string }[]
  temperature: number
  stream: true
  system?: string
}

export type { ProviderId }
