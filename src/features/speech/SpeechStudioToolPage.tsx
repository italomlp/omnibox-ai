import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Bot, CheckCircle2, Loader2, Mic, MicOff, Pause, Play, RotateCcw, Sparkles, Square, Volume2 } from 'lucide-react'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { SplitPane } from '../../components/tooling/SplitPane'
import { ToolHeader } from '../../components/tooling/ToolHeader'
import { ToolPage } from '../../components/tooling/ToolPage'
import { useInference } from '../../hooks/useInference'
import { useSettingsStore } from '../../store/useSettingsStore'
import {
  createBrowserSpeechRecognitionSession,
  getBrowserSpeechCapabilities,
  pauseBrowserSpeech,
  readBrowserMicrophonePermission,
  requestBrowserMicrophonePermission,
  resumeBrowserSpeech,
  speakBrowserText,
  stopBrowserSpeech,
  subscribeBrowserSpeechVoices,
  type BrowserSpeechRecognitionSession,
  type MicrophonePermissionState,
} from '../../platform/speech'

type SpeechPlaybackState = 'idle' | 'speaking' | 'paused' | 'error'
type RecognitionState = 'idle' | 'requesting-permission' | 'ready' | 'listening' | 'stopping' | 'error'

const buildCleanupPrompt = (transcript: string) => ({
  systemPrompt: [
    'You clean up browser speech transcripts.',
    'Return only the cleaned transcript.',
    'Preserve meaning, speaker intent, and any domain-specific terminology.',
    'Fix punctuation, casing, obvious filler words, and obvious disfluencies.',
    'Do not add commentary, labels, markdown, or explanations.',
  ].join('\n'),
  userPrompt: `Clean up this transcript while preserving meaning:\n\n${transcript.trim()}`,
  temperature: 0.1,
  maxTokens: 1200,
})

const languageLabel = (locale: string): string => {
  try {
    const browserLanguage = typeof navigator !== 'undefined' ? navigator.language : 'en'
    return new Intl.DisplayNames([browserLanguage], { type: 'language' }).of(locale.split('-')[0]) ?? locale
  } catch {
    return locale
  }
}

