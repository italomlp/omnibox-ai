import { useState, useEffect, useRef } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import {
  PROVIDER_DEFAULT_MODELS,
  WEBLLM_MODEL_CONFIGS,
  WEBLLM_MODEL_CONFIG_BY_ID,
  isSupportedWebLLMModel,
  type ProviderId,
  type WebLLMModelTier,
  type WebLLMTaskKey,
} from '../config/providers'
import { streamLLM } from '../services/streaming'
import {
  buildTaskPromptBundle,
  getTaskContextBudget,
  getTaskRetryPolicy,
  getTaskSpec,
  summarizeValidationFailure,
  validateStrictTaskResult,
  type CareerTaskInput,
  type GrammarTaskInput,
  type InferenceTaskId,
  type ToneTaskInput,
} from '../services/inference'
import { useWebLLM } from './useWebLLM'
import type { WebLLMGenerationOptions, WebLLMHook } from './useWebLLM'

type StructuredTaskInputMap = {
  grammar: GrammarTaskInput
  tone: ToneTaskInput
  'gap-analysis': CareerTaskInput
}

export interface LegacyRunInferenceOptions {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  stopSequences?: string | string[]
  thinking?: boolean
  onChunk: (chunk: string) => void
  onComplete: (fullText: string) => void
}

export interface StructuredRunInferenceOptions<TTask extends InferenceTaskId = InferenceTaskId> {
  task: TTask
  input: StructuredTaskInputMap[TTask]
  temperature?: number
  maxTokens?: number
  stopSequences?: string | string[]
  thinking?: boolean
  onChunk?: (chunk: string) => void
  onComplete: (fullText: string) => void
}

export type RunInferenceOptions = LegacyRunInferenceOptions | StructuredRunInferenceOptions

const WEBLLM_TIER_ORDER: Record<WebLLMModelTier, number> = {
  fast: 0,
  balanced: 1,
  quality: 2,
}

const LOCAL_MINIMUM_TIER_TO_WEBLLM_TIER: Record<'1b' | '2b' | '3b', WebLLMModelTier> = {
  '1b': 'fast',
  '2b': 'balanced',
  '3b': 'quality',
}

const TASK_SUPPORT_KEY_BY_ID: Record<InferenceTaskId, WebLLMTaskKey> = {
  grammar: 'grammar',
  tone: 'tone',
  'gap-analysis': 'career',
}

const REMOTE_CLOUD_PROVIDER_ORDER: Exclude<ProviderId, 'webgpu' | 'ollama'>[] = [
  'openai',
  'anthropic',
  'gemini',
  'openrouter',
]

const isStructuredRunInferenceOptions = (
  options: RunInferenceOptions,
): options is StructuredRunInferenceOptions => 'task' in options && 'input' in options

const mergeStopSequences = (base: readonly string[], override?: string | string[]): string[] => {
  if (!override) {
    return [...base]
  }

  const overrideList = Array.isArray(override) ? override : [override]
  return [...new Set([...base, ...overrideList])]
}

