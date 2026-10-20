import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const runtime = vi.hoisted(() => ({ loaded: false }))

// The GPU boundary is simulated because jsdom cannot initialize a real GPU.
vi.mock('@mlc-ai/web-llm', () => {
  runtime.loaded = true
  return {
    CreateMLCEngine: async (_model: string, options: { initProgressCallback: (report: { text: string }) => void }) => {
      options.initProgressCallback({ text: 'Loading model... 45.3% 5.43 MB/s' })
      return {
        chat: { completions: { create: async function* () {
          yield { choices: [{ delta: { content: 'Local ' } }] }
          yield { choices: [{ delta: { content: 'result' } }] }
        } } },
        interruptGenerate: () => undefined,
      }
    },
  }
})

import { useWebLLM } from './useWebLLM'

describe('WebLLM runtime loading', () => {
  it('defers runtime evaluation until a supported device explicitly requests a model', async () => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined })
    const unsupported = renderHook(() => useWebLLM())
    expect(runtime.loaded).toBe(false)
    await act(async () => {
      expect(await unsupported.result.current.loadModel('Qwen2.5-1.5B-Instruct-q4f16_1-MLC')).toBeNull()
    })
    expect(unsupported.result.current.error).toContain('WebGPU is not supported')
    expect(runtime.loaded).toBe(false)
    unsupported.unmount()

    Object.defineProperty(navigator, 'gpu', { configurable: true, value: {} })
    const supported = renderHook(() => useWebLLM())
    expect(supported.result.current.isSupported).toBe(true)
    expect(runtime.loaded).toBe(false)

    let output = ''
    await act(async () => {
      output = await supported.result.current.generate('Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Rewrite locally')
    })
    expect(runtime.loaded).toBe(true)
    expect(output).toBe('Local result')
    expect(supported.result.current.loadPercent).toBe(100)
    expect(supported.result.current.speed).toBe('5.43 MB/s')
    expect(supported.result.current.isLoading).toBe(false)
    Reflect.deleteProperty(navigator, 'gpu')
  })
})
