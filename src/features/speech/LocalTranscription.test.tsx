import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalTranscription } from './LocalTranscription'

const speech = vi.hoisted(() => ({ transcribe: vi.fn().mockResolvedValue({ text: 'transcribed' }) }))
vi.mock('@huggingface/transformers', () => ({
  env: { backends: { onnx: { wasm: {} } } },
  pipeline: vi.fn().mockResolvedValue(speech.transcribe),
}))

afterEach(() => vi.unstubAllGlobals())

describe('local transcription', () => {
  it('shows microphone permission errors after loading the local model', async () => {
    vi.stubGlobal('MediaRecorder', class {})
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')) } })
    render(<LocalTranscription onTranscript={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start local recording' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Permission denied'))
    expect(screen.getByRole('button', { name: 'Start local recording' })).toBeEnabled()
  })
  it('reports when microphone recording is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    render(<LocalTranscription onTranscript={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start local recording' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Microphone recording is unavailable'))
  })
  it('releases the microphone if the recorder cannot be constructed', async () => {
    const stop = vi.fn()
    vi.stubGlobal('MediaRecorder', class { constructor() { throw new Error('Recorder failed') } })
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } })
    render(<LocalTranscription onTranscript={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start local recording' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Recorder failed'))
    expect(stop).toHaveBeenCalledOnce()
  })
  it('transcribes long recordings with overlapping chunks', async () => {
    speech.transcribe.mockClear()
    const onTranscript = vi.fn()
    const stop = vi.fn()
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } })
    vi.stubGlobal('MediaRecorder', class {
      state = 'inactive'; mimeType = 'audio/webm'; onstop: (() => void) | null = null
      start() { this.state = 'recording' }
      stop() { this.state = 'inactive'; this.onstop?.() }
    })
    vi.stubGlobal('Blob', class { arrayBuffer() { return Promise.resolve(new ArrayBuffer(1)) } })
    vi.stubGlobal('AudioContext', class { decodeAudioData() { return Promise.resolve({ duration: 65 }) } close() { return Promise.resolve() } })
    vi.stubGlobal('OfflineAudioContext', class { destination = {}; createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn() } } startRendering() { return Promise.resolve({ getChannelData: () => new Float32Array(65 * 16000) }) } })
    render(<LocalTranscription onTranscript={onTranscript} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start local recording' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop and transcribe' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Stop and transcribe' }))
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('transcribed'))
    expect(speech.transcribe).toHaveBeenCalledWith(expect.any(Float32Array), { chunk_length_s: 30, stride_length_s: 5 })
    expect(stop).toHaveBeenCalledOnce()
  })
})
