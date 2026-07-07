import type {
  LLMRequest,
  ProviderRequestConfig,
  OpenAIRequestBody,
  OpenAIMessage,
  GeminiRequestBody,
  AnthropicRequestBody,
  ProviderId,
} from './types'

interface ProviderCredentials {
  apiKey: string
  baseUrl: string
  selectedModel: string
}

import { PROVIDER_DEFAULT_URLS } from '../../config/providers'

// ---------------------------------------------------------------------------
// Internal builder helpers
// ---------------------------------------------------------------------------

function buildOpenAICompatible(
  provider: 'openai' | 'openrouter' | 'ollama',
  { apiKey, baseUrl, selectedModel }: ProviderCredentials,
  request: LLMRequest,
): ProviderRequestConfig {
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048 } = request
  const resolvedBase = baseUrl || PROVIDER_DEFAULT_URLS[provider]
  const url = `${resolvedBase}/v1/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = 'OmniBox AI'
  }

  const messages: OpenAIMessage[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const body: OpenAIRequestBody = {
    model: selectedModel,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  }

  return { url, headers, body: JSON.stringify(body) }
}

function buildGemini(
  { apiKey, selectedModel }: ProviderCredentials,
  request: LLMRequest,
): ProviderRequestConfig {
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048 } = request
  const modelName = selectedModel || 'gemini-1.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  let finalPrompt = prompt
  if (systemPrompt) {
    finalPrompt = `${systemPrompt}\n\nUser Input:\n${prompt}`
  }

  const body: GeminiRequestBody = {
    contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  }

  return { url, headers, body: JSON.stringify(body) }
}

function buildAnthropic(
  { apiKey, baseUrl, selectedModel }: ProviderCredentials,
  request: LLMRequest,
): ProviderRequestConfig {
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 2048 } = request
  const defaultBase = PROVIDER_DEFAULT_URLS.anthropic
  const activeBase = baseUrl && baseUrl !== defaultBase ? baseUrl : defaultBase
  const url = `${activeBase}/v1/messages`

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey || '',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerously-allow-developer-in-browser': 'true',
  }

  const body: AnthropicRequestBody = {
    model: selectedModel,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    stream: true,
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  return { url, headers, body: JSON.stringify(body) }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a provider-agnostic `ProviderRequestConfig` ready for `fetch()`.
 *
 * WebGPU is intentionally unsupported here — it must be handled by the
 * `useWebLLM` hook before reaching the streaming pipeline.
 */
export function buildProviderRequest(
  provider: ProviderId,
  config: ProviderCredentials,
  request: LLMRequest,
): ProviderRequestConfig {
  switch (provider) {
    case 'openai':
    case 'openrouter':
    case 'ollama':
      return buildOpenAICompatible(provider, config, request)
    case 'gemini':
      return buildGemini(config, request)
    case 'anthropic':
      return buildAnthropic(config, request)
    case 'webgpu':
      throw new Error('WebGPU mode should be handled by the useWebLLM hook directly.')
    default: {
      const _exhaustive: never = provider
      throw new Error(`Unknown provider: ${_exhaustive}`)
    }
  }
}
