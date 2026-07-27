import { describe, expect, it, vi } from 'vitest'
import * as ReactDOMServer from 'react-dom/server'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { HarperDiagnosticEditor } from './HarperDiagnosticEditor'
import { buildDiagnosticSegments } from './harperDiagnosticSegments'
import { getDiagnosticPopoverPosition, getTextareaRangePosition } from './harperDiagnosticPositioning'
import type { LocalGrammarDiagnostic } from './harperGrammar'

const diagnostic: LocalGrammarDiagnostic = {
  id: 'diagnostic-1',
  message: 'Use “does not” instead.',
  range: { start: 3, end: 7 },
  sourceText: 'It dont work.',
  suggestions: [{ replacement: 'does not', apply: vi.fn().mockResolvedValue('It does not work.') }],
}

const createRect = (left: number, top: number, width: number, height: number): DOMRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
} as DOMRect)

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

  it('renders keyboard-reachable issue navigation and concise suggestion chips in scoped action groups', () => {
    render(
      <HarperDiagnosticEditor
        value="It dont work."
        diagnostics={[diagnostic]}
        onChange={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Select issue 1: Use “does not” instead.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select issue 1: Use “does not” instead.' }))

    const actions = within(screen.getByRole('listitem')).getByRole('group', { name: 'Actions for issue 1' })
    const suggestions = within(actions).getByRole('group', { name: 'Apply suggestions for issue 1' })
    expect(within(suggestions).getByText('Apply')).toBeInTheDocument()
    expect(within(suggestions).getByRole('button', { name: 'Apply suggestion: does not' })).toHaveTextContent('does not')
  })

  it('keeps the editor and issues panel in the responsive workspace contract while mirror marks remain decorative', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />,
    )

    expect(html).toContain('class="harper-diagnostic-workspace"')
    expect(html).toContain('class="harper-diagnostic-issues-panel"')
    expect(html).toContain('<div class="harper-diagnostic-highlight-layer" aria-hidden="true">')
    expect(html).not.toContain('role="button"')
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

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)
    const actions = screen.getByRole('group', { name: 'Actions for issue 1' })
    fireEvent.click(within(actions).getByRole('button', { name: 'Apply suggestion: does not' }))

    expect(onApplySuggestion).toHaveBeenCalledWith(diagnostic, 0)
  })

  it('activates the issue that contains the textarea caret and reveals its active state', () => {
    render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)

    expect(screen.getByText('Active issue')).toBeInTheDocument()
    const issuesPanel = screen.getByLabelText('Grammar issues')
    expect(within(issuesPanel).getByText(diagnostic.message).closest('li')).toHaveAttribute('aria-current', 'true')
  })

  it('renders an interactive active-issue popover and applies its suggestion', () => {
    const onApplySuggestion = vi.fn()
    render(
      <HarperDiagnosticEditor
        value="It dont work."
        diagnostics={[diagnostic]}
        onChange={vi.fn()}
        onApplySuggestion={onApplySuggestion}
      />,
    )
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)
    const popover = screen.getByLabelText('Active grammar issue')
    expect(popover).toHaveTextContent(diagnostic.message)
    expect(popover).toHaveAttribute('role', 'region')
    const suggestions = within(popover).getByRole('group', { name: 'Apply suggestions for active grammar issue' })
    expect(within(suggestions).getByText('Apply')).toBeInTheDocument()
    fireEvent.click(within(suggestions).getByRole('button', { name: 'Apply suggestion: does not' }))
    expect(onApplySuggestion).toHaveBeenCalledWith(diagnostic, 0)
  })

  it('applies the same suggestion callback from card and active-popover controls', () => {
    const onApplySuggestion = vi.fn()
    render(
      <HarperDiagnosticEditor
        value="It dont work."
        diagnostics={[diagnostic]}
        onChange={vi.fn()}
        onApplySuggestion={onApplySuggestion}
      />,
    )

    const actions = screen.getByRole('group', { name: 'Actions for issue 1' })
    fireEvent.click(within(actions).getByRole('button', { name: 'Apply suggestion: does not' }))

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)
    fireEvent.click(within(screen.getByLabelText('Active grammar issue')).getByRole('button', { name: 'Apply suggestion: does not' }))

    expect(onApplySuggestion).toHaveBeenNthCalledWith(1, diagnostic, 0)
    expect(onApplySuggestion).toHaveBeenNthCalledWith(2, diagnostic, 0)
  })

  it('renders card suggestion controls for non-active issues', () => {
    const secondDiagnostic: LocalGrammarDiagnostic = {
      ...diagnostic,
      id: 'diagnostic-2',
      message: 'Use “will not” instead.',
      range: { start: 8, end: 12 },
      sourceText: 'It dont wont.',
      suggestions: [{ replacement: 'will not', apply: vi.fn().mockResolvedValue('It dont will not.') }],
    }
    render(
      <HarperDiagnosticEditor
        value="It dont wont."
        diagnostics={[{ ...diagnostic, sourceText: 'It dont wont.' }, secondDiagnostic]}
        onChange={vi.fn()}
        onApplySuggestion={vi.fn()}
      />,
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)

    const secondActions = screen.getByRole('group', { name: 'Actions for issue 2' })
    expect(within(secondActions).getByRole('button', { name: 'Apply suggestion: will not' })).toBeInTheDocument()
  })

  it('dismisses an active popover on pointer-down outside the editor, popover, and issues panel', () => {
    render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)
    expect(screen.getByLabelText('Active grammar issue')).toBeInTheDocument()

    fireEvent.pointerDown(document.body)

    expect(screen.queryByLabelText('Active grammar issue')).not.toBeInTheDocument()
  })

  it('dismisses an active popover when the enclosing Input Snippet signals a surface interaction', () => {
    const { rerender } = render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} dismissPopoverSignal={0} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)
    rerender(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} dismissPopoverSignal={1} />)

    expect(screen.queryByLabelText('Active grammar issue')).not.toBeInTheDocument()
  })

  it('keeps issue messages full-width above a separate wrapping actions group', () => {
    render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)
    const issue = screen.getByText(diagnostic.message).closest('li')
    if (!issue) throw new Error('Expected issue list item.')

    const actions = within(issue).getByRole('group', { name: 'Actions for issue 1' })
    expect(actions).toHaveClass('harper-diagnostic-issue-actions', 'flex-wrap')
    expect(issue.querySelector('.harper-diagnostic-issue-actions')?.previousElementSibling).toHaveTextContent(diagnostic.message)
  })

  it('keeps contextual issue details dismissed after Escape until a new selection activation', () => {
    const { rerender } = render(
      <HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />,
    )
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    textarea.focus()
    textarea.setSelectionRange(3, 7)
    fireEvent.select(textarea)
    fireEvent.keyDown(textarea, { key: 'Escape' })

    expect(screen.queryByLabelText('Active grammar issue')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionStart).toBe(7)
    expect(textarea.selectionEnd).toBe(7)

    rerender(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)

    expect(screen.queryByLabelText('Active grammar issue')).not.toBeInTheDocument()

    textarea.setSelectionRange(4, 4)
    fireEvent.keyUp(textarea, { key: 'ArrowRight' })
    fireEvent.select(textarea)

    expect(screen.getByLabelText('Active grammar issue')).toBeInTheDocument()
  })

  it('uses a bounded top-start fallback when the visual range has no rectangle', () => {
    const position = getDiagnosticPopoverPosition(
      undefined,
      createRect(100, 100, 300, 220),
      createRect(0, 0, 180, 80),
    )

    expect(position).toEqual({ left: 8, top: 8, placement: 'fallback' })
  })

  it('places the popover above its range when below would leave the editor viewport', () => {
    const position = getDiagnosticPopoverPosition(
      createRect(140, 260, 40, 20),
      createRect(100, 100, 300, 220),
      createRect(0, 0, 180, 80),
    )

    expect(position).toEqual({ left: 40, top: 72, placement: 'above' })
  })

  it('refreshes the active popover position when the window layout changes', () => {
    let markTop = 140
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('harper-diagnostic-mark')) return createRect(140, markTop, 40, 20)
      if (this.classList.contains('harper-diagnostic-editor')) return createRect(100, 100, 300, 220)
      if (this.classList.contains('harper-diagnostic-popover')) return createRect(0, 0, 120, 60)
      return createRect(0, 0, 0, 0)
    })
    try {
      render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

      textarea.setSelectionRange(4, 4)
      fireEvent.select(textarea)
      const popover = screen.getByLabelText('Active grammar issue')
      markTop = 260
      fireEvent.resize(window)

      expect(popover).toHaveStyle({ left: '40px', top: '92px' })
    } finally {
      getBoundingClientRect.mockRestore()
    }
  })

  it('refreshes the active popover position when the visual viewport changes', () => {
    let visualViewportOffset = 0
    const visualViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport')
    const visualViewport = new EventTarget()
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('harper-diagnostic-mark')) return createRect(140, 140 + visualViewportOffset, 40, 20)
      if (this.classList.contains('harper-diagnostic-editor')) return createRect(100, 100 + visualViewportOffset, 300, 220)
      if (this.classList.contains('harper-diagnostic-popover')) return createRect(0, 0, 120, 60)
      return createRect(0, 0, 0, 0)
    })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport })
    try {
      render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

      textarea.setSelectionRange(4, 4)
      fireEvent.select(textarea)
      const popover = screen.getByLabelText('Active grammar issue')
      visualViewportOffset = 120
      visualViewport.dispatchEvent(new Event('scroll'))

      expect(popover).toHaveStyle({ left: '40px', top: '68px' })
    } finally {
      getBoundingClientRect.mockRestore()
      if (visualViewportDescriptor) Object.defineProperty(window, 'visualViewport', visualViewportDescriptor)
      else Reflect.deleteProperty(window, 'visualViewport')
    }
  })

  it('calculates an internal textarea scroll position for a Unicode-safe off-screen range', () => {
    const position = getTextareaRangePosition({
      value: 'A😀B dont work.',
      range: { start: 5, end: 9 },
      textareaRect: createRect(100, 100, 300, 120),
      rangeRect: createRect(120, 260, 40, 20),
      scrollTop: 0,
      scrollLeft: 0,
      scrollHeight: 600,
      scrollWidth: 300,
      clientHeight: 120,
      clientWidth: 300,
      clientTop: 0,
      clientLeft: 0,
    })

    expect(position).toEqual({ top: 60, left: 0 })
  })

  it('scrolls the textarea internally to reveal the selected side-panel range', () => {
    const getBoundingClientRect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('harper-diagnostic-mark')) return createRect(120, 260, 40, 20)
      if (this.classList.contains('harper-diagnostic-editor')) return createRect(100, 100, 300, 120)
      return createRect(0, 0, 0, 0)
    })
    try {
    render(<HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    Object.defineProperties(textarea, {
      clientHeight: { configurable: true, value: 120 },
      clientWidth: { configurable: true, value: 300 },
      scrollHeight: { configurable: true, value: 600 },
      scrollWidth: { configurable: true, value: 300 },
    })
    const issue = screen.getByText(diagnostic.message).closest('li')
    if (!issue) throw new Error('Expected issue list item.')
    const scrollActiveIssueIntoView = vi.fn()
    issue.scrollIntoView = scrollActiveIssueIntoView

    fireEvent.click(screen.getByRole('button', { name: 'Select issue 1: Use “does not” instead.' }))

    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionStart).toBe(3)
    expect(textarea.selectionEnd).toBe(7)
    expect(textarea.scrollTop).toBe(160)
    expect(scrollActiveIssueIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    expect(screen.getByText('Active issue')).toBeInTheDocument()
    } finally {
      getBoundingClientRect.mockRestore()
    }
  })

  it('keeps an active issue selected when diagnostics are recreated and resets it when removed', () => {
    const { rerender } = render(
      <HarperDiagnosticEditor value="It dont work." diagnostics={[diagnostic]} onChange={vi.fn()} />,
    )
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(4, 4)
    fireEvent.select(textarea)

    rerender(
      <HarperDiagnosticEditor
        value="It dont work."
        diagnostics={[{ ...diagnostic, id: 'new-lint-request:0' }]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Active issue')).toBeInTheDocument()

    rerender(<HarperDiagnosticEditor value="It dont work." diagnostics={[]} onChange={vi.fn()} />)
    expect(screen.queryByText('Active issue')).not.toBeInTheDocument()
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
