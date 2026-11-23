import { describe, expect, it, vi } from 'vitest'
vi.mock('../tools/registry', () => ({ TOOL_REGISTRY_BY_ID: { 'grammar-tone': { id: 'grammar-tone' } }, TOOL_REGISTRY: [{ id: 'grammar-tone', legacyWorkspace: 'grammar' }] }))
import { resolveRoute, routeForLegacyWorkspace } from './routes'
import { createNavigationController } from './history'

describe('disabled tool navigation', () => {
  it('rejects canonical and legacy routes while keeping enabled routes', () => {
    expect(resolveRoute(new URL('https://example.test/?tool=career')).route).toEqual({ view: 'workbench' })
    expect(routeForLegacyWorkspace('career')).toBeNull()
    expect(routeForLegacyWorkspace('grammar')).toEqual({ view: 'tool', tool: 'grammar-tone' })
  })
  it('does not put a disabled route into application state', () => {
    const setRoute = vi.fn()
    const fakeWindow = { location: { href: 'https://example.test/?view=tools' }, history: { pushState: vi.fn(), replaceState: vi.fn() }, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    createNavigationController({ window: fakeWindow, setRoute }).navigate({ view: 'tool', tool: 'career' })
    expect(setRoute).toHaveBeenCalledWith({ view: 'workbench' })
  })
})
