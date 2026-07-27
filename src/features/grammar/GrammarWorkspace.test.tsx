import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as ReactDOMServer from 'react-dom/server'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  diagnose: vi.fn(),
  ignoreDiagnostic: vi.fn(),
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
  harperGrammar: { diagnose: mocks.diagnose, ignoreDiagnostic: mocks.ignoreDiagnostic },
}))

vi.mock('../../db/db', () => ({
  db: { history: { add: mocks.historyAdd } },
}))

import { GrammarWorkspace } from './GrammarWorkspace'
import {
  applyLocalGrammarSuggestion,
  dispatchGrammarCheck,
  LOCAL_GRAMMAR_DEBOUNCE_MS,
  shouldApplyLocalGrammarResult,
  shouldApplyInferenceResult,
  shouldApplyLocalSuggestion,
  shouldShowGrammarProviderControls,
} from './grammarWorkspaceHelpers'
import type { LocalGrammarDiagnostic } from './harperGrammar'

const localDiagnostic: LocalGrammarDiagnostic = {
  id: 'lint-1',
  message: 'Use “does not” instead.',
  range: { start: 3, end: 7 },
  sourceText: 'It dont work.',
  suggestions: [{
    replacement: 'does not',
    apply: vi.fn().mockResolvedValue('It does not work.'),
  }],
}

