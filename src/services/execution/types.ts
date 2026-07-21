import type { ProviderId } from '../../config/providers'
import type { RunLocality, RunStatus } from '../../db/db'

export type ExecutionProviderId = ProviderId
export type ExecutionRequestedProviderId = string
export type ExecutionLocality = RunLocality
export type ExecutionRunStatus = RunStatus

export type ExecutionCloudProviderId = Extract<ExecutionProviderId, 'openai' | 'anthropic' | 'gemini' | 'openrouter'>
export type ExecutionLocalProviderId = Extract<ExecutionProviderId, 'ollama' | 'webgpu'>

export interface ExecutionError {
  code: string
  message: string
}

export interface ExecutionRequestCancellation {
  owner: 'application' | 'tool'
  reason?: string
}

export interface ExecutionRequestCallbacks<TOutput = unknown> {
  onProgress?: (status: ExecutionRunStatus) => void
  onSuccess?: (output: TOutput) => void
  onError?: (error: ExecutionError) => void
  onCancel?: () => void
}

export interface ExecutionStructuredTask<TKind extends string = string, TPayload = unknown> {
  kind: TKind
  payload: TPayload
}

export interface ExecutionRequest<TInput = unknown, TOutput = unknown, TStructuredTask = unknown> {
  toolId: string
  toolVersion: number
  actionId?: string
  providerId: ExecutionRequestedProviderId
  modelId: string
  locality?: ExecutionLocality
  task?: TStructuredTask
  input: TInput
  cancellation?: ExecutionRequestCancellation
  callbacks?: ExecutionRequestCallbacks<TOutput>
}

export interface ProviderCapabilityMetadata {
  providerId: ExecutionProviderId
  locality: ExecutionLocality
  kind: 'cloud' | 'localhost' | 'webgpu'
  requiresNetwork: boolean
  allowedInPrivacyMode: boolean
}

export interface ExecutionPolicyAllowDecision {
  allowed: true
  providerId: ExecutionRequestedProviderId
  reason: string
  capabilities?: ProviderCapabilityMetadata
}

export interface ExecutionPolicyDenyDecision {
  allowed: false
  providerId: ExecutionRequestedProviderId
  reason: string
  capabilities?: ProviderCapabilityMetadata
}

export type ExecutionPolicyDecision = ExecutionPolicyAllowDecision | ExecutionPolicyDenyDecision
