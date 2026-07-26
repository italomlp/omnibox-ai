export interface HarperScalarRange {
  start: number
  end: number
}

export interface Utf16Range {
  start: number
  end: number
}

const isValidScalarRange = ({ start, end }: HarperScalarRange): boolean => {
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end
}

/**
 * Converts a Harper range (Unicode scalar positions) to JavaScript string offsets.
 * Returns null when the range is malformed or falls outside the supplied text.
 */
export const harperScalarRangeToUtf16Range = (
  text: string,
  range: HarperScalarRange,
): Utf16Range | null => {
  if (!isValidScalarRange(range)) return null

  const scalarValues = Array.from(text)
  if (range.end > scalarValues.length) return null

  let utf16Offset = 0
  let start: number | undefined
  let end: number | undefined

  for (let scalarOffset = 0; scalarOffset <= scalarValues.length; scalarOffset += 1) {
    if (scalarOffset === range.start) start = utf16Offset
    if (scalarOffset === range.end) {
      end = utf16Offset
      break
    }

    utf16Offset += scalarValues[scalarOffset].length
  }

  return start === undefined || end === undefined ? null : { start, end }
}
