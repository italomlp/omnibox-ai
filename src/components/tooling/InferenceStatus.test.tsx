import { renderToStaticMarkup } from 'react-dom/server'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InferenceStatus } from './InferenceStatus'

describe('shared inference status', () => {
  it('shows local model loading and the supplied error title', () => {
    const html = renderToStaticMarkup(<InferenceStatus inference={{ activeProvider: 'webgpu', setActiveProvider: vi.fn(), availableProviders: ['webgpu', 'ollama'], selectedModel: 'test-model', errorMsg: 'Failure', clearError: vi.fn(), webLLM: { isLoading: true, loadPercent: 50, speed: '', loadProgress: 'Loading' } }} title="Cleanup failed" />)
    expect(html).toContain('Loading WebGPU Model assets (test-model)')
    expect(html).toContain('Cleanup failed')
    expect(html).toContain('Failure')
  })
  it('offers a user-initiated local fallback when WebGPU fails', () => {
    const setActiveProvider = vi.fn()
    render(<InferenceStatus inference={{ activeProvider: 'webgpu', setActiveProvider, availableProviders: ['webgpu', 'ollama'], selectedModel: 'model', errorMsg: 'GPU unavailable', clearError: vi.fn(), webLLM: { isLoading: false, loadPercent: 0, speed: '', loadProgress: '' } }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use local Ollama' }))
    expect(setActiveProvider).toHaveBeenCalledWith('ollama')
  })
})
