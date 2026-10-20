import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ToolRoutePage } from './ToolRoutePage'

describe('deferred tool routes', () => {
  it.each(['grammar-tone', 'career'] as const)('provides an accessible loading state while %s loads', (toolId) => {
    const html = renderToString(<ToolRoutePage toolId={toolId} onNavigate={vi.fn()} />)
    expect(html).toContain('aria-label="Loading tool workspace"')
    expect(html).toContain('Loading tool workspace…')
  })
})
