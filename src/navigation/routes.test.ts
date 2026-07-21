// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { buildRouteUrl, resolveRoute, routeForLegacyWorkspace } from './routes'

describe('navigation routes', () => {
  it('keeps canonical routes stable', () => {
    const cases = [
      { route: { view: 'workbench' } as const, url: 'https://example.test/?view=workbench' },
      { route: { view: 'tools' } as const, url: 'https://example.test/?view=tools' },
      { route: { view: 'tool', tool: 'grammar-tone' } as const, url: 'https://example.test/?tool=grammar-tone' },
      { route: { view: 'library' } as const, url: 'https://example.test/?view=library' },
      { route: { view: 'library', section: 'runs' } as const, url: 'https://example.test/?view=library&section=runs' },
      { route: { view: 'system' } as const, url: 'https://example.test/?view=system' },
    ]

    for (const { route, url } of cases) {
      const currentUrl = new URL(url)
      const canonicalUrl = buildRouteUrl(route, currentUrl)
      const resolution = resolveRoute(new URL(`https://example.test${canonicalUrl}`))

      expect(canonicalUrl).toBe(new URL(`https://example.test${canonicalUrl}`).pathname + new URL(`https://example.test${canonicalUrl}`).search + new URL(`https://example.test${canonicalUrl}`).hash)
      expect(resolution).toMatchObject({
        route,
        source: 'canonical',
        canonicalUrl,
        shouldReplace: false,
      })
    }
  })

  it('maps legacy workspaces to canonical routes', () => {
    const cases = [
      ['grammar', { view: 'tool', tool: 'grammar-tone' }, '/?tool=grammar-tone'],
      ['career', { view: 'tool', tool: 'career' }, '/?tool=career'],
      ['history', { view: 'library', section: 'runs' }, '/?view=library&section=runs'],
      ['settings', { view: 'system' }, '/?view=system'],
    ] as const

    for (const [workspace, route, canonicalUrl] of cases) {
      expect(routeForLegacyWorkspace(workspace)).toEqual(route)

      const resolution = resolveRoute(new URL(`https://example.test/?workspace=${workspace}`))

      expect(resolution).toMatchObject({
        route,
        source: 'legacy',
        canonicalUrl,
        shouldReplace: true,
      })
    }
  })

  it('rejects conflicting or invalid navigation parameters', () => {
    const cases = [
      ['https://example.test/?view=tools&tool=grammar-tone', '/?view=workbench'],
      ['https://example.test/?tool=grammar-tone&tool=career', '/?view=workbench'],
      ['https://example.test/?view=library&section=unknown', '/?view=workbench'],
    ] as const

    for (const [href, canonicalUrl] of cases) {
      expect(resolveRoute(new URL(href))).toMatchObject({
        route: { view: 'workbench' },
        source: 'invalid',
        canonicalUrl,
        shouldReplace: true,
      })
    }
  })

  it('preserves unrelated query params and hash fragments', () => {
    const currentUrl = new URL('https://example.test/workspace?foo=1&view=tools&bar=2#draft')

    expect(buildRouteUrl({ view: 'tool', tool: 'grammar-tone' }, currentUrl)).toBe(
      '/workspace?foo=1&bar=2&tool=grammar-tone#draft',
    )
  })
})