describe('GrammarWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.diagnose.mockResolvedValue({ status: 'ready', diagnostics: [] })
    mocks.ignoreDiagnostic.mockResolvedValue(true)
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
    expect(shouldApplyInferenceResult(4, 5, 1, 1)).toBe(false)
  })

  it('accepts an AI completion when the input revision is unchanged', () => {
    expect(shouldApplyInferenceResult(4, 4, 1, 1)).toBe(true)
  })

  it('rejects an AI completion when the grammar mode changed after execution began', () => {
    expect(shouldApplyInferenceResult(4, 4, 1, 2)).toBe(false)
  })

  it('runs the local service instead of inference and applies its offered suggestion', async () => {
    const apply = vi.fn().mockResolvedValue('The corrected text.')
    mocks.diagnose.mockResolvedValue({
      status: 'ready',
      diagnostics: [{
        ...localDiagnostic,
        suggestions: [{ replacement: 'does not', apply }],
      }],
    })

    const result = await dispatchGrammarCheck('local', 'It dont work.', mocks.diagnose, mocks.runInference)

    expect(mocks.diagnose).toHaveBeenCalledWith('It dont work.')
    expect(mocks.runInference).not.toHaveBeenCalled()
    if (!result || result.status !== 'ready') throw new Error('Expected local grammar diagnostics.')
    await expect(applyLocalGrammarSuggestion(result.diagnostics[0].suggestions[0], 'It dont work.')).resolves.toBe('The corrected text.')
  })

  it('dispatches AI grammar exactly once without a legacy history write', async () => {
    await dispatchGrammarCheck('ai', 'Bonjour.', mocks.diagnose, mocks.runInference)

    expect(mocks.runInference).toHaveBeenCalledTimes(1)
    expect(mocks.historyAdd).not.toHaveBeenCalled()
  })

  it('renders the in-place local diagnostic editor', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<GrammarWorkspace />)

    expect(html).toContain('harper-diagnostic-editor')
    expect(html).toContain('Issues')
    expect(html).not.toContain('Check English Grammar')
    expect(html).toContain('Type or paste text to begin local grammar checking.')
  })

  it('omits a local manual action while retaining explicit AI grammar and tone actions', () => {
    render(<GrammarWorkspace />)

    expect(screen.queryByRole('button', { name: 'Run AI Grammar Check' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Check English Grammar' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /AI Grammar Check/i }))

    expect(screen.getByRole('button', { name: 'Run AI Grammar Check' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shift Tone Style' })).toBeInTheDocument()
  })

  it('documents a short debounce for incremental local relinting', () => {
    expect(LOCAL_GRAMMAR_DEBOUNCE_MS).toBe(350)
  })

  it('rejects a stale local lint completion', () => {
    expect(shouldApplyLocalGrammarResult(3, 4, 7, 7)).toBe(false)
  })

  it('rejects a stale suggestion application before it can replace newer input', () => {
    expect(shouldApplyLocalSuggestion('Original.', 'Edited.', 4, 5)).toBe(false)
  })

  it('accepts a Harper fix against its matching source before relinting the updated text', async () => {
    const apply = vi.fn().mockResolvedValue('Corrected.')
    mocks.diagnose.mockResolvedValue({ status: 'ready', diagnostics: [] })

    const updatedText = await applyLocalGrammarSuggestion({ replacement: 'Corrected.', apply }, 'Original.')
    await dispatchGrammarCheck('local', updatedText ?? '', mocks.diagnose, mocks.runInference)

    expect(mocks.diagnose).toHaveBeenCalledWith('Corrected.')
    expect(mocks.runInference).not.toHaveBeenCalled()
  })

  it('keeps tone rewrite gated behind the explicit AI grammar mode', () => {
    const html = ReactDOMServer.renderToStaticMarkup(<GrammarWorkspace />)

    expect(html).not.toContain('Tone Shifter Sliders')
    expect(html).not.toContain('Shift Tone Style')
    expect(mocks.historyAdd).not.toHaveBeenCalled()
  })

  it('applies a selected Harper suggestion and relints the replacement text', async () => {
    vi.useFakeTimers()
    try {
      mocks.diagnose
        .mockResolvedValueOnce({ status: 'ready', diagnostics: [localDiagnostic] })
        .mockResolvedValue({ status: 'ready', diagnostics: [] })
      render(<GrammarWorkspace />)
      const editor = screen.getByLabelText('Local English grammar editor') as HTMLTextAreaElement

      fireEvent.change(editor, { target: { value: localDiagnostic.sourceText } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LOCAL_GRAMMAR_DEBOUNCE_MS)
      })
      expect(mocks.diagnose).toHaveBeenCalledWith(localDiagnostic.sourceText)

      await act(async () => {
        const actions = screen.getByRole('group', { name: 'Actions for issue 1' })
        fireEvent.click(within(actions).getByRole('button', { name: 'Apply suggestion: does not' }))
        await vi.runAllTimersAsync()
      })

      expect(editor).toHaveValue('It does not work.')
      expect(mocks.diagnose).toHaveBeenLastCalledWith('It does not work.')
      expect(localDiagnostic.suggestions[0].apply).toHaveBeenCalledWith('It dont work.')
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a local issue and immediately relints without invoking inference', async () => {
    vi.useFakeTimers()
    try {
      const ignore = vi.fn().mockResolvedValue(true)
      mocks.diagnose
        .mockResolvedValueOnce({ status: 'ready', diagnostics: [{ ...localDiagnostic, ignore }] })
        .mockResolvedValue({ status: 'ready', diagnostics: [] })
      render(<GrammarWorkspace />)
      const editor = screen.getByLabelText('Local English grammar editor')

      fireEvent.change(editor, { target: { value: localDiagnostic.sourceText } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LOCAL_GRAMMAR_DEBOUNCE_MS)
      })
      fireEvent.click(within(screen.getByRole('group', { name: 'Actions for issue 1' })).getByRole('button', { name: 'Ignore' }))
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(mocks.diagnose).toHaveBeenLastCalledWith(localDiagnostic.sourceText)
      expect(mocks.ignoreDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ id: 'lint-1' }), localDiagnostic.sourceText)
      expect(mocks.runInference).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('dismisses the active popover from the broader Input Snippet surface without blocking its controls', async () => {
    vi.useFakeTimers()
    try {
      mocks.diagnose.mockResolvedValue({ status: 'ready', diagnostics: [localDiagnostic] })
      render(<GrammarWorkspace />)
      const editor = screen.getByLabelText('Local English grammar editor') as HTMLTextAreaElement

      fireEvent.change(editor, { target: { value: localDiagnostic.sourceText } })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LOCAL_GRAMMAR_DEBOUNCE_MS)
      })
      editor.setSelectionRange(4, 4)
      fireEvent.select(editor)
      expect(screen.getByLabelText('Active grammar issue')).toBeInTheDocument()

      fireEvent.pointerDown(screen.getByRole('button', { name: 'Clear input' }))

      expect(screen.queryByLabelText('Active grammar issue')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('defers local linting until IME composition ends', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<GrammarWorkspace />)
    const editor = screen.getByLabelText('Local English grammar editor')

    fireEvent.compositionStart(editor)
    fireEvent.change(editor, { target: { value: 'Composing text.' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOCAL_GRAMMAR_DEBOUNCE_MS)
    })

    expect(mocks.diagnose).not.toHaveBeenCalled()

    fireEvent.compositionEnd(editor)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOCAL_GRAMMAR_DEBOUNCE_MS)
    })

    expect(mocks.diagnose).toHaveBeenCalledWith('Composing text.')
    unmount()
    vi.useRealTimers()
  })

  it('does not render a stale AI completion after changing grammar modes', async () => {
    let complete: ((text: string) => Promise<void>) | undefined
    mocks.runInference.mockImplementation(async (options: { onComplete: (text: string) => Promise<void> }) => {
      complete = options.onComplete
    })
    render(<GrammarWorkspace />)

    fireEvent.click(screen.getByRole('radio', { name: /AI Grammar Check/i }))
    fireEvent.change(screen.getByPlaceholderText('Type or paste text content to rewrite...'), {
      target: { value: 'Original draft.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run AI Grammar Check' }))
    fireEvent.click(screen.getByRole('radio', { name: /Local English grammar/i }))
    const onComplete = complete
    if (!onComplete) throw new Error('Expected the AI inference callback.')
    await act(async () => {
      await onComplete('Late AI rewrite.')
    })

    expect(screen.queryByText('Late AI rewrite.')).not.toBeInTheDocument()
  })
})
