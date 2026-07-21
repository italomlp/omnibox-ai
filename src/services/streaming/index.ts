export type {
  LLMRequest,
  StreamCallbacks,
  ProviderRequestConfig,
  OpenAIRequestBody,
  GeminiRequestBody,
  AnthropicRequestBody,
  ProviderId,
} from './types'

export { OllamaCORSException, AnthropicCORSException } from './errors'
export { buildProviderRequest } from './buildProviderRequest'
export { parseOpenAIChunk, parseGeminiChunk, parseAnthropicChunk, getChunkParser } from './parsers'
export { executeSSEStream } from './executeSSEStream'

// ---------------------------------------------------------------------------
// Re-imports for streamLLM implementation
// ---------------------------------------------------------------------------

import type { LLMRequest, StreamCallbacks, ProviderId } from './types'
import { buildProviderRequest } from './buildProviderRequest'
import { getChunkParser } from './parsers'
import { executeSSEStream } from './executeSSEStream'
import { evaluateExecutionPolicy, type ExecutionPolicyContext } from '../execution'

interface StreamConfig {
  apiKey: string
  baseUrl: string
  selectedModel: string
}

/**
 * Unified entry point that replaces `StreamingClient.stream()`.
 *
 * Orchestrates request building → parser selection → SSE execution in a
 * single call.  WebGPU is intentionally rejected here — callers must use
 * the `useWebLLM` hook for local inference.
 */
export async function streamLLM(
  provider: ProviderId,
  config: StreamConfig,
  request: LLMRequest,
  callbacks: StreamCallbacks,
  policyContext: ExecutionPolicyContext,
  signal?: AbortSignal,
): Promise<void> {
  const policyDecision = evaluateExecutionPolicy(policyContext.privacyMode, provider)
  if (!policyDecision.allowed) {
    throw new Error(policyDecision.reason)
  }

  const requestConfig = buildProviderRequest(provider, config, request)
  const parser = getChunkParser(provider)
  return executeSSEStream(requestConfig, parser, callbacks, provider, signal)
}
