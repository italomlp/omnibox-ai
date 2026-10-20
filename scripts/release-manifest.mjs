#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'

const USAGE = 'node scripts/release-manifest.mjs --web-sha <40-hex> --mobile-sha <40-hex> --verification-report <report.json> --output <manifest.json> --artifact <file> [--artifact <file> ...]'
const allowed = new Set(['--web-sha', '--mobile-sha', '--verification-report', '--output', '--artifact'])
const statuses = new Set(['passed', 'failed', 'not-run'])

function parseArgs(args) {
  const options = { artifacts: [] }
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
    const value = args[index + 1]
    if (!allowed.has(key) || !value || value.startsWith('--')) throw new Error(USAGE)
    if (key === '--artifact') options.artifacts.push(value)
    else {
      if (Object.hasOwn(options, key)) throw new Error(`Duplicate argument: ${key}`)
      options[key] = value
    }
  }
  for (const key of ['--web-sha', '--mobile-sha']) {
    if (!/^[a-fA-F0-9]{40}$/.test(options[key] ?? '')) throw new Error(`${key} must be a full 40-character hexadecimal commit SHA`)
  }
  if (!options['--verification-report'] || !options['--output'] || options.artifacts.length === 0) throw new Error(USAGE)
  return options
}

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === [...expected].sort().join(',')
}

function validateReport(report) {
  if (!exactKeys(report, ['checks', 'liveInference']) || !Array.isArray(report.checks) || report.checks.length === 0) {
    throw new Error('Verification report must contain only nonempty checks and liveInference fields')
  }
  if (!['not-live-verified', 'live-verified'].includes(report.liveInference)) throw new Error('Invalid liveInference status')
  const names = new Set()
  const checks = report.checks.map((check) => {
    if (!exactKeys(check, ['name', 'status']) || typeof check.name !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(check.name) || !statuses.has(check.status)) {
      throw new Error('Each check must contain only a lowercase hyphenated name and status passed, failed or not-run')
    }
    if (names.has(check.name)) throw new Error('Duplicate verification check name')
    names.add(check.name)
    return { name: check.name, status: check.status }
  })
  return { checks: checks.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0), liveInference: report.liveInference }
}

async function describeFile(path) {
  const metadata = await stat(path)
  if (!metadata.isFile()) throw new Error('All artifact and report inputs must be regular files')
  const bytes = await readFile(path)
  return { name: basename(path), size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
}

try {
  const options = parseArgs(process.argv.slice(2))
  const reportPath = options['--verification-report']
  const report = validateReport(JSON.parse(await readFile(reportPath, 'utf8')))
  const artifacts = []
  const names = new Set()
  for (const path of options.artifacts) {
    const artifact = await describeFile(path)
    if (names.has(artifact.name)) throw new Error('Artifact basenames must be unique')
    names.add(artifact.name)
    artifacts.push(artifact)
  }
  artifacts.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  const manifest = {
    schemaVersion: 1,
    release: '0.1.0-alpha.1',
    sources: { web: options['--web-sha'].toLowerCase(), mobile: options['--mobile-sha'].toLowerCase() },
    artifacts,
    verification: { report: await describeFile(reportPath), ...report },
  }
  await writeFile(options['--output'], `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })
  console.log('Release manifest written. Verification statuses are supplied evidence, not independently certified by this script.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to create release manifest')
  process.exitCode = 1
}
