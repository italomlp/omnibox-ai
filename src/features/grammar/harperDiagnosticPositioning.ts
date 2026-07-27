export interface DiagnosticPopoverPosition {
  left: number
  top: number
  placement: 'above' | 'below' | 'fallback'
}

export interface TextareaRangePositionInput {
  value: string
  range: { start: number; end: number }
  textareaRect: DOMRect
  rangeRect: DOMRect | undefined
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
  clientTop: number
  clientLeft: number
}

export interface TextareaRangePosition {
  top: number
  left: number
}

export const POPOVER_INSET = 8

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(Math.max(value, minimum), maximum)
)

/**
 * Returns the native textarea scroll position needed to expose a mirror range.
 * Ranges deliberately use JavaScript UTF-16 offsets: this is the coordinate
 * system shared by textarea selection APIs and the Harper range conversion.
 */
export const getTextareaRangePosition = ({
  value,
  range,
  textareaRect,
  rangeRect,
  scrollTop,
  scrollLeft,
  scrollHeight,
  scrollWidth,
  clientHeight,
  clientWidth,
  clientTop,
  clientLeft,
}: TextareaRangePositionInput): TextareaRangePosition | undefined => {
  if (!rangeRect || range.start < 0 || range.end <= range.start || range.end > value.length) return undefined

  const viewportTop = textareaRect.top + clientTop
  const viewportLeft = textareaRect.left + clientLeft
  const viewportBottom = viewportTop + clientHeight
  const viewportRight = viewportLeft + clientWidth
  const top = rangeRect.top < viewportTop
    ? scrollTop + rangeRect.top - viewportTop
    : rangeRect.bottom > viewportBottom
      ? scrollTop + rangeRect.bottom - viewportBottom
      : scrollTop
  const left = rangeRect.left < viewportLeft
    ? scrollLeft + rangeRect.left - viewportLeft
    : rangeRect.right > viewportRight
      ? scrollLeft + rangeRect.right - viewportRight
      : scrollLeft

  return {
    top: clamp(top, 0, Math.max(0, scrollHeight - clientHeight)),
    left: clamp(left, 0, Math.max(0, scrollWidth - clientWidth)),
  }
}

/**
 * Positions the popover in the editor's coordinate space. When a visual
 * mirror range cannot provide a usable rectangle, the popover uses its
 * documented top-start fallback rather than covering an arbitrary viewport.
 */
export const getDiagnosticPopoverPosition = (
  anchorRect: DOMRect | undefined,
  editorRect: DOMRect,
  popoverRect: DOMRect,
): DiagnosticPopoverPosition => {
  const maximumLeft = Math.max(POPOVER_INSET, editorRect.width - popoverRect.width - POPOVER_INSET)
  const maximumTop = Math.max(POPOVER_INSET, editorRect.height - popoverRect.height - POPOVER_INSET)

  if (!anchorRect || anchorRect.width <= 0 || anchorRect.height <= 0) {
    return { left: POPOVER_INSET, top: POPOVER_INSET, placement: 'fallback' }
  }

  const left = clamp(anchorRect.left - editorRect.left, POPOVER_INSET, maximumLeft)
  const below = anchorRect.bottom - editorRect.top + POPOVER_INSET
  if (below + popoverRect.height <= editorRect.height - POPOVER_INSET) {
    return { left, top: below, placement: 'below' }
  }

  const above = anchorRect.top - editorRect.top - popoverRect.height - POPOVER_INSET
  if (above >= POPOVER_INSET) {
    return { left, top: above, placement: 'above' }
  }

  return { left, top: clamp(below, POPOVER_INSET, maximumTop), placement: 'fallback' }
}
