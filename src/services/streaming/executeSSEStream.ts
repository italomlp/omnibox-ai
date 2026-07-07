import type { ProviderRequestConfig, StreamCallbacks, ProviderId } from './types'
import { OllamaCORSException, AnthropicCORSException } from './errors'

/**
 * Execute a Server-Sent Events stream against a provider endpoint.
 *
 * This is the low-level streaming engine — it handles `fetch`, CORS error
 * detection, `ReadableStream` reading with `TextDecoder`, SSE line parsing,
 * buffer management for incomplete lines, and callback dispatch.
 */
export async function executeSSEStream(
  config: ProviderRequestConfig,
  parser: (data: string) => string,
  callbacks: StreamCallbacks,
  provider: ProviderId,
  signal?: AbortSignal,
): Promise<void> {
  try {
    // -----------------------------------------------------------------------
    // 1. Fetch with optional AbortSignal
    // -----------------------------------------------------------------------
    let response: Response
    try {
      response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: config.body,
        signal,
      })
    } catch (fetchError: unknown) {
      // Network-level failures — likely CORS or server down
      if (provider === 'ollama') {
        throw new OllamaCORSException()
      }
      if (provider === 'anthropic') {
        // Only raise the CORS hint when the request targeted the default
        // Anthropic origin (a custom proxy is unlikely to have the same issue).
        const isDefaultOrigin =
          config.url.startsWith('https://api.anthropic.com')
        if (isDefaultOrigin) {
          throw new AnthropicCORSException()
        }
      }
      throw fetchError
    }

    // -----------------------------------------------------------------------
    // 2. HTTP error handling
    // -----------------------------------------------------------------------
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`API error (${response.status}): ${errorText}`)
    }

    if (!response.body) {
      throw new Error('Response body is not readable.')
    }

    // -----------------------------------------------------------------------
    // 3. Stream reading via ReadableStream + TextDecoder
    // -----------------------------------------------------------------------
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let fullText = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        const content = processSSELine(line, parser)
        if (content) {
          fullText += content
          callbacks.onChunk(content)
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. Flush remaining buffer
    // -----------------------------------------------------------------------
    if (buffer.trim()) {
      const content = processSSELine(buffer, parser)
      if (content) {
        fullText += content
        callbacks.onChunk(content)
      }
    }

    // -----------------------------------------------------------------------
    // 5. Signal completion
    // -----------------------------------------------------------------------
    callbacks.onComplete(fullText)
  } catch (err: unknown) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Process a single SSE line: strip the `data: ` prefix, skip `[DONE]`
 * sentinels and empty lines, then delegate to the provider-specific parser.
 */
function processSSELine(
  raw: string,
  parser: (data: string) => string,
): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('data: ')) {
    const dataStr = trimmed.slice(6)
    if (dataStr === '[DONE]') return ''
    return parser(dataStr)
  }

  return ''
}
