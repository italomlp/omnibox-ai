import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const script = new URL('./release-manifest.mjs', import.meta.url)
const webSHA = 'a'.repeat(40)
const mobileSHA = 'b'.repeat(40)

async function fixture(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'omnibox-release-'))
  try {
    await writeFile(join(dir, 'web.zip'), 'web bytes\n')
    await writeFile(join(dir, 'mobile.aab'), 'mobile bytes\n')
    await writeFile(join(dir, 'verification.json'), JSON.stringify({
      checks: [{ name: 'unit-tests', status: 'passed' }, { name: 'device-smoke', status: 'not-run' }],
      liveInference: 'not-live-verified',
    }))
    await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function run(dir, extra = []) {
  return spawnSync(process.execPath, [script.pathname,
    '--web-sha', webSHA, '--mobile-sha', mobileSHA,
    '--verification-report', join(dir, 'verification.json'),
    '--output', join(dir, 'manifest.json'),
    '--artifact', join(dir, 'web.zip'), '--artifact', join(dir, 'mobile.aab'), ...extra,
  ], { encoding: 'utf8' })
}

test('writes exact source revisions, file hashes, sizes and honest test status reproducibly', async () => {
  await fixture(async (dir) => {
    const first = run(dir)
    assert.equal(first.status, 0, first.stderr)
    const bytes = await readFile(join(dir, 'manifest.json'), 'utf8')
    const manifest = JSON.parse(bytes)
    assert.deepEqual(manifest.sources, { web: webSHA, mobile: mobileSHA })
    assert.deepEqual(manifest.artifacts.map((artifact) => artifact.name), ['mobile.aab', 'web.zip'])
    const webArtifact = manifest.artifacts.find((artifact) => artifact.name === 'web.zip')
    assert.equal(webArtifact.size, Buffer.byteLength('web bytes\n'))
    assert.equal(webArtifact.sha256, createHash('sha256').update('web bytes\n').digest('hex'))
    assert.deepEqual(manifest.verification.checks, [
      { name: 'device-smoke', status: 'not-run' }, { name: 'unit-tests', status: 'passed' },
    ])
    assert.equal(manifest.verification.liveInference, 'not-live-verified')
    assert.equal(manifest.verification.report.sha256, createHash('sha256').update(await readFile(join(dir, 'verification.json'))).digest('hex'))
    assert.ok(!bytes.includes(dir), 'must not leak local absolute paths')
    await rm(join(dir, 'manifest.json'))
    assert.equal(run(dir).status, 0)
    assert.equal(await readFile(join(dir, 'manifest.json'), 'utf8'), bytes)
  })
})

test('rejects invalid full source revisions and duplicate arguments', async () => {
  await fixture(async (dir) => {
    const invalid = run(dir, ['--web-sha', 'main'])
    assert.notEqual(invalid.status, 0)
    assert.match(invalid.stderr, /Duplicate|40.*hex/i)
    const result = spawnSync(process.execPath, [script.pathname,
      '--web-sha', 'main', '--mobile-sha', mobileSHA,
      '--verification-report', join(dir, 'verification.json'),
      '--output', join(dir, 'manifest.json'), '--artifact', join(dir, 'web.zip'),
    ], { encoding: 'utf8' })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /40.*hex/i)
  })
})

test('does not invent passing tests or overwrite an existing manifest', async () => {
  await fixture(async (dir) => {
    await writeFile(join(dir, 'verification.json'), JSON.stringify({ checks: [], liveInference: 'not-live-verified' }))
    assert.notEqual(run(dir).status, 0, 'empty evidence must be rejected')
    await writeFile(join(dir, 'verification.json'), JSON.stringify({ checks: [{ name: 'tests', status: 'failed' }], liveInference: 'not-live-verified' }))
    assert.equal(run(dir).status, 0)
    const bytes = await readFile(join(dir, 'manifest.json'), 'utf8')
    assert.equal(JSON.parse(bytes).verification.checks[0].status, 'failed')
    assert.notEqual(run(dir).status, 0, 'existing output must be preserved')
    assert.equal(await readFile(join(dir, 'manifest.json'), 'utf8'), bytes)
  })
})

test('rejects missing artifacts, duplicate basenames and unsupported report fields', async () => {
  await fixture(async (dir) => {
    await rm(join(dir, 'web.zip'))
    assert.notEqual(run(dir).status, 0)
    await writeFile(join(dir, 'web.zip'), 'web bytes\n')
    assert.notEqual(run(dir, ['--artifact', join(dir, 'web.zip')]).status, 0)
    await writeFile(join(dir, 'verification.json'), JSON.stringify({
      checks: [{ name: 'tests', status: 'passed', apiKey: 'do-not-embed' }], liveInference: 'not-live-verified',
    }))
    assert.notEqual(run(dir).status, 0)
  })
})


test('rejects non-string check names instead of silently coercing report evidence', async () => {
  await fixture(async (dir) => {
    await writeFile(join(dir, 'verification.json'), JSON.stringify({
      checks: [{ name: true, status: 'passed' }], liveInference: 'not-live-verified',
    }))
    const result = run(dir)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Each check/)
  })
})
