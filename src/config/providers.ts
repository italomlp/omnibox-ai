export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'webgpu';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  selectedModel: string;
}

export const PROVIDER_DEFAULT_MODELS: Record<ProviderId, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  openrouter: 'meta-llama/llama-3-8b-instruct:free',
  ollama: 'llama3',
  webgpu: 'gemma-2-2b-it-q4f16_1-MLC',
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
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openrouter: [
    'meta-llama/llama-3-8b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemini-flash-1.5-exp:free',
    'mistralai/mistral-7b-instruct:free',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
  ],
  ollama: ['llama3', 'llama3.1', 'gemma2', 'phi3', 'mistral', 'qwen2'],
  webgpu: [
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    'gemma-2-2b-it-q4f16_1-MLC',
    'Phi-3.5-mini-instruct-q4f16_1-MLC',
  ],
};
