// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { evaluateExecutionPolicy } from './executionPolicy'

describe('evaluateExecutionPolicy', () => {
  it('denies cloud providers while privacy mode is enabled', () => {
    for (const providerId of ['openai', 'anthropic', 'gemini', 'openrouter'] as const) {
      const decision = evaluateExecutionPolicy(true, providerId)

      expect(decision).toEqual({
        allowed: false,
        providerId,
        reason: 'Privacy mode blocks cloud provider requests.',
        capabilities: expect.objectContaining({
          providerId,
          kind: 'cloud',
        }),
      })
    }
  })

  it('allows local providers while privacy mode is enabled', () => {
    for (const providerId of ['ollama', 'webgpu'] as const) {
      const decision = evaluateExecutionPolicy(true, providerId)

      expect(decision).toEqual({
        allowed: true,
        providerId,
        reason: 'Local execution is allowed in privacy mode.',
        capabilities: expect.objectContaining({
          providerId,
        }),
      })
    }
  })

  it('rejects unknown providers', () => {
    expect(evaluateExecutionPolicy(false, 'unknown-provider')).toEqual({
      allowed: false,
      providerId: 'unknown-provider',
      reason: 'Unknown provider selection.',
    })
  })
})