const makeAbortError = (message = 'Inference aborted.'): Error => {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

const resolveRemoteCloudProvider = (
  apiKeys: Record<ProviderId, string>,
  excludeProvider?: Exclude<ProviderId, 'webgpu'>,
): Exclude<ProviderId, 'webgpu' | 'ollama'> | null => {
  for (const provider of REMOTE_CLOUD_PROVIDER_ORDER) {
    if (provider === excludeProvider) {
      continue
    }

    if (apiKeys[provider]?.trim()) {
      return provider
    }
  }

  return null
}

const isCompatibleWebLLMModelForTask = <TTask extends InferenceTaskId>(
  modelId: string,
  task: TTask,
  input: StructuredTaskInputMap[TTask],
): boolean => {
  const config = WEBLLM_MODEL_CONFIG_BY_ID[modelId]
  if (!config) {
    return false
  }

  const taskSpec = getTaskSpec(task)
  const budget = getTaskContextBudget(task, input, { contextWindowTokens: config.contextWindow })
  const taskKey = TASK_SUPPORT_KEY_BY_ID[task]

  return (
    config.taskSupport.structuredOutput !== 'blocked'
    && config.taskSupport[taskKey] !== 'blocked'
    && WEBLLM_TIER_ORDER[config.tier] >= WEBLLM_TIER_ORDER[LOCAL_MINIMUM_TIER_TO_WEBLLM_TIER[taskSpec.minimumLocalTier]]
    && budget.fits
  )
}

const resolveCompatibleWebLLMModel = <TTask extends InferenceTaskId>(
  preferredModelId: string,
  task: TTask,
  input: StructuredTaskInputMap[TTask],
  allowEscalation: boolean,
): string | null => {
  if (isCompatibleWebLLMModelForTask(preferredModelId, task, input)) {
    return preferredModelId
  }

  if (!allowEscalation) {
    return null
  }

  const taskSpec = getTaskRetryPolicy(task)
  const minimumTier = LOCAL_MINIMUM_TIER_TO_WEBLLM_TIER[taskSpec.minimumLocalTier]

  const candidates = WEBLLM_MODEL_CONFIGS.filter((config) => {
    if (WEBLLM_TIER_ORDER[config.tier] < WEBLLM_TIER_ORDER[minimumTier]) {
      return false
    }

    return isCompatibleWebLLMModelForTask(config.modelId, task, input)
  }).sort((left, right) => {
    const tierDelta = WEBLLM_TIER_ORDER[left.tier] - WEBLLM_TIER_ORDER[right.tier]
    if (tierDelta !== 0) {
      return tierDelta
    }

    return left.contextWindow - right.contextWindow
  })

  return candidates[0]?.modelId ?? null
}

const buildWebLLMGenerationOptions = (
  temperature?: number,
  maxTokens?: number,
  stopSequences?: string | string[],
  thinking?: boolean,
): WebLLMGenerationOptions => ({
  temperature,
  maxTokens,
  stopSequences,
  thinking,
})

const makeStructuredFailure = (message: string): Error => new Error(message)

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
  const {
    apiKeys,
    baseUrls,
    selectedModels,
    setSelectedModel: persistSelectedModel,
    privacyMode,
  } = settings

  const [activeProvider, setActiveProvider] = useState<ProviderId>('webgpu')
  const [selectedModel, setSelectedModelState] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Compute available providers based on Privacy Mode
  const availableProviders = (Object.keys(apiKeys) as ProviderId[]).filter((prov) => {
    if (privacyMode) {
      return prov === 'webgpu' || prov === 'ollama'
    }
    return prov !== 'webgpu' // Cloud providers
  })

  // Ensure WebGPU is always available as Tier 1 if privacy mode is off,
  // or limit to local options if privacy mode is on.
  const providersToUse: ProviderId[] = privacyMode
    ? ['webgpu', 'ollama']
    : ['webgpu', ...availableProviders]

  // Enforce privacy mode constraints on the active provider
  useEffect(() => {
    if (privacyMode && activeProvider !== 'webgpu' && activeProvider !== 'ollama') {
      setActiveProvider('webgpu')
    }
  }, [privacyMode, activeProvider])

  // Sync selectedModel when activeProvider changes
  useEffect(() => {
    const savedModel = selectedModels[activeProvider]
    if (activeProvider === 'webgpu' && !isSupportedWebLLMModel(savedModel)) {
      setSelectedModelState(PROVIDER_DEFAULT_MODELS.webgpu)
      persistSelectedModel('webgpu', PROVIDER_DEFAULT_MODELS.webgpu)
      return
    }
    setSelectedModelState(savedModel || '')
  }, [activeProvider, selectedModels, persistSelectedModel])

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model)
    persistSelectedModel(activeProvider, model)
  }

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    void webLLM.abort()
  }

  const clearError = () => setErrorMsg(null)

  const generateCloudText = async (
    provider: Exclude<ProviderId, 'webgpu'>,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string> => {
    const providerConfig = {
      apiKey: apiKeys[provider],
      baseUrl: baseUrls[provider],
      selectedModel: selectedModels[provider] || PROVIDER_DEFAULT_MODELS[provider],
    }

    return new Promise<string>((resolve, reject) => {
      void streamLLM(
        provider,
        providerConfig,
        {
          prompt: userPrompt,
          systemPrompt,
          temperature,
          maxTokens,
        },
        {
          onChunk: (chunk) => {
            if (signal.aborted) {
              return
            }
            onChunk(chunk)
          },
          onComplete: (fullText) => {
            if (signal.aborted) {
              reject(makeAbortError())
              return
            }

            resolve(fullText)
          },
          onError: (error) => {
            if (signal.aborted) {
              reject(makeAbortError())
              return
            }

            reject(error)
          },
        },
        signal,
      )
    })
  }

  const generateWebLLMText = async (
    modelId: string,
    systemPrompt: string,
    userPrompt: string,
    generationOptions: WebLLMGenerationOptions,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string> => {
    if (!webLLM.isSupported) {
      throw new Error('WebGPU is not supported on this browser/device.')
    }

    const engine = await webLLM.loadModel(modelId)
    if (!engine) {
      throw new Error('Failed to load WebLLM model in browser context.')
    }

    if (signal.aborted) {
      throw makeAbortError()
    }

    return webLLM.generate(modelId, userPrompt, systemPrompt, onChunk, generationOptions)
  }

  const validateStructuredOutput = <TTask extends InferenceTaskId>(
    task: TTask,
    input: StructuredTaskInputMap[TTask],
    rawText: string,
  ): string | null => {
    const validation = validateStrictTaskResult(task as never, rawText, input as never)
    if (validation.ok) {
      return JSON.stringify(validation.value)
    }

    return null
  }

  const runStructuredForWebLLM = async <TTask extends InferenceTaskId>(
    task: TTask,
    input: StructuredTaskInputMap[TTask],
    modelId: string,
    promptBundle: ReturnType<typeof buildTaskPromptBundle>,
    temperature: number,
    maxTokens: number,
    stopSequences: string | string[] | undefined,
    thinking: boolean | undefined,
    signal: AbortSignal,
  ): Promise<string> => {
    const noChunk = () => undefined
    const primary = await generateWebLLMText(
      modelId,
      promptBundle.systemPrompt,
      promptBundle.userPrompt,
      buildWebLLMGenerationOptions(temperature, maxTokens, stopSequences, thinking),
      noChunk,
      signal,
    )

    const validated = validateStructuredOutput(task, input, primary)
    if (validated) {
      return validated
    }

    const failure = validateStrictTaskResult(task as never, primary, input as never)
    const repair = getTaskSpec(task).buildRepairPrompt(input as never, failure as never)
    const repaired = await generateWebLLMText(
      modelId,
      repair.systemPrompt,
      repair.userPrompt,
      buildWebLLMGenerationOptions(
        temperature,
        maxTokens,
        mergeStopSequences(repair.stopSequences, stopSequences),
        thinking,
      ),
      noChunk,
      signal,
    )
    const repairedValidated = validateStructuredOutput(task, input, repaired)
    if (repairedValidated) {
      return repairedValidated
    }

    const repairedFailure = validateStrictTaskResult(task as never, repaired, input as never)
    if (repairedFailure.ok) {
      return JSON.stringify(repairedFailure.value)
    }

    throw makeStructuredFailure(summarizeValidationFailure(repairedFailure))
  }

  const runStructuredForProvider = async <TTask extends InferenceTaskId>(
    provider: Exclude<ProviderId, 'webgpu'>,
    task: TTask,
    input: StructuredTaskInputMap[TTask],
    promptBundle: ReturnType<typeof buildTaskPromptBundle>,
    temperature: number,
    maxTokens: number,
    signal: AbortSignal,
  ): Promise<string> => {
    const noChunk = () => undefined
    const primary = await generateCloudText(
      provider,
      promptBundle.systemPrompt,
      promptBundle.userPrompt,
      temperature,
      maxTokens,
      noChunk,
      signal,
    )

    const validated = validateStructuredOutput(task, input, primary)
    if (validated) {
      return validated
    }

    const failure = validateStrictTaskResult(task as never, primary, input as never)
    const repair = getTaskSpec(task).buildRepairPrompt(input as never, failure as never)
    const repaired = await generateCloudText(
      provider,
      repair.systemPrompt,
      repair.userPrompt,
      temperature,
      maxTokens,
      noChunk,
      signal,
    )
    const repairedValidated = validateStructuredOutput(task, input, repaired)
    if (repairedValidated) {
      return repairedValidated
    }

    const repairedFailure = validateStrictTaskResult(task as never, repaired, input as never)
    if (repairedFailure.ok) {
      return JSON.stringify(repairedFailure.value)
    }

    throw makeStructuredFailure(summarizeValidationFailure(repairedFailure))
  }

  const runStructuredInference = async <TTask extends InferenceTaskId>(
    opts: StructuredRunInferenceOptions<TTask>,
    controller: AbortController,
  ): Promise<void> => {
    const taskSpec = getTaskSpec(opts.task)
    const promptBundle = buildTaskPromptBundle(opts.task as never, opts.input as never)
    const temperature = opts.temperature ?? promptBundle.temperature
    const maxTokens = opts.maxTokens ?? promptBundle.maxTokens
    const stopSequences = mergeStopSequences(promptBundle.stopSequences, opts.stopSequences)
    const thinking = opts.thinking ?? false
    const allowLocalEscalation = settings.allowLocalModelEscalation
    const remoteFallbackProvider = resolveRemoteCloudProvider(
      apiKeys,
      activeProvider === 'webgpu' ? undefined : activeProvider,
    )
    const webLLMModelToUse = selectedModels.webgpu || PROVIDER_DEFAULT_MODELS.webgpu
    const preferredWebLLMModel = resolveCompatibleWebLLMModel(
      webLLMModelToUse,
      opts.task,
      opts.input,
      allowLocalEscalation,
    )

    const tryCurrentProvider = async (): Promise<string> => {
      if (activeProvider === 'webgpu') {
        if (!preferredWebLLMModel) {
          throw new Error(
            `Selected WebLLM model cannot satisfy ${taskSpec.title}.`,
          )
        }

        return runStructuredForWebLLM(
          opts.task,
          opts.input,
          preferredWebLLMModel,
          promptBundle,
          temperature,
          maxTokens,
          stopSequences,
          thinking,
          controller.signal,
        )
      }

      return runStructuredForProvider(
        activeProvider,
        opts.task,
        opts.input,
        promptBundle,
        temperature,
        maxTokens,
        controller.signal,
      )
    }

    try {
      const finalText = await tryCurrentProvider()
      if (controller.signal.aborted) {
        return
      }

      opts.onComplete(finalText)
      return
    } catch (primaryError) {
      if (controller.signal.aborted) {
        throw primaryError
      }

      if (activeProvider === 'webgpu') {
        if (!privacyMode && settings.allowCloudFallback && remoteFallbackProvider) {
          const fallbackText = await runStructuredForProvider(
            remoteFallbackProvider,
            opts.task,
            opts.input,
            promptBundle,
            temperature,
            maxTokens,
            controller.signal,
          )
          if (!controller.signal.aborted) {
            opts.onComplete(fallbackText)
          }
          return
        }
      } else if (!privacyMode && settings.allowCloudFallback && remoteFallbackProvider) {
        const fallbackText = await runStructuredForProvider(
          remoteFallbackProvider,
          opts.task,
          opts.input,
          promptBundle,
          temperature,
          maxTokens,
          controller.signal,
        )
        if (!controller.signal.aborted) {
          opts.onComplete(fallbackText)
        }
        return
      } else if (allowLocalEscalation && preferredWebLLMModel) {
        const fallbackText = await runStructuredForWebLLM(
          opts.task,
          opts.input,
          preferredWebLLMModel,
          promptBundle,
          temperature,
          maxTokens,
          stopSequences,
          thinking,
          controller.signal,
        )
        if (!controller.signal.aborted) {
          opts.onComplete(fallbackText)
        }
        return
      }

      throw primaryError
    }
  }

  const runInference = async (opts: RunInferenceOptions) => {
    abort() // cancel any existing stream
    setIsProcessing(true)
    setErrorMsg(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      if (isStructuredRunInferenceOptions(opts)) {
        await runStructuredInference(opts, controller)
        return
      }

      if (activeProvider === 'webgpu') {
        if (!webLLM.isSupported) {
          throw new Error('WebGPU is not supported on this browser/device.')
        }

        if (controller.signal.aborted) return

        const result = await webLLM.generate(
          selectedModel || PROVIDER_DEFAULT_MODELS.webgpu,
          opts.userPrompt,
          opts.systemPrompt,
          (chunk) => {
            if (controller.signal.aborted) return
            opts.onChunk(chunk)
          },
          buildWebLLMGenerationOptions(
            opts.temperature ?? 0.3,
            opts.maxTokens,
            opts.stopSequences,
            opts.thinking,
          ),
        )

        if (controller.signal.aborted) return
        opts.onComplete(result)
      } else {
        await streamLLM(
          activeProvider,
          {
            apiKey: apiKeys[activeProvider],
            baseUrl: baseUrls[activeProvider],
            selectedModel,
          },
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
