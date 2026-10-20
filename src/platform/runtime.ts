import { Capacitor } from '@capacitor/core'

export const isNativeAndroid = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export const ANDROID_LOCAL_INFERENCE_NOTE =
  'WebLLM and Ollama are disabled in the Android alpha. Local grammar and regex remain available. Cloud AI requires privacy mode off and a session API key.'

export const ANDROID_SPEECH_NOTE =
  'Speech synthesis and recognition are disabled in the Android alpha. No microphone permission is requested.'

export const getProviderUnavailableReason = (provider: string): string | null =>
  isNativeAndroid() && (provider === 'webgpu' || provider === 'ollama')
    ? ANDROID_LOCAL_INFERENCE_NOTE
    : null
