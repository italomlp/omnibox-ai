import { buildRouteUrl, resolveRoute, routesEqual } from './routes'
import type { RouteDescriptor, RouteResolution } from './types'

export interface NavigationWindow {
  location: Pick<Location, 'href'>
  history: Pick<History, 'pushState' | 'replaceState'>
  addEventListener: (type: 'popstate', listener: () => void) => void
  removeEventListener: (type: 'popstate', listener: () => void) => void
}

export interface NavigationControllerOptions {
  window: NavigationWindow
  setRoute: (route: RouteDescriptor) => void
}

export interface NavigationController {
  start: () => () => void
  navigate: (route: RouteDescriptor) => void
  replace: (route: RouteDescriptor) => void
  syncFromLocation: () => RouteResolution
}

export const createNavigationController = ({ window, setRoute }: NavigationControllerOptions): NavigationController => {
  const syncFromLocation = (): RouteResolution => {
    const resolution = resolveRoute(new URL(window.location.href))
    if (resolution.shouldReplace) {
      window.history.replaceState({ route: resolution.route }, '', resolution.canonicalUrl)
    }
    setRoute(resolution.route)
    return resolution
  }

  const writeRoute = (route: RouteDescriptor, method: 'pushState' | 'replaceState') => {
    const currentUrl = new URL(window.location.href)
    const currentResolution = resolveRoute(currentUrl)
    const targetUrl = buildRouteUrl(route, currentUrl)

    if (routesEqual(currentResolution.route, route) && !currentResolution.shouldReplace) return

    window.history[method]({ route }, '', targetUrl)
    setRoute(route)
  }

  return {
    start: () => {
      syncFromLocation()
      const handlePopState = () => { syncFromLocation() }
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    },
    navigate: (route) => writeRoute(route, 'pushState'),
    replace: (route) => writeRoute(route, 'replaceState'),
    syncFromLocation,
  }
}
