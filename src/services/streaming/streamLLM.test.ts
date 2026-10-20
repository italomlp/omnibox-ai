import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamLLM } from './index'
import type { StreamCallbacks } from './types'

const credentials = { apiKey: '', baseUrl: 'https://provider.invalid', selectedModel: 'test-model' }
const request = { prompt: 'Synthetic stream fixture' }
const callbacks = () => ({ onChunk: vi.fn(), onComplete: vi.fn(), onError: vi.fn() })
const event = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`

const responseFromBytes = (bytes: Uint8Array) => new Response(new ReadableStream<Uint8Array>({
  start(controller) {
    // Split every UTF-8 byte, including multibyte characters and incomplete SSE lines.
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]))
    controller.close()
  },
}), { headers: { 'Content-Type': 'text/event-stream' } })

afterEach(() => vi.unstubAllGlobals())

describe('streamLLM execution boundary', () => {
  it('preserves split UTF-8 events and completes with the accumulated output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFromBytes(new TextEncoder().encode(event('Olá ') + event('world') + 'data: [DONE]\n\n'))))
    const observer = callbacks()
    await streamLLM('openai', credentials, request, observer, { privacyMode: false })
    expect(observer.onChunk.mock.calls.map(([text]) => text)).toEqual(['Olá ', 'world'])
    expect(observer.onComplete).toHaveBeenCalledExactlyOnceWith('Olá world')
    expect(observer.onError).not.toHaveBeenCalled()
  })

  it('reports HTTP failure without completing or emitting content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Rate limited', { status: 429 })))
    const observer = callbacks()
    await expect(streamLLM('openai', credentials, request, observer, { privacyMode: false })).rejects.toThrow('API error (429): Rate limited')
    expect(observer.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'API error (429): Rate limited' }))
    expect(observer.onComplete).not.toHaveBeenCalled()
    expect(observer.onChunk).not.toHaveBeenCalled()
  })

  it.each(['openai', 'anthropic', 'gemini', 'openrouter'] as const)('blocks %s before fetch in privacy mode', async (provider) => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const observer = callbacks()
    await expect(streamLLM(provider, credentials, request, observer, { privacyMode: true })).rejects.toThrow('Privacy mode blocks cloud provider requests.')
    expect(fetcher).not.toHaveBeenCalled()
    expect(observer.onComplete).not.toHaveBeenCalled()
  })

  it('does not fetch an already cancelled request', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    const controller = new AbortController()
    controller.abort()
    const observer = callbacks()
    await expect(streamLLM('openai', credentials, request, observer, { privacyMode: false }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetcher).not.toHaveBeenCalled()
    expect(observer.onComplete).not.toHaveBeenCalled()
    expect(observer.onError).not.toHaveBeenCalled()
  })

  it('stops callbacks after cancellation during streamed output', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFromBytes(new TextEncoder().encode(event('first') + event('second')))))
    const observer: StreamCallbacks = { onChunk: vi.fn(() => controller.abort()), onComplete: vi.fn(), onError: vi.fn() }
    await expect(streamLLM('openai', credentials, request, observer, { privacyMode: false }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    expect(observer.onChunk).toHaveBeenCalledExactlyOnceWith('first')
    expect(observer.onComplete).not.toHaveBeenCalled()
    expect(observer.onError).not.toHaveBeenCalled()
  })
})
