import type { ProviderId } from './types'

// ---------------------------------------------------------------------------
// Individual chunk parsers
// ---------------------------------------------------------------------------

/** Parse an OpenAI / OpenRouter / Ollama SSE data chunk. */
export function parseOpenAIChunk(data: string): string {
  try {
    const parsed = JSON.parse(data)
    return parsed.choices?.[0]?.delta?.content || ''
  } catch {
    return ''
  }
}

/** Parse a Gemini REST SSE data chunk. */
export function parseGeminiChunk(data: string): string {
  try {
    const parsed = JSON.parse(data)
    return parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch {
    return ''
  }
}

/** Parse an Anthropic Messages SSE data chunk. */
export function parseAnthropicChunk(data: string): string {
  try {
    const parsed = JSON.parse(data)
    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
      return parsed.delta.text
    }
    return ''
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Return the correct chunk parser for the given provider.
 *
 * WebGPU never reaches the SSE pipeline so it is not supported here.
 */
export function getChunkParser(provider: ProviderId): (data: string) => string {
  switch (provider) {
    case 'openai':
    case 'openrouter':
    case 'ollama':
      return parseOpenAIChunk
    case 'gemini':
      return parseGeminiChunk
    case 'anthropic':
      return parseAnthropicChunk
    case 'webgpu':
      throw new Error('WebGPU does not use SSE streaming — use useWebLLM instead.')
    default: {
      const _exhaustive: never = provider
      throw new Error(`No parser for provider: ${_exhaustive}`)
    }
  }
}
