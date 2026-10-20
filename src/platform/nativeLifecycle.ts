import { App } from '@capacitor/app'
import { isNativeAndroid } from './runtime'

const activeInference = new Map<AbortController, () => Promise<void>>()

export const registerActiveInference = (controller: AbortController, cancel: () => Promise<void>): (() => void) => {
  activeInference.set(controller, cancel)
  return () => { activeInference.delete(controller) }
}

export const cancelActiveInference = async (): Promise<void> => {
  const requests = [...activeInference]
  activeInference.clear()
  await Promise.allSettled(requests.map(async ([controller, cancel]) => {
    controller.abort()
    await cancel()
  }))
}

export interface AndroidBackHandlers {
  closePalette: () => boolean
  closeSidebar: () => boolean
  dismissOverlay: () => boolean
  goBack: () => void
  exitRoot: () => Promise<void>
}

export const handleAndroidBack = async (canGoBack: boolean, handlers: AndroidBackHandlers): Promise<void> => {
  if (handlers.closePalette() || handlers.closeSidebar() || handlers.dismissOverlay()) return
  if (canGoBack) handlers.goBack()
  else await handlers.exitRoot()
}

export const installAndroidLifecycle = (handlers: Omit<AndroidBackHandlers, 'exitRoot'>): (() => void) => {
  if (!isNativeAndroid()) return () => undefined
  const listeners = [
    App.addListener('backButton', ({ canGoBack }) => {
      void handleAndroidBack(canGoBack, { ...handlers, exitRoot: () => App.minimizeApp() })
    }),
    App.addListener('pause', () => { void cancelActiveInference() }),
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) void cancelActiveInference()
    }),
  ]
  return () => {
    void Promise.all(listeners).then((handles) => handles.forEach((handle) => { void handle.remove() }))
  }
}

export const dismissNativeOverlay = (document: Document): boolean => {
  const overlays = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"], [data-native-back-target]')
  const overlay = overlays[overlays.length - 1]
  if (!overlay) return false
  const targetId = overlay.getAttribute('data-native-back-target')
  const target = targetId ? document.getElementById(targetId) : overlay
  if (!target) return false
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  return true
}
