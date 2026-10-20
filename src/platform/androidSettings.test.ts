import { afterEach, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); vi.resetModules() })

it('discards persisted Android keys, retains preferences, and never writes session keys', async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
  vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
  localStorage.setItem('omnibox-settings-v1', JSON.stringify({ state: { apiKeys: { openai: 'old-secret' }, privacyMode: true }, version: 0 }))
  localStorage.setItem('document-sentinel', 'keep')
  const { useSettingsStore } = await import('../store/useSettingsStore')
  expect(useSettingsStore.getState().apiKeys.openai).toBe('')
  expect(useSettingsStore.getState().privacyMode).toBe(true)
  expect(localStorage.getItem('omnibox-settings-v1')).not.toContain('old-secret')
  useSettingsStore.getState().setApiKey('openai', 'new-session-secret')
  expect(useSettingsStore.getState().apiKeys.openai).toBe('new-session-secret')
  expect(localStorage.getItem('omnibox-settings-v1')).not.toContain('new-session-secret')
  expect(localStorage.getItem('document-sentinel')).toBe('keep')
})

it('continues persisting API keys in the web app', async () => {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
  const { useSettingsStore } = await import('../store/useSettingsStore')
  useSettingsStore.getState().setApiKey('openai', 'web-secret')
  expect(localStorage.getItem('omnibox-settings-v1')).toContain('web-secret')
})
