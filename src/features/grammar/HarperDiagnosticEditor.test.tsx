import { describe, expect, it, vi } from 'vitest'
import * as ReactDOMServer from 'react-dom/server'
import { fireEvent, render, screen } from '@testing-library/react'

import { HarperDiagnosticEditor } from './HarperDiagnosticEditor'
import { buildDiagnosticSegments } from './harperDiagnosticSegments'
import type { LocalGrammarDiagnostic } from './harperGrammar'

const diagnostic: LocalGrammarDiagnostic = {
  id: 'diagnostic-1',
  message: 'Use “does not” instead.',
  range: { start: 3, end: 7 },
  sourceText: 'It dont work.',
  suggestions: [{ replacement: 'does not', apply: vi.fn().mockResolvedValue('It does not work.') }],
}

describe('HarperDiagnosticEditor', () => {
  it('renders a controlled native textarea and an aria-hidden diagnostic overlay', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />,
    )

    expect(html).toContain('<textarea')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('<mark class="harper-diagnostic-mark">dont</mark>')
  })

  it('keeps diagnostic ranges synchronized with the current controlled value', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <HarperDiagnosticEditor value="Changed text." diagnostics={[diagnostic]} onChange={vi.fn()} />,
    )

    expect(html).not.toContain('harper-diagnostic-mark')
  })

  it('forwards composition and paste events without replacing native textarea behavior', () => {
    const onCompositionStart = vi.fn()
    const onCompositionEnd = vi.fn()
    const onPaste = vi.fn()
    render(
      <HarperDiagnosticEditor
        value="Text"
        diagnostics={[]}
        onChange={vi.fn()}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        onPaste={onPaste}
      />,
    )
    const textarea = screen.getByRole('textbox')

    fireEvent.compositionStart(textarea)
    fireEvent.compositionEnd(textarea)
    fireEvent.paste(textarea)

    expect(onCompositionStart).toHaveBeenCalledOnce()
    expect(onCompositionEnd).toHaveBeenCalledOnce()
    expect(onPaste).toHaveBeenCalledOnce()
  })

  it('renders keyboard-reachable issue navigation and text-labelled suggestion controls', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <HarperDiagnosticEditor
        value="It dont work."
        diagnostics={[diagnostic]}
        onChange={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(html).toContain('Select issue')
    expect(html).toContain('aria-label="Select issue 1: Use “does not” instead."')
    expect(html).toContain('aria-label="Apply suggestion: does not"')
  })

  it('synchronizes the highlight layer to native textarea scrolling', () => {
    const { container } = render(
      <HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />,
    )
    const textarea = screen.getByRole('textbox')
    const highlightContent = container.querySelector<HTMLElement>('.harper-diagnostic-highlight-content')
    if (!highlightContent) throw new Error('Expected diagnostic highlight content.')

    Object.defineProperty(textarea, 'scrollLeft', { configurable: true, value: 12 })
    Object.defineProperty(textarea, 'scrollTop', { configurable: true, value: 24 })
    fireEvent.scroll(textarea)

    expect(highlightContent.style.transform).toBe('translate(-12px, -24px)')
  })

  it('applies a suggestion through the editor interaction with its complete diagnostic fixture', () => {
    const onApplySuggestion = vi.fn()
    render(
      <HarperDiagnosticEditor
        value="It dont work."
        diagnostics={[diagnostic]}
        onChange={vi.fn()}
        onApplySuggestion={onApplySuggestion}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Apply suggestion: does not' }))

    expect(onApplySuggestion).toHaveBeenCalledWith(diagnostic, 0)
  })

  it('does not produce overlapping marks when Harper reports intersecting diagnostics', () => {
    const overlappingDiagnostic: LocalGrammarDiagnostic = {
      ...diagnostic,
      id: 'diagnostic-2',
      range: { start: 5, end: 9 },
    }

    expect(buildDiagnosticSegments('It dont work.', [diagnostic, overlappingDiagnostic]))
      .toEqual([
        { text: 'It ' },
        { text: 'dont', diagnostic },
        { text: ' work.' },
      ])
  })
})
