/** Builds an isolated copy with Grammar disabled and checks its runtime integration. */
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const scratch = mkdtempSync(join(tmpdir(), 'omnibox-disabled-tool-'))
try {
  for (const path of ['src', 'scripts', 'public', 'index.html', 'package.json', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'vite.config.ts', '.gitignore', '.oxlintrc.json']) {
    cpSync(resolve(root, path), join(scratch, path), { recursive: true })
  }
  symlinkSync(resolve(root, 'node_modules'), join(scratch, 'node_modules'), 'dir')
  const catalogPath = join(scratch, 'src/tools/catalog.ts')
  const source = readFileSync(catalogPath, 'utf8')
  const disabled = source.replace(/("id": "grammar-tone"[\s\S]*?"enabled": )true/, '$1false')
  if (disabled === source) throw new Error('Grammar enabled flag was not found')
  writeFileSync(catalogPath, disabled)
  for (const args of [['run', 'lint'], ['run', 'build'], ['test', '--', 'src/tools/catalog.integration.test.tsx']]) {
    execFileSync('npm', args, { cwd: scratch, stdio: 'inherit' })
  }
  const assets = readdirSync(join(scratch, 'dist/assets'))
  if (assets.some((name) => name.startsWith('GrammarWorkspace-') || name.includes('harper'))) throw new Error('Disabled Grammar assets are present in the build')
  console.log('Disabled Grammar build and integration checks passed.')
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
