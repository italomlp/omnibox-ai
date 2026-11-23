// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateCatalog, generateToolLoaders, findDisabledModules } from './tool-catalog.mjs'

const entry = { id: 'example', version: 1, title: 'Example', description: 'Example tool', categoryId: 'writing', enabled: true, quickStart: false, implementation: { folder: 'src/features/grammar', entry: 'src/features/grammar/GrammarWorkspace.tsx', export: 'GrammarWorkspace' }, capabilities: { acceptsDocuments: true, supportsLocalExecution: true, supportsCloudExecution: true, supportsStreaming: true, supportsArtifacts: false } }

describe('build-time tool catalog', () => {
  it('rejects duplicate identifiers and invalid metadata', () => {
    expect(() => validateCatalog([entry, entry])).toThrow(/duplicate/i)
    expect(() => validateCatalog([{ ...entry, categoryId: 'missing' }])).toThrow(/category/i)
    expect(() => validateCatalog([{ ...entry, enabled: 'yes' }])).toThrow(/enabled/i)
  })
  it('validates implementation files and exports', () => {
    expect(() => validateCatalog([{ ...entry, implementation: { ...entry.implementation, entry: 'src/features/grammar/missing.tsx' } }])).toThrow(/entry/i)
    expect(() => validateCatalog([{ ...entry, implementation: { ...entry.implementation, export: 'MissingExport' } }])).toThrow(/export/i)
    expect(() => validateCatalog([{ ...entry, implementation: { folder: 'src/features/grammar', entry: 'src/features/grammar/harperGrammar.ts', export: 'LocalGrammarDiagnostic' } }])).toThrow(/export/i)
  })
  it('omits disabled entry imports from the generated module', () => {
    const output = generateToolLoaders([entry, { ...entry, id: 'other', enabled: false }])
    expect(output).toContain('example')
    expect(output).not.toContain('other')
  })
  it('detects disabled feature modules pulled into the build by other imports', () => {
    const disabled = [{ ...entry, enabled: false }]
    expect(findDisabledModules(disabled, ['/project/src/features/grammar/GrammarWorkspace.tsx'], '/project')).toHaveLength(1)
    expect(findDisabledModules(disabled, ['/project/src/components/shared/Button.tsx'], '/project')).toHaveLength(0)
    expect(findDisabledModules(disabled, ['C:/project/src/features/grammar/GrammarWorkspace.tsx?x'], 'C:\\project')).toHaveLength(1)
  })
})
