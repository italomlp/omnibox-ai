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
  createRunRecord,
  evaluateExecutionPolicy,
  getProviderLocality,
  type RunRecordHandle,
} from '../services/execution'
import type { PersistedPayload } from '../db/db'
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
    console.warn(`[DEBUG Compatibility] Model config not found for: ${modelId}`)
    return false
  }

  const taskSpec = getTaskSpec(task)
  const budget = getTaskContextBudget(task, input, { contextWindowTokens: config.contextWindow })
  const taskKey = TASK_SUPPORT_KEY_BY_ID[task]

  const structuredOutputSupported = config.taskSupport.structuredOutput !== 'blocked'
  const taskSupported = config.taskSupport[taskKey] !== 'blocked'
  const tierSupported = WEBLLM_TIER_ORDER[config.tier] >= WEBLLM_TIER_ORDER[LOCAL_MINIMUM_TIER_TO_WEBLLM_TIER[taskSpec.minimumLocalTier]]
  const budgetFits = budget.fits

  if (!structuredOutputSupported || !taskSupported || !tierSupported || !budgetFits) {
    console.warn(`[DEBUG Compatibility] Model ${modelId} is NOT compatible for task ${task}:`, {
      structuredOutputSupported,
      taskSupported,
      tierSupported,
      budgetFits,
      estimatedInputTokens: budget.estimatedInputTokens,
      availableInputTokens: budget.availableInputTokens,
      contextWindowTokens: config.contextWindow,
    })
  }

  return (
    structuredOutputSupported &&
    taskSupported &&
    tierSupported &&
    budgetFits
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

const LEGACY_RUN_TOOL_ID = 'inference'

const readDispatchSettings = () => useSettingsStore.getState()

const resolveExecutionLocality = (providerId: ProviderId) => getProviderLocality(providerId) ?? 'cloud'

const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError'

const makeRunInputSnapshot = (value: Record<string, unknown>): PersistedPayload => value as PersistedPayload

const buildStructuredRunInputSnapshot = <TTask extends InferenceTaskId>(
  task: TTask,
  input: StructuredTaskInputMap[TTask],
  temperature: number,
  maxTokens: number,
  stopSequences: string[],
  thinking: boolean,
): Record<string, unknown> => ({
  kind: 'structured',
  task,
  input,
  temperature,
  maxTokens,
  stopSequences,
  thinking,
})

const buildLegacyRunInputSnapshot = (
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
  stopSequences: string[],
  thinking: boolean,
): Record<string, unknown> => ({
  kind: 'legacy',
  systemPrompt,
  userPrompt,
  temperature,
  maxTokens,
  stopSequences,
  thinking,
})

const ensurePolicyAllows = (providerId: ProviderId) => {
  const privacyMode = readDispatchSettings().privacyMode
  const decision = evaluateExecutionPolicy(privacyMode, providerId)
  if (!decision.allowed) {
    throw new Error(decision.reason)
  }

  return decision
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
  const {
    apiKeys,
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
  }

  const clearError = () => setErrorMsg(null)

  const trackAttemptExecution = async (
    runTracker: RunRecordHandle | null,
    providerId: ProviderId,
    modelId: string,
  ) => {
    await runTracker?.updateExecution({
      providerId,
      modelId,
      locality: resolveExecutionLocality(providerId),
    })
  }

  const generateCloudText = async (
    provider: Exclude<ProviderId, 'webgpu'>,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string> => {
    const dispatchSettings = readDispatchSettings()
    ensurePolicyAllows(provider)

    const providerConfig = {
      apiKey: dispatchSettings.apiKeys[provider],
      baseUrl: dispatchSettings.baseUrls[provider],
      selectedModel: dispatchSettings.selectedModels[provider] || PROVIDER_DEFAULT_MODELS[provider],
    }

    let fullText = ''

    await streamLLM(
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
        onComplete: (text) => {
          if (signal.aborted) {
            return
          }

          fullText = text
        },
        onError: () => undefined,
      },
      { privacyMode: dispatchSettings.privacyMode },
      signal,
    )

    return fullText
  }

  const generateWebLLMText = async (
    modelId: string,
    systemPrompt: string,
    userPrompt: string,
    generationOptions: WebLLMGenerationOptions,
    onChunk: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<string> => {
    ensurePolicyAllows('webgpu')

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

    return webLLM.generate(modelId, userPrompt, systemPrompt, onChunk, {
      ...generationOptions,
      signal,
    })
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
    runTracker: RunRecordHandle | null,
    signal: AbortSignal,
  ): Promise<string> => {
    await trackAttemptExecution(runTracker, 'webgpu', modelId)

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
    runTracker: RunRecordHandle | null,
    signal: AbortSignal,
  ): Promise<string> => {
    await trackAttemptExecution(
      runTracker,
      provider,
      readDispatchSettings().selectedModels[provider] || PROVIDER_DEFAULT_MODELS[provider],
    )

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
    runTracker: RunRecordHandle | null,
  ): Promise<string> => {
    const taskSpec = getTaskSpec(opts.task)
    const promptBundle = buildTaskPromptBundle(opts.task as never, opts.input as never)
    const temperature = opts.temperature ?? promptBundle.temperature
    const maxTokens = opts.maxTokens ?? promptBundle.maxTokens
    const stopSequences = mergeStopSequences(promptBundle.stopSequences, opts.stopSequences)
    const thinking = opts.thinking ?? false
    const dispatchSettings = readDispatchSettings()
    const allowLocalEscalation = dispatchSettings.allowLocalModelEscalation
    const remoteFallbackProvider = resolveRemoteCloudProvider(
      dispatchSettings.apiKeys,
      activeProvider === 'webgpu' ? undefined : activeProvider,
    )
    const webLLMModelToUse = dispatchSettings.selectedModels.webgpu || PROVIDER_DEFAULT_MODELS.webgpu
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
          runTracker,
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
        runTracker,
        controller.signal,
      )
    }

    try {
      const finalText = await tryCurrentProvider()
      if (controller.signal.aborted) {
        throw makeAbortError()
      }

      opts.onComplete(finalText)
      return finalText
    } catch (primaryError) {
      if (controller.signal.aborted) {
        throw primaryError
      }

      const latestSettings = readDispatchSettings()

      if (activeProvider === 'webgpu') {
        if (!latestSettings.privacyMode && latestSettings.allowCloudFallback && remoteFallbackProvider) {
          const fallbackText = await runStructuredForProvider(
            remoteFallbackProvider,
            opts.task,
            opts.input,
            promptBundle,
            temperature,
            maxTokens,
            runTracker,
            controller.signal,
          )
          if (!controller.signal.aborted) {
            opts.onComplete(fallbackText)
          }
          if (controller.signal.aborted) {
            throw makeAbortError()
          }
          return fallbackText
        }
      } else if (!latestSettings.privacyMode && latestSettings.allowCloudFallback && remoteFallbackProvider) {
        const fallbackText = await runStructuredForProvider(
          remoteFallbackProvider,
          opts.task,
          opts.input,
          promptBundle,
          temperature,
          maxTokens,
          runTracker,
          controller.signal,
        )
        if (!controller.signal.aborted) {
          opts.onComplete(fallbackText)
        }
        if (controller.signal.aborted) {
          throw makeAbortError()
        }
        return fallbackText
      } else if (latestSettings.allowLocalModelEscalation && preferredWebLLMModel) {
        const fallbackText = await runStructuredForWebLLM(
          opts.task,
          opts.input,
          preferredWebLLMModel,
          promptBundle,
          temperature,
          maxTokens,
          stopSequences,
          thinking,
          runTracker,
          controller.signal,
        )
        if (!controller.signal.aborted) {
          opts.onComplete(fallbackText)
        }
        if (controller.signal.aborted) {
          throw makeAbortError()
        }
        return fallbackText
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

    const dispatchSettings = readDispatchSettings()
    const executionModelId = activeProvider === 'webgpu'
      ? dispatchSettings.selectedModels.webgpu || selectedModel || PROVIDER_DEFAULT_MODELS.webgpu
      : dispatchSettings.selectedModels[activeProvider] || selectedModel || PROVIDER_DEFAULT_MODELS[activeProvider]
    const initialExecution = {
      providerId: activeProvider,
      modelId: executionModelId,
      locality: resolveExecutionLocality(activeProvider),
    }

    const runTracker = await createRunRecord({
      toolId: isStructuredRunInferenceOptions(opts) ? opts.task : LEGACY_RUN_TOOL_ID,
      toolVersion: 1,
      actionId: isStructuredRunInferenceOptions(opts) ? opts.task : undefined,
      input: makeRunInputSnapshot(
        isStructuredRunInferenceOptions(opts)
          ? buildStructuredRunInputSnapshot(
              opts.task,
              opts.input,
              opts.temperature ?? 0.3,
              opts.maxTokens ?? 2048,
              mergeStopSequences([], opts.stopSequences),
              opts.thinking ?? false,
            )
          : buildLegacyRunInputSnapshot(
              opts.systemPrompt,
              opts.userPrompt,
              opts.temperature ?? 0.3,
              opts.maxTokens ?? 2048,
              mergeStopSequences([], opts.stopSequences),
              opts.thinking ?? false,
            ),
      ),
      execution: initialExecution,
    })

    await runTracker.markRunning(initialExecution)

    try {
      if (isStructuredRunInferenceOptions(opts)) {
        const finalText = await runStructuredInference(opts, controller, runTracker)
        if (controller.signal.aborted) throw makeAbortError()

        await runTracker.complete(finalText)
        return
      }

      if (activeProvider === 'webgpu') {
        await trackAttemptExecution(runTracker, 'webgpu', executionModelId)

        const result = await generateWebLLMText(
          executionModelId,
          opts.systemPrompt,
          opts.userPrompt,
          buildWebLLMGenerationOptions(
            opts.temperature ?? 0.3,
            opts.maxTokens,
            opts.stopSequences,
            opts.thinking,
          ),
          (chunk) => {
            if (controller.signal.aborted) return
            opts.onChunk(chunk)
          },
          controller.signal,
        )

        if (controller.signal.aborted) throw makeAbortError()
        opts.onComplete(result)

        await runTracker.complete(result)
      } else {
        await trackAttemptExecution(runTracker, activeProvider, executionModelId)

        const fullText = await generateCloudText(
          activeProvider,
          opts.systemPrompt,
          opts.userPrompt,
          opts.temperature ?? 0.3,
          opts.maxTokens ?? 2048,
          (chunk) => {
            if (controller.signal.aborted) return
            opts.onChunk(chunk)
          },
          controller.signal,
        )

        if (controller.signal.aborted) throw makeAbortError()
        opts.onComplete(fullText)

        await runTracker.complete(fullText)
      }
    } catch (err: unknown) {
      if (controller.signal.aborted || isAbortError(err)) {
        await runTracker.cancel()
        return
      }

      console.error(err)
      const message = err instanceof Error ? err.message : 'An error occurred during inference.'
      setErrorMsg(message)

      await runTracker.fail({
        code: 'inference_failed',
        message,
      })
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
