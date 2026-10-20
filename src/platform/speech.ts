import { ANDROID_SPEECH_NOTE, isNativeAndroid } from './runtime'

type SpeechRecognitionErrorType =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'network'
  | 'phrases-not-supported'
  | 'unsupported'

interface BrowserSpeechRecognitionAlternative {
  transcript: string
  confidence?: number
}

interface BrowserSpeechRecognitionResult {
  0: BrowserSpeechRecognitionAlternative
  isFinal: boolean
  length: number
  item: (index: number) => BrowserSpeechRecognitionAlternative | undefined
}

interface BrowserSpeechRecognitionResultList {
  length: number
  [index: number]: BrowserSpeechRecognitionResult
  item: (index: number) => BrowserSpeechRecognitionResult | null
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number
  results: BrowserSpeechRecognitionResultList
}

interface BrowserSpeechRecognitionErrorEvent {
  error: SpeechRecognitionErrorType
  message?: string
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
}

export interface BrowserSpeechCapabilities {
  synthesis: {
    supported: boolean
    browserDependent: boolean
    note: string
  }
  recognition: {
    supported: boolean
    privacyBlocked: boolean
    verifiedLocalOnly: boolean
    note: string
  }
}

export interface BrowserSpeechRecognitionResultItem {
  transcript: string
  isFinal: boolean
}

export interface BrowserSpeechRecognitionResultPayload {
  resultIndex: number
  results: BrowserSpeechRecognitionResultItem[]
}

export interface BrowserSpeechRecognitionHandlers {
  onStart?: () => void
  onEnd?: () => void
  onError?: (message: string) => void
  onResult?: (payload: BrowserSpeechRecognitionResultPayload) => void
}

export interface BrowserSpeechRecognitionSession {
  start: () => void
  stop: () => void
  cancel: () => void
}

export type MicrophonePermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

const PRIVACY_RECOGNITION_NOTE =
  'Browser speech recognition may use a browser or vendor service and is not verified local-only.'

const SYNTHESIS_NOTE =
  'Browser speech synthesis is supported, but voices, locales, and audio behavior depend on the browser and OS.'

const formatRecognitionError = (error: BrowserSpeechRecognitionErrorEvent['error']): string => {
  switch (error) {
    case 'aborted':
      return 'Speech recognition was aborted.'
    case 'audio-capture':
      return 'The browser could not capture microphone audio.'
    case 'bad-grammar':
      return 'The browser rejected the recognition grammar.'
    case 'language-not-supported':
      return 'The selected recognition language is not supported.'
    case 'no-speech':
      return 'No speech was detected.'
    case 'not-allowed':
      return 'Microphone access was denied or blocked.'
    case 'service-not-allowed':
      return 'Browser speech recognition is not allowed in this context.'
    case 'network':
      return 'Browser speech recognition reported a network error.'
    case 'phrases-not-supported':
      return 'Browser speech recognition phrases are not supported here.'
    default:
      return 'Speech recognition is unavailable in this browser.'
  }
}

