import type { ProviderRequestConfig, StreamCallbacks, ProviderId } from './types'
import { OllamaCORSException, AnthropicCORSException } from './errors'

const makeAbortError = (message = 'The request was aborted.') => {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

const isAbortSignalTriggered = (signal?: AbortSignal): boolean => Boolean(signal?.aborted)

const normalizeError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)))

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
  let aborted = isAbortSignalTriggered(signal)
  const abortHandler = () => {
    aborted = true
  }

  signal?.addEventListener('abort', abortHandler)

  try {
    if (aborted) {
      throw makeAbortError()
    }

    let response: Response
    try {
      response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: config.body,
        signal,
      })
    } catch (fetchError: unknown) {
      if (aborted || isAbortSignalTriggered(signal) || isAbortError(fetchError)) {
        throw makeAbortError()
      }

      if (provider === 'ollama') {
        throw new OllamaCORSException()
      }
      if (provider === 'anthropic') {
        const isDefaultOrigin =
          config.url.startsWith('https://api.anthropic.com')
        if (isDefaultOrigin) {
          throw new AnthropicCORSException()
        }
      }
      throw fetchError
    }

    if (aborted || isAbortSignalTriggered(signal)) {
      throw makeAbortError()
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`API error (${response.status}): ${errorText}`)
    }

    if (!response.body) {
      throw new Error('Response body is not readable.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let fullText = ''

    while (true) {
      if (aborted || isAbortSignalTriggered(signal)) {
        throw makeAbortError()
      }

      const { value, done } = await reader.read()
      if (aborted || isAbortSignalTriggered(signal)) {
        throw makeAbortError()
      }

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      buffer = lines.pop() || ''

      for (const line of lines) {
        if (aborted || isAbortSignalTriggered(signal)) {
          throw makeAbortError()
        }

        const content = processSSELine(line, parser)
        if (content) {
          fullText += content
          callbacks.onChunk(content)
        }
      }
    }

    if (aborted || isAbortSignalTriggered(signal)) {
      throw makeAbortError()
    }

    if (buffer.trim()) {
      const content = processSSELine(buffer, parser)
      if (content) {
        fullText += content
        callbacks.onChunk(content)
      }
    }

    if (aborted || isAbortSignalTriggered(signal)) {
      throw makeAbortError()
    }

    callbacks.onComplete(fullText)
  } catch (err: unknown) {
    const error = normalizeError(err)
    if (!isAbortError(error)) {
      callbacks.onError(error)
    }

    throw error
  } finally {
    signal?.removeEventListener('abort', abortHandler)
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
