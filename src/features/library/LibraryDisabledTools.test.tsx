import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../../tools/registry', () => ({ TOOL_CATALOG_BY_ID: { career: { id: 'career', title: 'Career Suite', enabled: false, actions: [{ id: 'gap-analysis', title: 'Gap Analysis' }] } } }))
vi.mock('../../repositories', () => ({
  runsRepository: { list: async () => [{ id: 1, toolId: 'career', actionId: 'gap-analysis', status: 'completed', input: 'saved input', output: 'saved output', execution: { providerId: 'webgpu', modelId: 'model', locality: 'webgpu' }, createdAt: 1 }], delete: vi.fn(), clear: vi.fn() },
  documentRecordsRepository: { list: async () => [] },
  artifactsRepository: { list: async () => [{ id: 2, toolId: 'career', type: 'text', title: 'Saved artifact', content: 'content', createdAt: 1 }], delete: vi.fn(), clear: vi.fn() },
}))
import { LibraryPage } from './LibraryPage'

describe('disabled tool records', () => {
  it('retains readable run metadata but prevents deletion', async () => {
    render(<LibraryPage section="runs" onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clear runs/i })).toBeDisabled()
    expect(await screen.findByText('saved output')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete run/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clear runs/i })).toBeDisabled()
  })
  it('retains artifacts but prevents deletion', async () => {
    render(<LibraryPage section="artifacts" onNavigate={vi.fn()} />)
    expect(await screen.findByText(/"content"/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete artifact/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clear artifacts/i })).toBeDisabled()
  })
  it('restores record actions when the tool is enabled in a later build', async () => {
    const { TOOL_CATALOG_BY_ID } = await import('../../tools/registry')
    const tool = TOOL_CATALOG_BY_ID.career!
    tool.enabled = true
    try {
      render(<LibraryPage section="runs" onNavigate={vi.fn()} />)
      expect(await screen.findByText('saved output')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete run/i })).toBeEnabled()
    } finally {
      tool.enabled = false
    }
  })
})
