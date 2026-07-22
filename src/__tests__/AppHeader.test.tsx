import { describe, it, expect, vi } from 'vitest'
import { AppHeader } from '../components/layout/AppHeader'
import * as ReactDOMServer from 'react-dom/server'

describe('AppHeader', () => {
  const defaultProps = {
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    privacyMode: false,
    sidebarOpen: false,
    onToggleSidebar: vi.fn(),
    isCommandPaletteOpen: false,
    onOpenCommandPalette: vi.fn(),
    theme: 'dark' as const,
    onToggleTheme: vi.fn(),
  }

  it('renders title and subtitle', () => {
    const html = ReactDOMServer.renderToString(<AppHeader {...defaultProps} />)
    expect(html).toContain('Test Title')
    expect(html).toContain('Test Subtitle')
  })

  it('renders responsive buttons', () => {
    const html = ReactDOMServer.renderToString(<AppHeader {...defaultProps} privacyMode={true} />)
    
    // Command palette button text should be present
    expect(html).toContain('Command palette')
    
    // Privacy mode text should be present
    expect(html).toContain('Local-only')
  })
})
