import { useState, useEffect, useRef } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import type { ProviderId } from '../config/providers'
import { streamLLM } from '../services/streaming'
import { useWebLLM } from './useWebLLM'
import type { WebLLMHook } from './useWebLLM'

interface RunInferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
}

export interface UseInferenceReturn {
  activeProvider: ProviderId;
  setActiveProvider: (p: ProviderId) => void;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  availableProviders: ProviderId[];
  isProcessing: boolean;
  errorMsg: string | null;
  clearError: () => void;
  runInference: (opts: RunInferenceOptions) => Promise<void>;
  abort: () => void;
  webLLM: WebLLMHook;
}

export function useInference(): UseInferenceReturn {
  const settings = useSettingsStore()
  const webLLM = useWebLLM()

  const [activeProvider, setActiveProvider] = useState<ProviderId>('webgpu')
  const [selectedModel, setSelectedModel] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Compute available providers based on Privacy Mode
  const availableProviders = (Object.keys(settings.apiKeys) as ProviderId[]).filter((prov) => {
    if (settings.privacyMode) {
      return prov === 'webgpu' || prov === 'ollama'
    }
    return prov !== 'webgpu' // Cloud providers
  })

  // Ensure WebGPU is always available as Tier 1 if privacy mode is off,
  // or limit to local options if privacy mode is on.
  const providersToUse: ProviderId[] = settings.privacyMode
    ? ['webgpu', 'ollama']
    : ['webgpu', ...availableProviders]

  // Enforce privacy mode constraints on the active provider
  useEffect(() => {
    if (settings.privacyMode && activeProvider !== 'webgpu' && activeProvider !== 'ollama') {
      setActiveProvider('webgpu')
    }
  }, [settings.privacyMode, activeProvider])

  // Sync selectedModel when activeProvider changes
  useEffect(() => {
    const savedModel = settings.selectedModels[activeProvider]
    setSelectedModel(savedModel || '')
  }, [activeProvider, settings.selectedModels])

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const clearError = () => setErrorMsg(null)

  const runInference = async (opts: RunInferenceOptions) => {
    abort() // cancel any existing stream
    setIsProcessing(true)
    setErrorMsg(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      if (activeProvider === 'webgpu') {
        if (!webLLM.isSupported) {
          throw new Error('WebGPU is not supported on this browser/device.')
        }

        const engine = await webLLM.loadModel(selectedModel)
        if (!engine) {
          throw new Error('Failed to load WebLLM model in browser context.')
        }

        // Check if aborted before generating
        if (controller.signal.aborted) return

        let rawText = ''
        const result = await webLLM.generate(
          selectedModel,
          opts.userPrompt,
          opts.systemPrompt,
          (chunk) => {
            if (controller.signal.aborted) return
            rawText += chunk
            opts.onChunk(chunk)
          }
        )

        if (controller.signal.aborted) return
        opts.onComplete(result)
      } else {
        const providerConfig = {
          apiKey: settings.apiKeys[activeProvider],
          baseUrl: settings.baseUrls[activeProvider],
          selectedModel: selectedModel,
        }

        await streamLLM(
          activeProvider,
          providerConfig,
          {
            prompt: opts.userPrompt,
            systemPrompt: opts.systemPrompt,
            temperature: opts.temperature ?? 0.3,
            maxTokens: opts.maxTokens,
          },
          {
            onChunk: (chunk) => {
              if (controller.signal.aborted) return
              opts.onChunk(chunk)
            },
            onComplete: (fullText) => {
              if (controller.signal.aborted) return
              opts.onComplete(fullText)
            },
            onError: (err) => {
              if (controller.signal.aborted) return
              setErrorMsg(err.message || 'Stream processing failed.')
            },
          },
          controller.signal
        )
      }
    } catch (err: any) {
      if (controller.signal.aborted) return
      console.error(err)
      setErrorMsg(err.message || 'An error occurred during inference.')
    } finally {
      if (abortControllerRef.current === controller) {
        setIsProcessing(false)
        abortControllerRef.current = null
      }
    }
  }

  return {
    activeProvider,
    setActiveProvider,
    selectedModel,
    setSelectedModel,
    availableProviders: providersToUse,
    isProcessing,
    errorMsg,
    clearError,
    runInference,
    abort,
    webLLM,
  }
}
