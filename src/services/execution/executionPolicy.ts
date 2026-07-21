import { getProviderCapabilities } from './providerCapabilities'
import type { ExecutionPolicyDecision } from './types'

const CLOUD_PRIVACY_DENY_REASON = 'Privacy mode blocks cloud provider requests.'
const UNKNOWN_PROVIDER_DENY_REASON = 'Unknown provider selection.'
const LOCAL_ALLOW_REASON = 'Local execution is allowed in privacy mode.'
const CLOUD_ALLOW_REASON = 'Cloud execution is allowed while privacy mode is off.'

export const evaluateExecutionPolicy = (
  privacyMode: boolean,
  requestedProviderId: string,
): ExecutionPolicyDecision => {
  const capabilities = getProviderCapabilities(requestedProviderId)

  if (!capabilities) {
    return {
      allowed: false,
      providerId: requestedProviderId,
      reason: UNKNOWN_PROVIDER_DENY_REASON,
    }
  }

  if (privacyMode && capabilities.kind === 'cloud') {
    return {
      allowed: false,
      providerId: requestedProviderId,
      reason: CLOUD_PRIVACY_DENY_REASON,
      capabilities,
    }
  }

  return {
    allowed: true,
    providerId: requestedProviderId,
    reason: capabilities.kind === 'cloud' ? CLOUD_ALLOW_REASON : LOCAL_ALLOW_REASON,
    capabilities,
  }
}
