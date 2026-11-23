import { describe, expect, it } from 'vitest'
import { prebuiltAppConfig } from '@mlc-ai/web-llm'
import { resolveWebLLMDefault, WEBLLM_MODEL_CONFIGS, WEBLLM_TASK_DEFAULTS } from './modelCatalog'

describe('local model catalog', () => {
  it('uses model IDs supported by the installed WebLLM runtime', () => {
    const supported = new Set(prebuiltAppConfig.model_list.map((model) => model.model_id))
    expect(WEBLLM_MODEL_CONFIGS.map((model) => model.modelId).filter((id) => !supported.has(id))).toEqual([])
    expect(Object.values(WEBLLM_TASK_DEFAULTS).every((id) => supported.has(id))).toBe(true)
  })
  it('chooses tool-specific defaults and respects explicit model selection', () => {
    expect(resolveWebLLMDefault(true, 'manual', 'career')).toBe(WEBLLM_TASK_DEFAULTS['gap-analysis'])
    expect(resolveWebLLMDefault(true, 'manual', 'speech-studio')).toBe(WEBLLM_TASK_DEFAULTS.grammar)
    expect(resolveWebLLMDefault(false, 'manual', 'career')).toBe('manual')
  })
})
