import { describe, expect, it } from 'vitest'

import { harperScalarRangeToUtf16Range } from './harperTextOffsets'

describe('harperScalarRangeToUtf16Range', () => {
  it('preserves offsets for BMP-only text', () => {
    const result = harperScalarRangeToUtf16Range('A grammar issue.', { start: 2, end: 9 })

    expect(result).toEqual({ start: 2, end: 9 })
  })

  it('accounts for an emoji before the diagnostic range', () => {
    const result = harperScalarRangeToUtf16Range('Hi 👋 there', { start: 5, end: 10 })

    expect(result).toEqual({ start: 6, end: 11 })
  })

  it('accounts for each non-BMP scalar before and within a range', () => {
    const result = harperScalarRangeToUtf16Range('😀a🎉bc', { start: 1, end: 4 })

    expect(result).toEqual({ start: 2, end: 6 })
  })

  it('converts scalar boundaries at the start, end, and empty range', () => {
    expect(harperScalarRangeToUtf16Range('😀a', { start: 0, end: 0 })).toEqual({ start: 0, end: 0 })
    expect(harperScalarRangeToUtf16Range('😀a', { start: 2, end: 2 })).toEqual({ start: 3, end: 3 })
  })

  it('rejects invalid, reversed, and out-of-bounds scalar ranges', () => {
    expect(harperScalarRangeToUtf16Range('😀a', { start: -1, end: 1 })).toBeNull()
    expect(harperScalarRangeToUtf16Range('😀a', { start: 2, end: 1 })).toBeNull()
    expect(harperScalarRangeToUtf16Range('😀a', { start: 0.5, end: 1 })).toBeNull()
    expect(harperScalarRangeToUtf16Range('😀a', { start: 0, end: 3 })).toBeNull()
  })
})
