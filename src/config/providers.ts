export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'webgpu';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
}

export type WebLLMModelTier = 'fast' | 'balanced' | 'quality';

export type WebLLMTaskKey = 'grammar' | 'tone' | 'career' | 'structuredOutput';

export type WebLLMTaskSupportStatus = 'supported' | 'best-effort' | 'blocked';

export interface WebLLMTaskSupport {
  grammar: WebLLMTaskSupportStatus;
  tone: WebLLMTaskSupportStatus;
  career: WebLLMTaskSupportStatus;
  structuredOutput: WebLLMTaskSupportStatus;
}

export interface WebLLMModelConfig {
  modelId: string;
  label: string;
  family: string;
  parameterCount: string;
  tier: WebLLMModelTier;
  downloadSizeMB: number;
  minimumAvailableMemoryMB: number;
  recommendedAvailableMemoryMB: number;
  recommendedSystemMemoryGB: number;
  maxRecommendedInputTokens: number;
  taskSupport: WebLLMTaskSupport;
  vramRequiredMB: number;
  contextWindow: number;
  recommendedFor: string[];
  requiredWebGpuFeatures?: string[];
  supportsThinkingControl?: boolean;
  warning?: string;
}

export const WEBLLM_TIER_LABELS: Record<WebLLMModelTier, string> = {
  fast: 'Fast',
  balanced: 'Balanced',
  quality: 'Quality',
};

export const WEBLLM_TASK_LABELS: Record<WebLLMTaskKey, string> = {
  grammar: 'Grammar',
  tone: 'Tone',
  career: 'Career',
  structuredOutput: 'Structured output',
};

export const WEBLLM_TASK_SUPPORT_LABELS: Record<WebLLMTaskSupportStatus, string> = {
  supported: 'Supported',
  'best-effort': 'Best-effort',
  blocked: 'Blocked',
};

export const WEBLLM_TASK_KEYS: WebLLMTaskKey[] = ['grammar', 'tone', 'career', 'structuredOutput'];

