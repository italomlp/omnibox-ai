// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

import { createNavigationController, type NavigationWindow } from './history'

const createFakeNavigationWindow = (href: string) => {
  const listeners = new Set<() => void>()
  const pushes: Array<{ state: unknown; url: string }> = []
  const replaces: Array<{ state: unknown; url: string }> = []
  const location = { href }

  const applyUrl = (url: string) => {
    location.href = new URL(url, location.href).href
  }

  const window: NavigationWindow & {
    emitPopState: () => void
    pushes: typeof pushes
    replaces: typeof replaces
  } = {
    location,
    history: {
      pushState: (state, _title, url) => {
        pushes.push({ state, url: String(url) })
        applyUrl(String(url))
      },
      replaceState: (state, _title, url) => {
        replaces.push({ state, url: String(url) })
        applyUrl(String(url))
      },
    },
    addEventListener: (type, listener) => {
      if (type === 'popstate') listeners.add(listener)
    },
    removeEventListener: (type, listener) => {
      if (type === 'popstate') listeners.delete(listener)
    },
    emitPopState: () => {
      for (const listener of listeners) listener()
    },
    pushes,
    replaces,
  }

  return window
}

describe('createNavigationController', () => {
  it('syncs, pushes, replaces, and responds to popstate events', () => {
    const window = createFakeNavigationWindow('https://example.test/workspace?workspace=grammar&foo=1#draft')
    const setRoute = vi.fn()
    const controller = createNavigationController({ window, setRoute })

    const stop = controller.start()

    expect(window.replaces).toEqual([
      {
        state: { route: { view: 'tool', tool: 'grammar-tone' } },
        url: '/workspace?foo=1&tool=grammar-tone#draft',
      },
    ])
    expect(setRoute).toHaveBeenNthCalledWith(1, { view: 'tool', tool: 'grammar-tone' })

    controller.navigate({ view: 'system' })
    expect(window.pushes).toEqual([
      {
        state: { route: { view: 'system' } },
        url: '/workspace?foo=1&view=system#draft',
      },
    ])
    expect(setRoute).toHaveBeenNthCalledWith(2, { view: 'system' })

    controller.replace({ view: 'library', section: 'runs' })
    expect(window.replaces).toEqual([
      {
        state: { route: { view: 'tool', tool: 'grammar-tone' } },
        url: '/workspace?foo=1&tool=grammar-tone#draft',
      },
      {
        state: { route: { view: 'library', section: 'runs' } },
        url: '/workspace?foo=1&view=library&section=runs#draft',
      },
    ])
    expect(setRoute).toHaveBeenNthCalledWith(3, { view: 'library', section: 'runs' })

    window.location.href = 'https://example.test/workspace?view=tools&foo=1#draft'
    window.emitPopState()

    expect(setRoute).toHaveBeenNthCalledWith(4, { view: 'tools' })

    const callsBeforeStop = setRoute.mock.calls.length
    stop()
    window.location.href = 'https://example.test/workspace?view=system&foo=1#draft'
    window.emitPopState()

    expect(setRoute.mock.calls.length).toBe(callsBeforeStop)
  })

  it('preserves the deployed project prefix through legacy startup, navigation, and back', () => {
    const window = createFakeNavigationWindow('https://example.test/omnibox-ai/?workspace=grammar')
    const setRoute = vi.fn()
    const controller = createNavigationController({ window, setRoute })
    const stop = controller.start()

    expect(window.location.href).toBe('https://example.test/omnibox-ai/?tool=grammar-tone')
    controller.navigate({ view: 'tool', tool: 'career' })
    expect(window.location.href).toBe('https://example.test/omnibox-ai/?tool=career')
    expect(setRoute).toHaveBeenLastCalledWith({ view: 'tool', tool: 'career' })

    window.location.href = 'https://example.test/omnibox-ai/?tool=grammar-tone'
    window.emitPopState()
    expect(setRoute).toHaveBeenLastCalledWith({ view: 'tool', tool: 'grammar-tone' })
    stop()
  })

  it('does not write history when the target route is already current and canonical', () => {
    const window = createFakeNavigationWindow('https://example.test/workspace?foo=1&view=tools#draft')
    const setRoute = vi.fn()
    const controller = createNavigationController({ window, setRoute })

    controller.start()
    const initialPushCount = window.pushes.length
    const initialReplaceCount = window.replaces.length

    controller.navigate({ view: 'tools' })
    controller.replace({ view: 'tools' })

    expect(window.pushes.length).toBe(initialPushCount)
    expect(window.replaces.length).toBe(initialReplaceCount)
  })
})
