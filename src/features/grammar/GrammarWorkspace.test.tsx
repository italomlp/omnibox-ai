import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ReactDOMServer from 'react-dom/server'

const mocks = vi.hoisted(() => ({
  diagnose: vi.fn(),
  runInference: vi.fn(),
  historyAdd: vi.fn(),
}))

vi.mock('../../hooks/useInference', () => ({
  useInference: () => ({
    activeProvider: 'webgpu',
    setActiveProvider: vi.fn(),
    selectedModel: 'test-model',
    setSelectedModel: vi.fn(),
    availableProviders: ['webgpu'],
    isProcessing: false,
    errorMsg: null,
    clearError: vi.fn(),
    runInference: mocks.runInference,
    webLLM: { isLoading: false, loadPercent: 0, speed: '', loadProgress: '' },
  }),
}))

vi.mock('./harperGrammar', () => ({
  harperGrammar: { diagnose: mocks.diagnose },
}))

vi.mock('../../db/db', () => ({
  db: { history: { add: mocks.historyAdd } },
}))

import { GrammarWorkspace } from './GrammarWorkspace'
import {
  applyLocalGrammarSuggestion,
  dispatchGrammarCheck,
  shouldApplyInferenceResult,
  shouldShowGrammarProviderControls,
} from './grammarWorkspaceHelpers'

describe('GrammarWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the default private English grammar mode and Harper attribution without inference', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<GrammarWorkspace />)

    expect(html).toContain('Local English grammar')
    expect(html).toContain('English only')
    expect(html).toContain('Powered by Harper')
    expect(mocks.runInference).not.toHaveBeenCalled()
    expect(mocks.diagnose).not.toHaveBeenCalled()
  })

  it('renders an explicit AI grammar option for all-language checking without local provider controls', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<GrammarWorkspace />)

    expect(html).toContain('AI Grammar Check')
    expect(html).toContain('all languages')
    expect(html).not.toContain('AI grammar and tone provider')
  })

  it('shows provider controls only for AI grammar mode', () => {
    expect(shouldShowGrammarProviderControls('local')).toBe(false)
    expect(shouldShowGrammarProviderControls('ai')).toBe(true)
  })

  it('rejects an AI completion when the input changed after execution began', () => {
    expect(shouldApplyInferenceResult(4, 5)).toBe(false)
  })

  it('accepts an AI completion when the input revision is unchanged', () => {
    expect(shouldApplyInferenceResult(4, 4)).toBe(true)
  })

  it('runs the local service instead of inference and applies its offered suggestion', async () => {
    const apply = vi.fn().mockResolvedValue('The corrected text.')
    mocks.diagnose.mockResolvedValue({
      status: 'ready',
      diagnostics: [{ id: 'lint-1', message: 'Use “does not” instead.', suggestions: [{ replacement: 'does not', apply }] }],
    })

    const result = await dispatchGrammarCheck('local', 'It dont work.', mocks.diagnose, mocks.runInference)

    expect(mocks.diagnose).toHaveBeenCalledWith('It dont work.')
    expect(mocks.runInference).not.toHaveBeenCalled()
    if (!result || result.status !== 'ready') throw new Error('Expected local grammar diagnostics.')
    await expect(applyLocalGrammarSuggestion(result.diagnostics[0].suggestions[0])).resolves.toBe('The corrected text.')
  })

  it('dispatches AI grammar exactly once without a legacy history write', async () => {
    await dispatchGrammarCheck('ai', 'Bonjour.', mocks.diagnose, mocks.runInference)

    expect(mocks.runInference).toHaveBeenCalledTimes(1)
    expect(mocks.historyAdd).not.toHaveBeenCalled()
  })

  it('renders local diagnostic controls without textarea highlighting', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<GrammarWorkspace />)

    expect(html).toContain('Local Diagnostics')
    expect(html).toContain('Run a local English grammar check')
    expect(html).not.toContain('mark')
  })

  it('keeps the tone rewrite dispatch available independently of grammar mode', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<GrammarWorkspace />)

    expect(html).toContain('Tone Shifter Sliders')
    expect(html).toContain('Shift Tone Style')
    expect(mocks.historyAdd).not.toHaveBeenCalled()
  })
})
