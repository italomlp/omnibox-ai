import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ request: vi.fn(), create: vi.fn(), start: vi.fn(), cancel: vi.fn() }))
vi.mock('../../hooks/useInference', () => ({ useInference: () => ({ activeProvider: 'webgpu', setActiveProvider: vi.fn(), selectedModel: 'model', setSelectedModel: vi.fn(), availableProviders: ['webgpu'], isProcessing: false, errorMsg: null, clearError: vi.fn(), runInference: vi.fn(), webLLM: { isLoading: false, loadPercent: 0, speed: '', loadProgress: '' } }) }))
vi.mock('../../components/shared/ProviderSelector', () => ({ ProviderSelector: () => null }))
vi.mock('./LocalTranscription', () => ({ LocalTranscription: ({ onTranscript }: { onTranscript: (text: string) => void }) => <button onClick={() => onTranscript('local words')}>Simulate local transcript</button> }))
vi.mock('../../platform/speech', async (importOriginal) => ({ ...await importOriginal<typeof import('../../platform/speech')>(), getBrowserSpeechCapabilities: () => ({ synthesis: { supported: false, note: '', browserDependent: false }, recognition: { supported: true, privacyBlocked: false, verifiedLocalOnly: false, note: '' } }), requestBrowserMicrophonePermission: mocks.request, readBrowserMicrophonePermission: async () => 'prompt', createBrowserSpeechRecognitionSession: mocks.create }))
import { useSettingsStore } from '../../store/useSettingsStore'
import { SpeechStudioToolPage } from './SpeechStudioToolPage'

beforeEach(() => {
  mocks.request.mockReset(); mocks.create.mockReset(); mocks.start.mockReset(); mocks.cancel.mockReset()
  mocks.create.mockReturnValue({ start: mocks.start, cancel: mocks.cancel, stop: vi.fn() })
  useSettingsStore.persist.setOptions({ storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } })
  useSettingsStore.getState().setPrivacyMode(false)
})

describe('speech privacy and transcripts', () => {
  it('does not start browser recognition if privacy is enabled during microphone permission', async () => {
    let resolve!: (value: string) => void
    mocks.request.mockReturnValue(new Promise((done) => { resolve = done }))
    render(<SpeechStudioToolPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Start listening' }))
    await waitFor(() => expect(mocks.request).toHaveBeenCalled())
    act(() => useSettingsStore.getState().setPrivacyMode(true))
    await act(async () => resolve('granted'))
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.start).not.toHaveBeenCalled()
  })
  it('keeps local transcript when browser recognition is cancelled', () => {
    render(<SpeechStudioToolPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Simulate local transcript' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Final transcript')).toHaveValue('local words')
  })
  it('keeps browser and local transcripts in order after cancellation', async () => {
    mocks.request.mockResolvedValue('granted')
    render(<SpeechStudioToolPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Start listening' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalled())
    const handlers = mocks.create.mock.calls[0][0]
    act(() => { handlers.onResult({ resultIndex: 0, results: [{ transcript: 'browser words', isFinal: true }] }); handlers.onEnd() })
    fireEvent.click(screen.getByRole('button', { name: 'Simulate local transcript' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Final transcript')).toHaveValue('browser words local words')
  })
})