export const WEBLLM_MODEL_CONFIGS: WebLLMModelConfig[] = [
  {
    modelId: 'gemma3-1b-it-q4f16_1-MLC',
    label: 'Gemma 3 1B Instruct',
    family: 'Gemma 3',
    parameterCount: '1B',
    tier: 'fast',
    downloadSizeMB: 790,
    minimumAvailableMemoryMB: 1500,
    recommendedAvailableMemoryMB: 2000,
    recommendedSystemMemoryGB: 8,
    maxRecommendedInputTokens: 3072,
    taskSupport: {
      grammar: 'best-effort',
      tone: 'best-effort',
      career: 'blocked',
      structuredOutput: 'best-effort',
    },
    vramRequiredMB: 711.07,
    contextWindow: 4096,
    recommendedFor: ['Fast rewrites', 'Short drafting', 'Low-memory devices'],
  },
  {
    modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B Instruct',
    family: 'Llama 3.2',
    parameterCount: '1B',
    tier: 'fast',
    downloadSizeMB: 860,
    minimumAvailableMemoryMB: 1500,
    recommendedAvailableMemoryMB: 2000,
    recommendedSystemMemoryGB: 8,
    maxRecommendedInputTokens: 3072,
    taskSupport: {
      grammar: 'best-effort',
      tone: 'best-effort',
      career: 'blocked',
      structuredOutput: 'best-effort',
    },
    vramRequiredMB: 879.04,
    contextWindow: 4096,
    recommendedFor: ['Quick summaries', 'Classification', 'General local chat'],
  },
  {
    modelId: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 360M Instruct',
    family: 'SmolLM2',
    parameterCount: '360M',
    tier: 'fast',
    downloadSizeMB: 380,
    minimumAvailableMemoryMB: 1000,
    recommendedAvailableMemoryMB: 1500,
    recommendedSystemMemoryGB: 8,
    maxRecommendedInputTokens: 2048,
    taskSupport: {
      grammar: 'best-effort',
      tone: 'blocked',
      career: 'blocked',
      structuredOutput: 'best-effort',
    },
    vramRequiredMB: 376.06,
    contextWindow: 4096,
    recommendedFor: ['Very low-memory devices', 'Simple extraction', 'Smoke tests'],
    requiredWebGpuFeatures: ['shader-f16'],
    warning: 'Requires shader-f16 WebGPU support.',
  },
  {
    modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B Instruct',
    family: 'Qwen2.5',
    parameterCount: '1.5B',
    tier: 'balanced',
    downloadSizeMB: 1650,
    minimumAvailableMemoryMB: 2000,
    recommendedAvailableMemoryMB: 2500,
    recommendedSystemMemoryGB: 12,
    maxRecommendedInputTokens: 3072,
    taskSupport: {
      grammar: 'supported',
      tone: 'best-effort',
      career: 'blocked',
      structuredOutput: 'supported',
    },
    vramRequiredMB: 1629.75,
    contextWindow: 4096,
    recommendedFor: ['Default local assistant', 'Balanced quality and speed', 'Structured outputs'],
  },
  {
    modelId: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B Instruct',
    family: 'Gemma 2',
    parameterCount: '2B',
    tier: 'quality',
    downloadSizeMB: 1950,
    minimumAvailableMemoryMB: 2500,
    recommendedAvailableMemoryMB: 3000,
    recommendedSystemMemoryGB: 12,
    maxRecommendedInputTokens: 3072,
    taskSupport: {
      grammar: 'supported',
      tone: 'supported',
      career: 'best-effort',
      structuredOutput: 'best-effort',
    },
    vramRequiredMB: 1895.3,
    contextWindow: 4096,
    recommendedFor: ['Grammar and tone', 'Longer rewrites', 'Careful local drafting'],
    requiredWebGpuFeatures: ['shader-f16'],
    warning: 'Requires shader-f16 WebGPU support.',
  },
  {
    modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B Instruct',
    family: 'Llama 3.2',
    parameterCount: '3B',
    tier: 'quality',
    downloadSizeMB: 2280,
    minimumAvailableMemoryMB: 3000,
    recommendedAvailableMemoryMB: 3500,
    recommendedSystemMemoryGB: 16,
    maxRecommendedInputTokens: 3584,
    taskSupport: {
      grammar: 'supported',
      tone: 'supported',
      career: 'supported',
      structuredOutput: 'supported',
    },
    vramRequiredMB: 2263.69,
    contextWindow: 4096,
    recommendedFor: ['Higher quality local chat', 'Reasoning-heavy prompts', 'Career content'],
  },
  {
    modelId: 'Qwen3-4B-q4f16_1-MLC',
    label: 'Qwen3 4B',
    family: 'Qwen3',
    parameterCount: '4B',
    tier: 'quality',
    downloadSizeMB: 3440,
    minimumAvailableMemoryMB: 4500,
    recommendedAvailableMemoryMB: 5000,
    recommendedSystemMemoryGB: 16,
    maxRecommendedInputTokens: 3584,
    taskSupport: {
      grammar: 'supported',
      tone: 'supported',
      career: 'supported',
      structuredOutput: 'supported',
    },
    vramRequiredMB: 3431.59,
    contextWindow: 4096,
    recommendedFor: ['Best local quality', 'Complex instructions', 'Detailed analysis'],
    warning: 'Largest download in the local set; best on desktop-class GPUs.',
  },
];

export const WEBLLM_MODEL_CONFIG_BY_ID: Record<string, WebLLMModelConfig> = Object.fromEntries(
  WEBLLM_MODEL_CONFIGS.map((config) => [config.modelId, config])
);

export const WEBLLM_MODEL_CONFIGS_BY_TIER: Record<WebLLMModelTier, WebLLMModelConfig[]> = {
  fast: WEBLLM_MODEL_CONFIGS.filter((config) => config.tier === 'fast'),
  balanced: WEBLLM_MODEL_CONFIGS.filter((config) => config.tier === 'balanced'),
  quality: WEBLLM_MODEL_CONFIGS.filter((config) => config.tier === 'quality'),
};

export const isSupportedWebLLMModel = (modelId: string): boolean =>
  Object.prototype.hasOwnProperty.call(WEBLLM_MODEL_CONFIG_BY_ID, modelId);

export const PROVIDER_DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-2.5-flash',
  openrouter: 'google/gemini-2.5-flash:free',
  ollama: 'llama3',
  webgpu: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
};

export const PROVIDER_DEFAULT_URLS: Record<ProviderId, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai',
  ollama: 'http://localhost:11434',
  webgpu: '',
};

export const PROVIDER_MODELS_LIST: Record<ProviderId, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'o3-mini', 'o1'],
  anthropic: [
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  openrouter: [
    'deepseek/deepseek-r1:free',
    'google/gemini-2.5-flash:free',
    'openai/o3-mini',
    'meta-llama/llama-3.3-70b-instruct',
    'anthropic/claude-3.7-sonnet',
    'openai/gpt-4o-mini',
  ],
  ollama: ['deepseek-r1', 'llama3.3', 'qwen2.5', 'llama3.1', 'gemma2', 'phi4'],
  webgpu: WEBLLM_MODEL_CONFIGS.map((config) => config.modelId),
};
