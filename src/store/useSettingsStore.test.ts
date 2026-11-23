import { describe, expect, it } from 'vitest'
import { useSettingsStore } from './useSettingsStore'

describe('privacy settings', () => {
  it('enables privacy on migration and retains existing configuration', async () => {
    const migrate = useSettingsStore.persist.getOptions().migrate!
    const result = await migrate({ privacyMode: false, allowCloudFallback: true, selectedModels: { ollama: 'custom' } }, 0)
    expect(result).toMatchObject({ privacyMode: true, allowCloudFallback: false, selectedModels: { ollama: 'custom' } })
  })
  it('allows the user to turn privacy off after migration', () => {
    useSettingsStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } })
    useSettingsStore.getState().setPrivacyMode(false)
    expect(useSettingsStore.getState().privacyMode).toBe(false)
    useSettingsStore.getState().setPrivacyMode(true)
  })
})
