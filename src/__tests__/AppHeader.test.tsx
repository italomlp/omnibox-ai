import { afterEach, describe, it, expect, vi } from 'vitest'
import { AppHeader } from '../components/layout/AppHeader'
import * as ReactDOMServer from 'react-dom/server'
import { render, screen } from '@testing-library/react'

afterEach(() => vi.unstubAllEnvs())

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

  it('exposes release status, feedback, and deployment-relative limitations', () => {
    vi.stubEnv('BASE_URL', '/omnibox-ai/')
    render(<AppHeader {...defaultProps} />)

    expect(screen.getByText('0.1.0-alpha.1 · Early alpha')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Send feedback' })).toHaveAttribute('href', 'https://github.com/italomlp/omnibox-ai/issues')
    expect(screen.getByRole('link', { name: 'Known limitations' })).toHaveAttribute('href', '/omnibox-ai/privacy.html#limitations')
  })

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
