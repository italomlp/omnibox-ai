import { useState, useEffect } from 'react'
import type * as webLLM from '@mlc-ai/web-llm'
import {
  PROVIDER_DEFAULT_MODELS,
  WEBLLM_MODEL_CONFIG_BY_ID,
  isSupportedWebLLMModel,
} from '../config/providers'

// Cache the loaded model engine in memory to prevent reloading it on every hook mount
let cachedEngine: webLLM.MLCEngineInterface | null = null
let cachedModelId: string | null = null
let engineQueue: Promise<void> = Promise.resolve()
let abortRequested = false

export interface WebLLMGenerationOptions {
  temperature?: number
  maxTokens?: number
  stopSequences?: string | string[]
  thinking?: boolean
  signal?: AbortSignal
}

export interface WebLLMHook {
  isSupported: boolean;
  isLoading: boolean;
  loadProgress: string;
  loadPercent: number;
  speed: string;
  error: string | null;
  loadModel: (modelId: string) => Promise<webLLM.MLCEngineInterface | null>;
  generate: (
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    onChunk?: (text: string) => void,
    options?: WebLLMGenerationOptions
  ) => Promise<string>;
  abort: () => Promise<void>;
}

const createAbortError = (): Error => {
  const error = new Error('WebLLM generation aborted.')
  error.name = 'AbortError'
  return error
}

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback

const withEngineLock = <T>(task: () => Promise<T>): Promise<T> => {
  const run = engineQueue.then(task, task)
  engineQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

const isQwen3ThinkingSupported = (modelId: string): boolean => {
  const modelConfig = WEBLLM_MODEL_CONFIG_BY_ID[modelId]

  return Boolean(modelConfig && (modelConfig.supportsThinkingControl ?? modelConfig.family === 'Qwen3'))
}

export function useWebLLM(): WebLLMHook {
  const [isSupported, setIsSupported] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadProgress, setLoadProgress] = useState<string>('')
  const [loadPercent, setLoadPercent] = useState<number>(0)
  const [speed, setSpeed] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasGPU = 'gpu' in navigator && navigator.gpu !== undefined
      setIsSupported(hasGPU)
    }
  }, [])

  const loadModelLocked = async (modelId: string): Promise<webLLM.MLCEngineInterface | null> => {
    const resolvedModelId = isSupportedWebLLMModel(modelId)
      ? modelId
      : PROVIDER_DEFAULT_MODELS.webgpu

    if (!isSupported) {
      setError('WebGPU is not supported on this browser or device hardware.')
      return null
    }

    if (!isSupportedWebLLMModel(resolvedModelId)) {
      setError(`Unsupported WebLLM model: ${modelId}`)
      return null
    }

    if (cachedEngine && cachedModelId === resolvedModelId) {
      return cachedEngine
    }

    setIsLoading(true)
    setError(null)
    setLoadProgress('Initializing WebGPU MLC Engine...')
    setLoadPercent(0)
    setSpeed('')

    try {
      // Keep the large GPU runtime out of startup and cloud/local grammar flows.
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
      const engine = await CreateMLCEngine(resolvedModelId, {
        initProgressCallback: (report) => {
          setLoadProgress(report.text)
          
          // Attempt to parse download percentage (e.g. "Loading model... 45.3%")
          const percentMatch = report.text.match(/(\d+(?:\.\d+)?)%/)
          if (percentMatch) {
            setLoadPercent(parseFloat(percentMatch[1]))
          }
          
          // Attempt to parse download speed (e.g. "5.43 MB/s")
          const speedMatch = report.text.match(/(\d+(?:\.\d+)?\s*MB\/s)/)
          if (speedMatch) {
            setSpeed(speedMatch[1])
          }
        },
      })

      cachedEngine = engine
      cachedModelId = resolvedModelId
      setIsLoading(false)
      setLoadProgress('Model loaded successfully.')
      setLoadPercent(100)
      return engine
    } catch (error: unknown) {
      console.error('WebLLM load error:', error)
      setError(getErrorMessage(error, 'Failed to initialize WebLLM engine.'))
      setIsLoading(false)
      throw error
    }
  }

  const loadModel = async (modelId: string): Promise<webLLM.MLCEngineInterface | null> =>
    withEngineLock(() => loadModelLocked(modelId))

  const abort = async (): Promise<void> => {
    abortRequested = true

    const engine = cachedEngine
    if (!engine) {
      return
    }

    await Promise.resolve(engine.interruptGenerate())
  }

  const generateLocked = async (
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    onChunk?: (text: string) => void,
    options?: WebLLMGenerationOptions
  ): Promise<string> => {
    // Reset global abort flag for the new generation request
    abortRequested = false
    const signal = options?.signal

    const isAborted = () => abortRequested || Boolean(signal?.aborted)

    const resolvedModelId = isSupportedWebLLMModel(modelId)
      ? modelId
      : PROVIDER_DEFAULT_MODELS.webgpu

    let engine = cachedEngine
    if (!engine || cachedModelId !== resolvedModelId) {
      engine = await loadModelLocked(resolvedModelId)
    }
    if (!engine) {
      throw new Error('WebLLM engine failed to initialize.')
    }

    if (isAborted()) {
      throw createAbortError()
    }

    const messages: webLLM.ChatCompletionMessageParam[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    let stopOptions = options?.stopSequences ?? undefined
    if (stopOptions) {
      const stopList = Array.isArray(stopOptions) ? stopOptions : [stopOptions]
      const filteredList = stopList.filter((seq) => !seq.includes('```'))
      stopOptions = filteredList.length > 0 ? filteredList : undefined
    }

    const request: webLLM.ChatCompletionRequestStreaming = {
      messages,
      stream: true,
      max_tokens: options?.maxTokens ?? undefined,
      temperature: options?.temperature ?? undefined,
      stop: stopOptions,
      model: resolvedModelId,
    }

    const shouldDisableThinking =
      options?.thinking === false && isQwen3ThinkingSupported(resolvedModelId)

    if (shouldDisableThinking) {
      request.extra_body = { enable_thinking: false }
    }

    const onAbort = () => {
      if (engine) {
        void engine.interruptGenerate()
      }
    }

    signal?.addEventListener('abort', onAbort)

    try {
      const completion = await engine.chat.completions.create(request)

      let fullText = ''
      for await (const chunk of completion) {
        if (isAborted()) {
          throw createAbortError()
        }

        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          fullText += text
          if (onChunk) {
            onChunk(text)
          }
        }
      }

      if (isAborted()) {
        throw createAbortError()
      }

      return fullText
    } catch (error: unknown) {
      console.error('WebLLM generation error:', error)
      setError(getErrorMessage(error, 'Generation failed.'))
      throw error
    } finally {
      signal?.removeEventListener('abort', onAbort)
      abortRequested = false
    }
  }

  const generate = async (
    modelId: string,
    prompt: string,
    systemPrompt?: string,
    onChunk?: (text: string) => void,
    options?: WebLLMGenerationOptions
  ): Promise<string> => withEngineLock(() => generateLocked(modelId, prompt, systemPrompt, onChunk, options))

  return {
    isSupported,
    isLoading,
    loadProgress,
    loadPercent,
    speed,
    error,
    loadModel,
    generate,
    abort,
  }
}
