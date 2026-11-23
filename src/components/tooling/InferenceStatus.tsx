import React from 'react'
import type { UseInferenceReturn } from '../../hooks/useInference'
import { ErrorAlert } from '../shared/ErrorAlert'
import { WebGPULoadingOverlay } from '../shared/WebGPULoadingOverlay'

type InferenceStatusState = Pick<UseInferenceReturn, 'activeProvider' | 'setActiveProvider' | 'availableProviders' | 'selectedModel' | 'errorMsg' | 'clearError'> & {
  webLLM: Pick<UseInferenceReturn['webLLM'], 'isLoading' | 'loadPercent' | 'speed' | 'loadProgress'>
}

export const InferenceStatus: React.FC<{ inference: InferenceStatusState; title?: string }> = ({ inference, title }) => (
  <>
    <WebGPULoadingOverlay
      isLoading={inference.activeProvider === 'webgpu' && inference.webLLM.isLoading}
      selectedModel={inference.selectedModel}
      loadPercent={inference.webLLM.loadPercent}
      speed={inference.webLLM.speed}
      loadProgress={inference.webLLM.loadProgress}
    />
    <ErrorAlert errorMsg={inference.errorMsg} activeProvider={inference.activeProvider} onDismiss={inference.clearError} title={title} onUseOllama={inference.availableProviders.includes('ollama') ? () => { inference.setActiveProvider('ollama'); inference.clearError() } : undefined} />
  </>
)
