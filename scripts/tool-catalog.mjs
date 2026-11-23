import { existsSync, readFileSync } from 'node:fs'
import { resolve, relative, sep, win32 } from 'node:path'
import ts from 'typescript'

const categories = new Set(['writing', 'career', 'developer', 'audio'])
const capabilityKeys = ['acceptsDocuments', 'supportsLocalExecution', 'supportsCloudExecution', 'supportsStreaming', 'supportsArtifacts']
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0

export function validateCatalog(catalog, root = process.cwd()) {
  if (!Array.isArray(catalog)) throw new Error('Tool catalog must be an array')
  const ids = new Set()
  const legacyWorkspaces = new Set(['history', 'settings'])
  const folders = new Set()
  const entries = []
  for (const tool of catalog) {
    if (!tool || !nonempty(tool.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id)) throw new Error('Invalid tool ID')
    if (ids.has(tool.id)) throw new Error(`Duplicate tool ID: ${tool.id}`)
    ids.add(tool.id)
    if (!Number.isInteger(tool.version) || tool.version < 1 || !nonempty(tool.title) || !nonempty(tool.description)) throw new Error(`Invalid metadata for ${tool.id}`)
    if (!categories.has(tool.categoryId)) throw new Error(`Invalid category for ${tool.id}`)
    if (typeof tool.quickStart !== 'boolean' || (tool.legacyWorkspace !== undefined && !nonempty(tool.legacyWorkspace))) throw new Error(`Invalid navigation metadata for ${tool.id}`)
    if (tool.legacyWorkspace !== undefined) {
      if (legacyWorkspaces.has(tool.legacyWorkspace)) throw new Error(`Duplicate legacy workspace: ${tool.legacyWorkspace}`)
      legacyWorkspaces.add(tool.legacyWorkspace)
    }
    if (typeof tool.enabled !== 'boolean') throw new Error(`Invalid enabled flag for ${tool.id}`)
    if (!tool.capabilities || capabilityKeys.some((key) => typeof tool.capabilities[key] !== 'boolean')) throw new Error(`Invalid capabilities for ${tool.id}`)
    if (tool.actions !== undefined && (!Array.isArray(tool.actions) || tool.actions.some((action) => !action || !nonempty(action.id) || !nonempty(action.title) || !nonempty(action.description) || (action.default !== undefined && typeof action.default !== 'boolean')) || new Set(tool.actions.map((action) => action.id)).size !== tool.actions.length || tool.actions.filter((action) => action.default).length > 1)) throw new Error(`Invalid actions for ${tool.id}`)
    const impl = tool.implementation
    if (!impl || !nonempty(impl.folder) || !nonempty(impl.entry) || !/^[A-Za-z_$][\w$]*$/.test(impl.export ?? '')) throw new Error(`Invalid implementation for ${tool.id}`)
    const folder = resolve(root, impl.folder)
    const entry = resolve(root, impl.entry)
    const folderRelative = relative(root, folder)
    const entryRelative = relative(folder, entry)
    if (folderRelative.startsWith('..') || !folderRelative.startsWith(`src${sep}features${sep}`) || !entryRelative || entryRelative.startsWith('..') || !existsSync(entry)) throw new Error(`Invalid entry for ${tool.id}`)
    if ([...folders].some((other) => folder === other || folder.startsWith(other + sep) || other.startsWith(folder + sep))) throw new Error(`Overlapping implementation folder for ${tool.id}`)
    folders.add(folder)
    entries.push({ entry, tool })
  }
  const program = ts.createProgram(entries.map(({ entry }) => entry), { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true, noResolve: false })
  const checker = program.getTypeChecker()
  for (const { entry, tool } of entries) {
    const impl = tool.implementation
    const source = program.getSourceFile(entry)
    const symbol = source && checker.getSymbolAtLocation(source)
    const exported = symbol && checker.getExportsOfModule(symbol).find((item) => item.name === impl.export)
    const value = exported && (exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported)
    if (!value || !(value.flags & ts.SymbolFlags.Value)) throw new Error(`Missing export ${impl.export} for ${tool.id}`)
  }
  return catalog
}

export function generateToolLoaders(catalog) {
  const entries = catalog.filter((tool) => tool.enabled).map((tool) => `${JSON.stringify(tool.id)}: () => import(${JSON.stringify('/' + tool.implementation.entry)}).then(m => ({ default: m[${JSON.stringify(tool.implementation.export)}] }))`)
  return `export const toolLoaders = { ${entries.join(',\n')} };`
}

export function findDisabledModules(catalog, moduleIds, root = process.cwd()) {
  const windows = /^[A-Za-z]:[\\/]/.test(root)
  const normalize = (value) => {
    const path = value.replace(/\\/g, '/')
    return windows ? path.toLowerCase() : path
  }
  const folders = catalog.filter((tool) => !tool.enabled).map((tool) => normalize(windows ? win32.resolve(root, tool.implementation.folder) : resolve(root, tool.implementation.folder)) + '/')
  return moduleIds.filter((id) => folders.some((folder) => normalize(id.split('?')[0]).startsWith(folder)))
}

export function toolCatalogPlugin() {
  const virtualId = 'virtual:tool-loaders'
  const resolvedId = '\0' + virtualId
  let catalog
  return {
    name: 'tool-catalog',
    async buildStart() {
      const catalogPath = resolve(process.cwd(), 'src/tools/catalog.ts')
      this.addWatchFile(catalogPath)
      const source = readFileSync(catalogPath, 'utf8')
      const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      const dataUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
      catalog = validateCatalog((await import(dataUrl)).TOOL_CATALOG_DATA)
    },
    resolveId(id) { if (id === virtualId) return resolvedId },
    load(id) { if (id === resolvedId) return generateToolLoaders(catalog) },
    generateBundle(_options, bundle) {
      const modules = Object.values(bundle).flatMap((output) => output.type === 'chunk' ? Object.keys(output.modules) : [])
      const disabled = findDisabledModules(catalog, modules)
      if (disabled.length) this.error(`Disabled tool modules were imported: ${disabled.join(', ')}`)
    },
    handleHotUpdate(ctx) { if (ctx.file.endsWith('/src/tools/catalog.ts')) ctx.server.restart() },
  }
}