const getSpeechSynthesis = (): SpeechSynthesis | null => {
  if (isNativeAndroid() || typeof window === 'undefined') return null
  if (!('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

export const getBrowserSpeechCapabilities = (privacyMode: boolean): BrowserSpeechCapabilities => {
  if (isNativeAndroid()) {
    return {
      synthesis: { supported: false, browserDependent: false, note: ANDROID_SPEECH_NOTE },
      recognition: { supported: false, privacyBlocked: false, verifiedLocalOnly: false, note: ANDROID_SPEECH_NOTE },
    }
  }
  const synthesisSupported = Boolean(getSpeechSynthesis())
  const recognitionSupported = Boolean(getBrowserSpeechRecognitionConstructor())

  return {
    synthesis: {
      supported: synthesisSupported,
      browserDependent: synthesisSupported,
      note: synthesisSupported ? SYNTHESIS_NOTE : 'Browser speech synthesis is unavailable in this browser.',
    },
    recognition: {
      supported: recognitionSupported,
      privacyBlocked: privacyMode && recognitionSupported,
      verifiedLocalOnly: false,
      note: recognitionSupported ? PRIVACY_RECOGNITION_NOTE : 'Browser speech recognition is unavailable in this browser.',
    },
  }
}

export const getBrowserSpeechRecognitionConstructor = (): BrowserSpeechRecognitionConstructor | null => {
  if (isNativeAndroid() || typeof window === 'undefined') return null

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export const subscribeBrowserSpeechVoices = (onVoices: (voices: SpeechSynthesisVoice[]) => void): (() => void) | null => {
  const synthesis = getSpeechSynthesis()
  if (!synthesis) return null

  const updateVoices = () => onVoices(synthesis.getVoices())
  updateVoices()
  const previousHandler = synthesis.onvoiceschanged
  synthesis.onvoiceschanged = updateVoices

  return () => {
    if (synthesis.onvoiceschanged === updateVoices) {
      synthesis.onvoiceschanged = previousHandler ?? null
    }
  }
}

export const speakBrowserText = (
  text: string,
  params: {
    voice?: SpeechSynthesisVoice | null
    lang?: string
    pitch?: number
    rate?: number
    volume?: number
    onStart?: () => void
    onEnd?: () => void
    onPause?: () => void
    onResume?: () => void
    onError?: (message: string) => void
  },
): SpeechSynthesisUtterance | null => {
  const synthesis = getSpeechSynthesis()
  if (!synthesis) return null

  const utterance = new SpeechSynthesisUtterance(text)
  if (params.voice) utterance.voice = params.voice
  if (params.lang) utterance.lang = params.lang
  if (typeof params.pitch === 'number') utterance.pitch = params.pitch
  if (typeof params.rate === 'number') utterance.rate = params.rate
  if (typeof params.volume === 'number') utterance.volume = params.volume

  utterance.onstart = () => params.onStart?.()
  utterance.onend = () => params.onEnd?.()
  utterance.onpause = () => params.onPause?.()
  utterance.onresume = () => params.onResume?.()
  utterance.onerror = (event) => params.onError?.(event.error || 'Speech synthesis failed.')

  synthesis.cancel()
  synthesis.speak(utterance)

  return utterance
}

export const pauseBrowserSpeech = (): void => {
  getSpeechSynthesis()?.pause()
}

export const resumeBrowserSpeech = (): void => {
  getSpeechSynthesis()?.resume()
}

export const stopBrowserSpeech = (): void => {
  getSpeechSynthesis()?.cancel()
}

export const requestBrowserMicrophonePermission = async (): Promise<MicrophonePermissionState> => {
  if (isNativeAndroid()) return 'denied'
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unknown'
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return 'granted'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return 'denied'
    }

    return 'denied'
  }
}

export const readBrowserMicrophonePermission = async (): Promise<MicrophonePermissionState> => {
  if (isNativeAndroid()) return 'denied'
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown'
  }

  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName } as PermissionDescriptor)
    return status.state
  } catch {
    return 'unknown'
  }
}

export const createBrowserSpeechRecognitionSession = (
  handlers: BrowserSpeechRecognitionHandlers,
  options: {
    lang: string
    continuous?: boolean
    interimResults?: boolean
  },
): BrowserSpeechRecognitionSession | null => {
  const Constructor = getBrowserSpeechRecognitionConstructor()
  if (!Constructor) return null

  const recognition = new Constructor()
  recognition.continuous = options.continuous ?? true
  recognition.interimResults = options.interimResults ?? true
  recognition.lang = options.lang

  recognition.onstart = () => handlers.onStart?.()
  recognition.onend = () => handlers.onEnd?.()
  recognition.onerror = (event) => handlers.onError?.(formatRecognitionError(event.error))
  recognition.onresult = (event) => {
    const results: BrowserSpeechRecognitionResultItem[] = []
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const transcript = result[0]?.transcript ?? ''
      results.push({ transcript, isFinal: result.isFinal })
    }

    handlers.onResult?.({
      resultIndex: event.resultIndex,
      results,
    })
  }

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    cancel: () => recognition.abort(),
  }
}
