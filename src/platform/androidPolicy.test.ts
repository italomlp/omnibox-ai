import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { evaluateExecutionPolicy } from '../services/execution/executionPolicy'
import { createBrowserSpeechRecognitionSession, getBrowserSpeechCapabilities, requestBrowserMicrophonePermission, speakBrowserText } from './speech'

afterEach(() => { vi.unstubAllGlobals() })

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
  vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android')
})

describe('Android alpha execution boundaries', () => {
  it.each(['webgpu', 'ollama'])('rejects stale %s selections before execution', (provider) => {
    expect(evaluateExecutionPolicy(false, provider).allowed).toBe(false)
    expect(evaluateExecutionPolicy(true, provider).allowed).toBe(false)
  })
  it('continues to block clouds in privacy mode', () => {
    expect(evaluateExecutionPolicy(true, 'openai').allowed).toBe(false)
    expect(evaluateExecutionPolicy(false, 'openai').allowed).toBe(true)
  })
  it('preserves local provider behavior on the web', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    expect(evaluateExecutionPolicy(true, 'webgpu').allowed).toBe(true)
    expect(evaluateExecutionPolicy(true, 'ollama').allowed).toBe(true)
  })
  it('never starts browser speech or requests the microphone on Android', async () => {
    vi.stubGlobal('speechSynthesis', { speak: () => { throw new Error('Speech must not start') } })
    vi.stubGlobal('SpeechRecognition', class { constructor() { throw new Error('Recognition must not start') } })
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => { throw new Error('Microphone must not start') } } })
    const capabilities = getBrowserSpeechCapabilities(false)
    expect(capabilities.synthesis.supported).toBe(false)
    expect(capabilities.recognition.supported).toBe(false)
    expect(await requestBrowserMicrophonePermission()).toBe('denied')
    expect(createBrowserSpeechRecognitionSession({}, { lang: 'en-US' })).toBeNull()
    expect(speakBrowserText('test', {})).toBeNull()
  })
})