export const SpeechStudioToolPage: React.FC = () => {
  const inference = useInference()
  const privacyMode = useSettingsStore((state) => state.privacyMode)
  const { activeProvider, setActiveProvider, selectedModel, setSelectedModel, availableProviders, isProcessing, errorMsg, runInference, webLLM } = inference

  const synthesisTextId = useId()
  const synthesisLanguageId = useId()
  const synthesisVoiceId = useId()
  const recognitionTranscriptId = useId()

  const capabilities = useMemo(() => getBrowserSpeechCapabilities(privacyMode), [privacyMode])
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voicesReady, setVoicesReady] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')
  const [speechText, setSpeechText] = useState('')
  const [speechPlaybackState, setSpeechPlaybackState] = useState<SpeechPlaybackState>('idle')
  const [speechStatus, setSpeechStatus] = useState('Enter text to preview browser speech synthesis.')
  const [speechError, setSpeechError] = useState('')

  const [microphonePermission, setMicrophonePermission] = useState<MicrophonePermissionState>('unknown')
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle')
  const [recognitionStatus, setRecognitionStatus] = useState('Browser speech recognition is available when the browser supports it.')
  const [recognitionError, setRecognitionError] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [cleanedTranscript, setCleanedTranscript] = useState('')

  const recognitionSessionRef = useRef<BrowserSpeechRecognitionSession | null>(null)
  const recognitionSessionIdRef = useRef(0)
  const recognitionBaseTranscriptRef = useRef('')
  const recognitionSlotsRef = useRef<Array<{ transcript: string; isFinal: boolean }>>([])

  const selectedLanguageVoices = useMemo(() => {
    if (selectedLanguage === 'auto') return voices
    return voices.filter((voice) => voice.lang === selectedLanguage)
  }, [selectedLanguage, voices])

  const languageOptions = useMemo(() => {
    const unique = new Map<string, string>()
    voices.forEach((voice) => {
      if (!unique.has(voice.lang)) {
        unique.set(voice.lang, voice.lang)
      }
    })
    return [...unique.keys()].sort()
  }, [voices])

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === selectedVoiceURI) ?? selectedLanguageVoices[0] ?? voices[0] ?? null,
    [selectedLanguageVoices, selectedVoiceURI, voices],
  )

  useEffect(() => {
    const unsubscribe = subscribeBrowserSpeechVoices((nextVoices) => {
      setVoices(nextVoices)
      setVoicesReady(true)
    })

    if (!unsubscribe) {
      setVoicesReady(true)
    }

    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!voicesReady || voices.length === 0) {
      setSelectedVoiceURI('')
      return
    }

    const nextVoice = selectedLanguage === 'auto'
      ? voices.find((voice) => voice.voiceURI === selectedVoiceURI) ?? voices[0]
      : voices.find((voice) => voice.lang === selectedLanguage && voice.voiceURI === selectedVoiceURI)
        ?? voices.find((voice) => voice.lang === selectedLanguage)
        ?? voices[0]

    if (nextVoice && nextVoice.voiceURI !== selectedVoiceURI) {
      setSelectedVoiceURI(nextVoice.voiceURI)
    }
  }, [selectedLanguage, selectedVoiceURI, voices, voicesReady])

  useEffect(() => {
    let active = true
    void readBrowserMicrophonePermission().then((permission) => {
      if (active) {
        setMicrophonePermission(permission)
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!privacyMode) return

    if (recognitionState === 'listening' || recognitionState === 'ready' || recognitionState === 'requesting-permission') {
      recognitionSessionIdRef.current += 1
      recognitionSessionRef.current?.cancel()
      recognitionSessionRef.current = null
      recognitionSlotsRef.current = recognitionSlotsRef.current.filter((slot) => slot.isFinal)
      setRecognitionState('idle')
      setRecognitionStatus('Browser speech recognition is disabled while Privacy Mode is enabled because browser recognition may use a browser/vendor service and is not verified local-only.')
      setRecognitionError('Browser speech recognition is disabled in Privacy Mode.')
      setInterimTranscript('')
      syncRecognitionTranscript()
    }
  }, [privacyMode, recognitionState])

  useEffect(() => () => {
    recognitionSessionIdRef.current += 1
    stopBrowserSpeech()
    recognitionSessionRef.current?.cancel()
  }, [])

  const clearSpeechError = () => setSpeechError('')
  const clearRecognitionError = () => setRecognitionError('')

  const handleSpeak = () => {
    clearSpeechError()

    if (!capabilities.synthesis.supported) {
      setSpeechPlaybackState('error')
      setSpeechError('Browser speech synthesis is unavailable in this browser.')
      return
    }

    if (!speechText.trim()) {
      setSpeechPlaybackState('error')
      setSpeechError('Enter text to speak before starting playback.')
      return
    }

    const language = selectedLanguage === 'auto'
      ? selectedVoice?.lang ?? navigator.language ?? 'en-US'
      : selectedLanguage

    const utterance = speakBrowserText(speechText.trim(), {
      voice: selectedVoice,
      lang: language,
      onStart: () => {
        setSpeechPlaybackState('speaking')
        setSpeechStatus(`Speaking with ${selectedVoice?.name ?? 'the browser default voice'}.`)
      },
      onEnd: () => {
        setSpeechPlaybackState('idle')
        setSpeechStatus('Playback finished.')
      },
      onPause: () => {
        setSpeechPlaybackState('paused')
        setSpeechStatus('Playback paused.')
      },
      onResume: () => {
        setSpeechPlaybackState('speaking')
        setSpeechStatus('Playback resumed.')
      },
      onError: (message) => {
        setSpeechPlaybackState('error')
        setSpeechError(message)
        setSpeechStatus('Playback failed.')
      },
    })

    if (!utterance) {
      setSpeechPlaybackState('error')
      setSpeechError('Browser speech synthesis is unavailable in this browser.')
    }
  }

  const handlePauseSpeech = () => {
    clearSpeechError()
    pauseBrowserSpeech()
    setSpeechPlaybackState('paused')
    setSpeechStatus('Playback paused.')
  }

  const handleResumeSpeech = () => {
    clearSpeechError()
    resumeBrowserSpeech()
    setSpeechPlaybackState('speaking')
    setSpeechStatus('Playback resumed.')
  }

  const handleStopSpeech = () => {
    clearSpeechError()
    stopBrowserSpeech()
    setSpeechPlaybackState('idle')
    setSpeechStatus('Playback stopped.')
  }

  const handleRequestMicrophone = async () => {
    clearRecognitionError()
    setRecognitionState('requesting-permission')
    setRecognitionStatus('Requesting microphone permission…')

    const permission = await requestBrowserMicrophonePermission()
    setMicrophonePermission(permission)

    if (permission === 'granted') {
      setRecognitionState('ready')
      setRecognitionStatus('Microphone permission granted. You can start listening.')
      return
    }

    setRecognitionState('error')
    setRecognitionError('Microphone permission was denied or is unavailable.')
    setRecognitionStatus('Microphone permission could not be obtained.')
  }

  const syncRecognitionTranscript = () => {
    const finalText = recognitionSlotsRef.current.filter((slot) => slot.isFinal && slot.transcript.trim()).map((slot) => slot.transcript.trim()).join(' ')
    const interimText = recognitionSlotsRef.current.filter((slot) => !slot.isFinal && slot.transcript.trim()).map((slot) => slot.transcript.trim()).join(' ')
    const prefix = recognitionBaseTranscriptRef.current.trim()
    setFinalTranscript(prefix ? [prefix, finalText].filter(Boolean).join(' ') : finalText)
    setInterimTranscript(interimText)
  }

  const handleStartListening = async () => {
    clearRecognitionError()
    setCleanedTranscript('')

    if (privacyMode) {
      setRecognitionState('error')
      setRecognitionError('Browser speech recognition is disabled in Privacy Mode.')
      setRecognitionStatus('Recognition is blocked because browser speech recognition may use a browser/vendor service and is not verified local-only.')
      return
    }

    if (!capabilities.recognition.supported) {
      setRecognitionState('error')
      setRecognitionError('Browser speech recognition is unavailable in this browser.')
      setRecognitionStatus('Recognition is unavailable.')
      return
    }

    if (microphonePermission !== 'granted') {
      const permission = await requestBrowserMicrophonePermission()
      setMicrophonePermission(permission)
      if (permission !== 'granted') {
        setRecognitionState('error')
        setRecognitionError('Microphone permission is required to start recognition.')
        setRecognitionStatus('Recognition could not start without microphone permission.')
        return
      }
    }

    recognitionSessionIdRef.current += 1
    const sessionId = recognitionSessionIdRef.current
    recognitionSessionRef.current?.cancel()
    recognitionSlotsRef.current = []
    recognitionBaseTranscriptRef.current = finalTranscript.trim()
    setRecognitionState('ready')
    setRecognitionStatus('Starting browser speech recognition…')

    const session = createBrowserSpeechRecognitionSession(
      {
        onStart: () => {
          if (recognitionSessionIdRef.current !== sessionId) return
          setRecognitionState('listening')
          setRecognitionStatus('Listening for speech.')
        },
        onEnd: () => {
          if (recognitionSessionIdRef.current !== sessionId) return
          setRecognitionSession(null)
        },
        onError: (message) => {
          if (recognitionSessionIdRef.current !== sessionId) return
          setRecognitionState('error')
          setRecognitionError(message)
          setRecognitionStatus('Speech recognition stopped with an error.')
        },
        onResult: ({ resultIndex, results }) => {
          if (recognitionSessionIdRef.current !== sessionId) return
          const current = [...recognitionSlotsRef.current]
          results.forEach((result, offset) => {
            current[resultIndex + offset] = { transcript: result.transcript, isFinal: result.isFinal }
          })
          recognitionSlotsRef.current = current
          syncRecognitionTranscript()
        },
      },
      {
        lang: selectedLanguage === 'auto' ? navigator.language || 'en-US' : selectedLanguage,
        continuous: true,
        interimResults: true,
      },
    )

    if (!session) {
      setRecognitionState('error')
      setRecognitionError('Browser speech recognition is unavailable in this browser.')
      setRecognitionStatus('Recognition could not be created.')
      return
    }

    recognitionSessionRef.current = session

    try {
      session.start()
    } catch {
      if (recognitionSessionIdRef.current !== sessionId) return
      setRecognitionState('error')
      setRecognitionError('The browser rejected the recognition start request.')
      setRecognitionStatus('Recognition could not start.')
      recognitionSessionRef.current = null
    }
  }

  const setRecognitionSession = (session: BrowserSpeechRecognitionSession | null) => {
    recognitionSessionRef.current = session
    if (!session) {
      setRecognitionState('idle')
      setRecognitionStatus('Recognition stopped.')
      setInterimTranscript('')
      syncRecognitionTranscript()
    }
  }

  const handleStopListening = () => {
    clearRecognitionError()
    recognitionSessionIdRef.current += 1
    recognitionSessionRef.current?.stop()
    recognitionSessionRef.current = null
    setRecognitionState('idle')
    setRecognitionStatus('Recognition stopped.')
    recognitionSlotsRef.current = recognitionSlotsRef.current.filter((slot) => slot.isFinal)
    syncRecognitionTranscript()
  }

  const handleCancelListening = () => {
    clearRecognitionError()
    recognitionSessionIdRef.current += 1
    recognitionSessionRef.current?.cancel()
    recognitionSessionRef.current = null
    recognitionSlotsRef.current = []
    setRecognitionState('idle')
    setRecognitionStatus('Recognition cancelled.')
    setInterimTranscript('')
    syncRecognitionTranscript()
  }

  const handleClearTranscript = () => {
    recognitionSlotsRef.current = []
    recognitionBaseTranscriptRef.current = ''
    setFinalTranscript('')
    setInterimTranscript('')
    setCleanedTranscript('')
    setRecognitionStatus('Transcript cleared.')
  }

  const handleCleanupTranscript = async () => {
    const transcript = finalTranscript.trim()
    if (!transcript) return

    setCleanedTranscript('')

    const prompt = buildCleanupPrompt(transcript)
    await runInference({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      toolId: 'speech-studio',
      toolVersion: 1,
      actionId: 'cleanup',
      onChunk: (chunk) => {
        setCleanedTranscript((current) => current + chunk)
      },
      onComplete: (fullText) => {
        setCleanedTranscript(fullText)
      },
    })
  }

  const canCleanTranscript = Boolean(finalTranscript.trim()) && !isProcessing
  const recognitionBlockedByPrivacy = privacyMode && capabilities.recognition.supported

  return (
    <ToolPage>
      <ToolHeader
        eyebrow="Developer Workbench"
        title="Speech Studio"
        description="Use browser speech synthesis and browser speech recognition with honest capability and privacy messaging. Browser recognition may rely on a browser or vendor service, so it is not treated as local-only."
        icon={<Volume2 className="h-5 w-5 text-indigo-400" />}
        actions={(
          <ProviderSelector
            activeProvider={activeProvider}
            onProviderChange={setActiveProvider}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            availableProviders={availableProviders}
          />
        )}
      />

      <WebGPULoadingOverlay
        isLoading={activeProvider === 'webgpu' && webLLM.isLoading}
        selectedModel={selectedModel}
        loadPercent={webLLM.loadPercent}
        speed={webLLM.speed}
        loadProgress={webLLM.loadProgress}
      />

      <ErrorAlert errorMsg={errorMsg} activeProvider={activeProvider} onDismiss={inference.clearError} title="Cleanup failed" />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Speech synthesis</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            {capabilities.synthesis.supported ? 'Available' : 'Unavailable'}
          </div>
          <p className="mt-2 text-xs leading-6 text-zinc-400">{capabilities.synthesis.note}</p>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Speech recognition</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
            <Mic className="h-4 w-4 text-indigo-400" />
            {capabilities.recognition.supported ? (recognitionBlockedByPrivacy ? 'Blocked by Privacy Mode' : 'Available') : 'Unavailable'}
          </div>
          <p className="mt-2 text-xs leading-6 text-zinc-400">{capabilities.recognition.note}</p>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Privacy</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
            <CheckCircle2 className={`h-4 w-4 ${privacyMode ? 'text-emerald-400' : 'text-zinc-500'}`} />
            {privacyMode ? 'Privacy Mode is on' : 'Privacy Mode is off'}
          </div>
          <p className="mt-2 text-xs leading-6 text-zinc-400">
            Browser recognition is disabled in Privacy Mode unless a verified local-only implementation exists.
          </p>
        </div>
      </section>

      <SplitPane
        left={(
          <section className="surface-nested flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-800/40 p-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Text-to-speech</h3>
              <p className="text-xs leading-relaxed text-zinc-400">Preview browser speech synthesis with explicit voice and language selection when available.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor={synthesisTextId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Text to speak</label>
              <textarea
                id={synthesisTextId}
                value={speechText}
                onChange={(event) => {
                  setSpeechText(event.target.value)
                  clearSpeechError()
                }}
                placeholder="Type or paste text for browser speech synthesis."
                className="min-h-40 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor={synthesisLanguageId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Language</label>
                <select
                  id={synthesisLanguageId}
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="control-standard w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500"
                  disabled={!capabilities.synthesis.supported || !voicesReady}
                >
                  <option value="auto">Browser default</option>
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>{languageLabel(language)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor={synthesisVoiceId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Voice</label>
                <select
                  id={synthesisVoiceId}
                  value={selectedVoiceURI}
                  onChange={(event) => setSelectedVoiceURI(event.target.value)}
                  className="control-standard w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500"
                  disabled={!capabilities.synthesis.supported || !voicesReady || voices.length === 0}
                >
                  {selectedLanguageVoices.length > 0 ? selectedLanguageVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.default ? ' · default' : ''}</option>
                  )) : voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.default ? ' · default' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {!capabilities.synthesis.supported ? (
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-200">
                Browser speech synthesis is unsupported in this browser.
              </div>
            ) : null}

            {capabilities.synthesis.supported && !voicesReady ? (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3 text-sm text-zinc-300">
                Loading browser voices…
              </div>
            ) : null}

            {capabilities.synthesis.supported && voicesReady && voices.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3 text-sm text-zinc-300">
                The browser reported no available voices.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleSpeak} className="inline-flex items-center gap-2 rounded-lg border border-indigo-700/60 bg-indigo-950/40 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-500 hover:bg-indigo-950/60 disabled:cursor-not-allowed disabled:opacity-50" disabled={!capabilities.synthesis.supported || !speechText.trim()}>
                <Play className="h-4 w-4" />
                Play
              </button>
              <button type="button" onClick={handlePauseSpeech} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={speechPlaybackState !== 'speaking'}>
                <Pause className="h-4 w-4" />
                Pause
              </button>
              <button type="button" onClick={handleResumeSpeech} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={speechPlaybackState !== 'paused'}>
                <Play className="h-4 w-4" />
                Resume
              </button>
              <button type="button" onClick={handleStopSpeech} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={speechPlaybackState === 'idle'}>
                <Square className="h-4 w-4" />
                Stop
              </button>
            </div>

            <div aria-live="polite" className="rounded-xl border border-zinc-800/60 bg-zinc-950/80 p-3 text-sm text-zinc-300">
              <div className="flex items-center gap-2 font-medium text-zinc-100">
                <Volume2 className="h-4 w-4 text-indigo-400" />
                Playback state: {speechPlaybackState}
              </div>
              <p className="mt-1 leading-6 text-zinc-400">{speechStatus}</p>
            </div>

            {speechError ? (
              <div role="alert" className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-sm text-rose-200">
                <div className="flex items-center justify-between gap-3">
                  <span>{speechError}</span>
                  <button type="button" onClick={clearSpeechError} className="text-xs font-medium text-rose-300 underline-offset-2 hover:underline">Dismiss</button>
                </div>
              </div>
            ) : null}
          </section>
        )}
        right={(
          <section className="surface-nested flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-800/40 p-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Speech recognition</h3>
              <p className="text-xs leading-relaxed text-zinc-400">Request microphone access, listen with interim and final transcript separation, and clean up the transcript only after it exists.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Browser support</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">{capabilities.recognition.supported ? 'Supported' : 'Unsupported'}</div>
                <p className="mt-1 text-xs leading-6 text-zinc-400">{capabilities.recognition.note}</p>
              </div>

              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Microphone</div>
                <div className="mt-1 text-sm font-medium text-zinc-100">{microphonePermission}</div>
                <p className="mt-1 text-xs leading-6 text-zinc-400">Permission is requested explicitly before listening starts.</p>
              </div>
            </div>

            {recognitionBlockedByPrivacy ? (
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100">
                Browser speech recognition is disabled in Privacy Mode because it may use a browser or vendor service and is not verified local-only.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleRequestMicrophone} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={!capabilities.recognition.supported || privacyMode || recognitionState === 'requesting-permission'}>
                <MicOff className="h-4 w-4" />
                Request microphone
              </button>
              <button type="button" onClick={handleStartListening} className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-500 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!capabilities.recognition.supported || recognitionBlockedByPrivacy || recognitionState === 'listening' || recognitionState === 'requesting-permission'}>
                <Mic className="h-4 w-4" />
                Start listening
              </button>
              <button type="button" onClick={handleStopListening} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={recognitionState !== 'listening'}>
                <Square className="h-4 w-4" />
                Stop
              </button>
              <button type="button" onClick={handleCancelListening} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={recognitionState === 'idle' && !finalTranscript && !interimTranscript}>
                <RotateCcw className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div aria-live="polite" className="rounded-xl border border-zinc-800/60 bg-zinc-950/80 p-3 text-sm text-zinc-300">
              <div className="flex items-center gap-2 font-medium text-zinc-100">
                <Mic className="h-4 w-4 text-indigo-400" />
                Listening state: {recognitionState}
              </div>
              <p className="mt-1 leading-6 text-zinc-400">{recognitionStatus}</p>
            </div>

            {recognitionError ? (
              <div role="alert" className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-sm text-rose-200">
                <div className="flex items-center justify-between gap-3">
                  <span>{recognitionError}</span>
                  <button type="button" onClick={clearRecognitionError} className="text-xs font-medium text-rose-300 underline-offset-2 hover:underline">Dismiss</button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label htmlFor={recognitionTranscriptId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Final transcript</label>
                <textarea
                  id={recognitionTranscriptId}
                  readOnly
                  value={finalTranscript}
                  placeholder="Final transcript appears here."
                  className="min-h-36 w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Interim transcript</div>
                  <button type="button" onClick={handleClearTranscript} className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">Clear transcript</button>
                </div>
                <div className="min-h-36 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-3 text-sm leading-6 text-zinc-300">
                  {interimTranscript ? interimTranscript : <span className="text-zinc-600">Live recognition text appears here while the browser is listening.</span>}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Transcript cleanup</p>
                  <p className="mt-1 text-xs leading-6 text-zinc-400">Optional post-processing through the execution gateway. This only becomes available after a transcript exists.</p>
                </div>
                <button type="button" onClick={handleCleanupTranscript} disabled={!canCleanTranscript} className="inline-flex items-center gap-2 rounded-lg border border-indigo-700/60 bg-indigo-950/40 px-3 py-2 text-sm font-medium text-indigo-100 transition hover:border-indigo-500 hover:bg-indigo-950/60 disabled:cursor-not-allowed disabled:opacity-50">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Clean up transcript
                </button>
              </div>

              <div className="mt-3 min-h-28 rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3 text-sm leading-6 text-zinc-200">
                {cleanedTranscript.trim() ? cleanedTranscript : <span className="text-zinc-600">Cleaned transcript output appears here after the optional inference pass.</span>}
              </div>
            </div>
          </section>
        )}
      />
    </ToolPage>
  )
}
