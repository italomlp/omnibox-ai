import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { toolLoaders } from 'virtual:tool-loaders'
import { TOOL_CATALOG, TOOL_CATALOG_BY_ID, TOOL_REGISTRY } from './registry'
import { resolveRoute, routeForLegacyWorkspace } from '../navigation/routes'
import { buildCommandPaletteSections } from '../features/command-palette/commandPaletteData'
import { ToolRoutePage } from '../features/tools/ToolRoutePage'
import { HistoryItemCard } from '../features/history/HistoryItemCard'
import { HistoryDetailPanel } from '../features/history/HistoryDetailPanel'
import { render, screen, cleanup } from '@testing-library/react'

describe('catalog integration', () => {
  it('exposes exactly the enabled tools to loaders, navigation and search', () => {
    const enabled = TOOL_CATALOG.filter((tool) => tool.enabled)
    expect(Object.keys(toolLoaders).sort()).toEqual(enabled.map((tool) => tool.id).sort())
    expect(TOOL_REGISTRY.map((tool) => tool.id)).toEqual(enabled.map((tool) => tool.id))
    const commands = buildCommandPaletteSections('').flatMap((section) => section.items.map((item) => item.id))
    for (const tool of TOOL_CATALOG) {
      expect(TOOL_CATALOG_BY_ID[tool.id]?.title).toBe(tool.title)
      expect(commands.includes(tool.id)).toBe(tool.enabled)
      expect(resolveRoute(new URL(`https://example.test/?tool=${tool.id}`)).route.view).toBe(tool.enabled ? 'tool' : 'workbench')
      if (tool.legacyWorkspace) expect(routeForLegacyWorkspace(tool.legacyWorkspace)?.view ?? null).toBe(tool.enabled ? 'tool' : null)
      if (!tool.enabled) expect(renderToString(<ToolRoutePage toolId={tool.id} onNavigate={vi.fn()} />)).toContain('Tool unavailable')
    }
  })
  it('keeps legacy records visible and only enables reload when their tool is enabled', () => {
    const log = { id: 1, workspaceId: 'grammar', toolId: 'grammar', timestamp: 1, input: 'saved input', output: 'saved output', provider: 'webgpu', model: 'test' }
    const available = Boolean(TOOL_REGISTRY.find((tool) => tool.legacyWorkspace === 'grammar'))
    render(<HistoryItemCard log={log} onSelect={vi.fn()} onDelete={vi.fn()} onReload={vi.fn()} />)
    expect(screen.getByText('saved output')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload this entry/i }).hasAttribute('disabled')).toBe(!available)
    cleanup()
    render(<HistoryDetailPanel log={log} onClose={vi.fn()} onReload={vi.fn()} />)
    expect(screen.getByRole('button', { name: /reload these inputs/i }).hasAttribute('disabled')).toBe(!available)
  })
})
