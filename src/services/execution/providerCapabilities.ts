import type { ProviderId } from '../../config/providers'
import type { ProviderCapabilityMetadata, ExecutionLocality } from './types'

export const PROVIDER_CAPABILITIES = {
  openai: {
    providerId: 'openai',
    locality: 'cloud',
    kind: 'cloud',
    requiresNetwork: true,
    allowedInPrivacyMode: false,
  },
  anthropic: {
    providerId: 'anthropic',
    locality: 'cloud',
    kind: 'cloud',
    requiresNetwork: true,
    allowedInPrivacyMode: false,
  },
  gemini: {
    providerId: 'gemini',
    locality: 'cloud',
    kind: 'cloud',
    requiresNetwork: true,
    allowedInPrivacyMode: false,
  },
  openrouter: {
    providerId: 'openrouter',
    locality: 'cloud',
    kind: 'cloud',
    requiresNetwork: true,
    allowedInPrivacyMode: false,
  },
  ollama: {
    providerId: 'ollama',
    locality: 'localhost',
    kind: 'localhost',
    requiresNetwork: false,
    allowedInPrivacyMode: true,
  },
  webgpu: {
    providerId: 'webgpu',
    locality: 'webgpu',
    kind: 'webgpu',
    requiresNetwork: false,
    allowedInPrivacyMode: true,
  },
} as const satisfies Readonly<Record<ProviderId, ProviderCapabilityMetadata>>

export const PROVIDER_IDS = Object.keys(PROVIDER_CAPABILITIES) as ProviderId[]

export const isKnownProviderId = (providerId: string): providerId is ProviderId =>
  Object.prototype.hasOwnProperty.call(PROVIDER_CAPABILITIES, providerId)

export const getProviderCapabilities = (providerId: string): ProviderCapabilityMetadata | undefined =>
  isKnownProviderId(providerId) ? PROVIDER_CAPABILITIES[providerId] : undefined

export const getProviderLocality = (providerId: string): ExecutionLocality | undefined =>
  getProviderCapabilities(providerId)?.locality

export const isCloudProviderId = (providerId: string): boolean =>
  getProviderCapabilities(providerId)?.kind === 'cloud'
