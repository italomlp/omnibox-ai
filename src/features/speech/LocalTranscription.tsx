import React, { useEffect, useRef, useState } from 'react'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url'
import moduleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url'
import { LOCAL_SPEECH_MODEL } from '../../config/modelCatalog'

type Props = { onTranscript: (text: string) => void; disabled?: boolean; onActiveChange?: (active: boolean) => void }

export const LocalTranscription: React.FC<Props> = ({ onTranscript, disabled = false, onActiveChange }) => {
  const [status, setStatus] = useState('Ready to download the multilingual Whisper model from Hugging Face and record locally.')
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cancelled = useRef(false)

  useEffect(() => { onActiveChange?.(busy || recording) }, [busy, recording, onActiveChange])

  useEffect(() => () => {
    cancelled.current = true
    if (recorder.current?.state === 'recording') recorder.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const start = async () => {
    setBusy(true)
    cancelled.current = false
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Microphone recording is unavailable in this browser.')
      setStatus('Loading local speech runtime and model from huggingface.co; this may take several minutes.')
      const { pipeline, env } = await import('@huggingface/transformers')
      if (!env.backends.onnx.wasm) throw new Error('Local speech runtime is unavailable.')
      env.backends.onnx.wasm.wasmPaths = { mjs: moduleUrl, wasm: wasmUrl }
      const transcriber = await pipeline('automatic-speech-recognition', LOCAL_SPEECH_MODEL.modelId, { device: 'wasm', dtype: LOCAL_SPEECH_MODEL.dtype, progress_callback: (progress) => {
        if ('progress' in progress && typeof progress.progress === 'number') setStatus(`Downloading local model: ${Math.round(progress.progress)}%`)
      } })
      if (cancelled.current) return
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (cancelled.current) { stream.getTracks().forEach((track) => track.stop()); return }
      streamRef.current = stream
      const chunks: Blob[] = []
      const media = new MediaRecorder(stream)
      recorder.current = media
      media.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      media.onstop = () => {
        recorder.current = null
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setRecording(false)
        if (cancelled.current) return
        setBusy(true)
        setStatus('Transcribing audio on this device…')
        void (async () => {
          const context = new AudioContext()
          try {
            const decoded = await context.decodeAudioData(await new Blob(chunks, { type: media.mimeType }).arrayBuffer())
            const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000)
            const source = offline.createBufferSource()
            source.buffer = decoded
            source.connect(offline.destination)
            source.start()
            const audio = await offline.startRendering()
            const result = await transcriber(audio.getChannelData(0), { chunk_length_s: 30, stride_length_s: 5 })
            if (!cancelled.current) { onTranscript(result.text.trim()); setStatus('Local transcription complete.') }
          } finally { await context.close() }
        })().catch((error: unknown) => { if (!cancelled.current) setStatus(`Transcription failed: ${error instanceof Error ? error.message : String(error)}`) }).finally(() => { if (!cancelled.current) setBusy(false) })
      }
      media.start()
      setRecording(true)
      setStatus('Recording locally. Stop to transcribe.')
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      recorder.current = null
      setStatus(`Local speech unavailable: ${error instanceof Error ? error.message : String(error)}`)
    } finally { if (!cancelled.current) setBusy(false) }
  }

  return <div className="rounded-xl border border-zinc-800 p-3">
    <h4 className="text-sm font-semibold">Local transcription</h4>
    <p className="my-2 text-xs text-zinc-400">Downloads {LOCAL_SPEECH_MODEL.label} from Hugging Face when started. Audio remains on your device.</p>
    <button type="button" disabled={disabled || busy || recording} onClick={() => void start()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Start local recording</button>{' '}
    <button type="button" disabled={!recording} onClick={() => recorder.current?.stop()} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Stop and transcribe</button>
    <p role="status" className="mt-2 text-xs text-zinc-400">{status}</p>
  </div>
}
