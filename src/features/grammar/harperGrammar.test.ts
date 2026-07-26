// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

import { createHarperGrammarService } from './harperGrammar'

type MockLint = {
  message: () => string
  suggestions: () => { get_replacement_text: () => string }[]
  span?: () => unknown
}

const createMockLinter = (lints: MockLint[] = []) => ({
  setup: vi.fn().mockResolvedValue(undefined),
  lint: vi.fn().mockResolvedValue(lints),
  applySuggestion: vi.fn().mockResolvedValue('The corrected text.'),
  dispose: vi.fn().mockResolvedValue(undefined),
})

describe('Harper grammar service', () => {
  it('maps local diagnostics and applies Harper suggestions to the full text', async () => {
    const lint = {
      message: () => 'Use “does not” instead.',
      suggestions: () => [{ get_replacement_text: () => 'does not' }],
    }
    const linter = createMockLinter([lint])
    const service = createHarperGrammarService(async () => linter as never)

    const result = await service.diagnose('It dont work.')

    expect(result).toMatchObject({
      status: 'ready',
      diagnostics: [{ message: 'Use “does not” instead.', suggestions: [{ replacement: 'does not' }] }],
    })
    if (result.status !== 'ready') throw new Error('Expected ready grammar result.')
    await expect(result.diagnostics[0].suggestions[0].apply()).resolves.toBe('The corrected text.')
    expect(linter.lint).toHaveBeenCalledWith('It dont work.', { language: 'plaintext', dedup: true })
  })

  it('returns stale when an earlier asynchronous lint completes after newer input', async () => {
    let resolveFirstLint: ((lints: MockLint[]) => void) | undefined
    const linter = createMockLinter()
    linter.lint
      .mockImplementationOnce(() => new Promise<MockLint[]>((resolve) => { resolveFirstLint = resolve }))
      .mockResolvedValueOnce([])
    const service = createHarperGrammarService(async () => linter as never)

    const firstResult = service.diagnose('First draft.')
    const secondResult = await service.diagnose('Second draft.')
    resolveFirstLint?.([])

    await expect(firstResult).resolves.toEqual({ status: 'stale' })
    expect(secondResult).toEqual({ status: 'ready', diagnostics: [] })
  })

  it('returns an unavailable setup state without a fallback', async () => {
    const service = createHarperGrammarService(async () => {
      throw new Error('Worker setup failed.')
    })

    await expect(service.diagnose('Text.')).resolves.toEqual({
      status: 'unavailable',
      stage: 'setup',
      message: 'Worker setup failed.',
    })
  })

  it('returns an unavailable lint state when a ready worker fails to lint', async () => {
    const linter = createMockLinter()
    linter.lint.mockRejectedValue(new Error('Lint failed.'))
    const service = createHarperGrammarService(async () => linter as never)

    await expect(service.diagnose('Text.')).resolves.toEqual({
      status: 'unavailable',
      stage: 'lint',
      message: 'Lint failed.',
    })
  })

  it('disposes the initialized worker and creates a new one for a later check', async () => {
    const firstLinter = createMockLinter()
    const secondLinter = createMockLinter()
    const loadLinter = vi.fn()
      .mockResolvedValueOnce(firstLinter)
      .mockResolvedValueOnce(secondLinter)
    const service = createHarperGrammarService(async () => loadLinter() as never)

    await service.diagnose('First text.')
    await service.dispose()
    await service.diagnose('Second text.')

    expect(firstLinter.dispose).toHaveBeenCalledOnce()
    expect(loadLinter).toHaveBeenCalledTimes(2)
    expect(secondLinter.lint).toHaveBeenCalledWith('Second text.', { language: 'plaintext', dedup: true })
  })

  it('retries setup with a fresh worker after a setup failure', async () => {
    const linter = createMockLinter()
    const loadLinter = vi.fn()
      .mockRejectedValueOnce(new Error('Initial setup failed.'))
      .mockResolvedValueOnce(linter)
    const service = createHarperGrammarService(async () => loadLinter() as never)

    await expect(service.diagnose('First text.')).resolves.toMatchObject({ status: 'unavailable', stage: 'setup' })
    await expect(service.diagnose('Second text.')).resolves.toMatchObject({ status: 'ready' })
    expect(loadLinter).toHaveBeenCalledTimes(2)
  })

  it('does not read Harper spans for non-BMP input', async () => {
    const span = vi.fn(() => {
      throw new Error('Span offsets must not be used for JavaScript text.')
    })
    const linter = createMockLinter([{
      message: () => 'Use a replacement.',
      suggestions: () => [],
      span,
    }])
    const service = createHarperGrammarService(async () => linter as never)

    await expect(service.diagnose('Hello 👋 world.')).resolves.toMatchObject({ status: 'ready' })
    expect(span).not.toHaveBeenCalled()
  })
})
