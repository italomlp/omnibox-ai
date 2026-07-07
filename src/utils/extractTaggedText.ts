export function extractTaggedText(fullText: string, tagName: string, isComplete = false): string {
  const openTag = `<${tagName}>`
  const closeTag = `</${tagName}>`
  
  // 1. Strict XML tag extraction match
  const match = new RegExp(`${openTag}([\\s\\S]*?)${closeTag}`, 'i').exec(fullText)
  if (match) {
    return match[1].trim()
  }
  
  // 2. If open tag exists, extract from there
  const openTagIndex = fullText.toLowerCase().indexOf(openTag)
  if (openTagIndex !== -1) {
    let content = fullText.slice(openTagIndex + openTag.length)
    const closeTagIndex = content.toLowerCase().indexOf(closeTag)
    if (closeTagIndex !== -1) {
      return content.slice(0, closeTagIndex).trim()
    }
    if (isComplete) {
      return content.trim()
    }
    const lastLessThan = content.lastIndexOf('<')
    if (lastLessThan !== -1 && lastLessThan > content.length - closeTag.length - 2) {
      const possibleCloseTag = content.slice(lastLessThan)
      if (closeTag.startsWith(possibleCloseTag.toLowerCase())) {
        return content.slice(0, lastLessThan).trim()
      }
    }
    return content.trim()
  }
  
  // 3. Resilient Fallback: Strip headers, structural tags, and preambles
  let cleaned = fullText
  
  // Clean opening elements (matches [Corrected/Rewritten/Shifted/Shiffted Text]: with flexible spacing/spelling)
  cleaned = cleaned.replace(/^[\s\S]*?<(?:corrected|shifted|shiffted)_text>/i, '')
  cleaned = cleaned.replace(/^[\s\S]*?\[(?:corrected|rewritten|shifted|shiffted)\s+text\]:\s*/i, '')
  
  // Clean closing elements (matches </corrected/shifted/shiffted_text> tags)
  cleaned = cleaned.replace(/<\/(?:corrected|shifted|shiffted)_text>[\s\S]*$/i, '')
  
  // Strip trailing partial tags during stream
  if (!isComplete) {
    const lastLessThan = cleaned.lastIndexOf('<')
    if (lastLessThan !== -1 && lastLessThan > cleaned.length - closeTag.length - 2) {
      const possibleCloseTag = cleaned.slice(lastLessThan)
      if (closeTag.startsWith(possibleCloseTag.toLowerCase())) {
        cleaned = cleaned.slice(0, lastLessThan)
      }
    }
  }
  
  // Delay initial output slightly if no headers/tags are found yet (prevents showing early raw preamble)
  if (!isComplete && fullText.length < 80 && !fullText.includes('[Corrected Text]:') && !fullText.includes('<corrected_text>')) {
    return ''
  }
  
  return cleaned.trim()
}
