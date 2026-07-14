export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'webgpu';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
}

export type WebLLMModelTier = 'fast' | 'balanced' | 'quality';

export interface WebLLMModelConfig {
  modelId: string;
  label: string;
  tier: WebLLMModelTier;
  vramRequiredMB: number;
  contextWindow: number;
  recommendedFor: string[];
  warning?: string;
}

export const WEBLLM_MODEL_CONFIGS: WebLLMModelConfig[] = [
  {
    modelId: 'gemma3-1b-it-q4f16_1-MLC',
    label: 'Gemma 3 1B Instruct',
    tier: 'fast',
    vramRequiredMB: 711.07,
    contextWindow: 4096,
    recommendedFor: ['Fast rewrites', 'Short drafting', 'Low-memory devices'],
  },
  {
    modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 1B Instruct',
    tier: 'fast',
    vramRequiredMB: 879.04,
    contextWindow: 4096,
    recommendedFor: ['Quick summaries', 'Classification', 'General local chat'],
  },
  {
    modelId: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    label: 'SmolLM2 360M Instruct',
    tier: 'fast',
    vramRequiredMB: 376.06,
    contextWindow: 4096,
    recommendedFor: ['Very low-memory devices', 'Simple extraction', 'Smoke tests'],
    warning: 'Requires shader-f16 WebGPU support.',
  },
  {
    modelId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    label: 'Qwen2.5 1.5B Instruct',
    tier: 'balanced',
    vramRequiredMB: 1629.75,
    contextWindow: 4096,
    recommendedFor: ['Default local assistant', 'Balanced quality and speed', 'Structured outputs'],
  },
  {
    modelId: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 2B Instruct',
    tier: 'quality',
    vramRequiredMB: 1895.3,
    contextWindow: 4096,
    recommendedFor: ['Grammar and tone', 'Longer rewrites', 'Careful local drafting'],
    warning: 'Requires shader-f16 WebGPU support.',
  },
  {
    modelId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 3B Instruct',
    tier: 'quality',
    vramRequiredMB: 2263.69,
    contextWindow: 4096,
    recommendedFor: ['Higher quality local chat', 'Reasoning-heavy prompts', 'Career content'],
  },
  {
    modelId: 'Qwen3-4B-q4f16_1-MLC',
    label: 'Qwen3 4B',
    tier: 'quality',
    vramRequiredMB: 3431.59,
    contextWindow: 4096,
    recommendedFor: ['Best local quality', 'Complex instructions', 'Detailed analysis'],
    warning: 'Use on devices with at least 4GB available GPU memory.',
  },
];

export const WEBLLM_MODEL_CONFIG_BY_ID: Record<string, WebLLMModelConfig> =
  Object.fromEntries(WEBLLM_MODEL_CONFIGS.map((config) => [config.modelId, config]));

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
    'claude-3-opus-20240229'
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ],
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
