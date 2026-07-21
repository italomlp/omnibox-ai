import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  Copy,
  Database,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { SplitPane } from '../../components/tooling/SplitPane'
import { ToolHeader } from '../../components/tooling/ToolHeader'
import { ToolPage } from '../../components/tooling/ToolPage'
import { useInference } from '../../hooks/useInference'

type SchemaFormatId = 'sql-ddl' | 'prisma' | 'zod'

type RunState = 'idle' | 'running' | 'cancelled'

interface SchemaFormatOption {
  id: SchemaFormatId
  label: string
  sample: string
  sanityHint: string
}

const FORMAT_OPTIONS: readonly SchemaFormatOption[] = [
  {
    id: 'sql-ddl',
    label: 'SQL DDL',
    sample: 'CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email TEXT NOT NULL UNIQUE\n);',
    sanityHint: 'Look for CREATE TABLE, ALTER TABLE, or explicit constraint keywords.',
  },
  {
    id: 'prisma',
    label: 'Prisma',
    sample: 'model User {\n  id   String @id @default(cuid())\n  email String @unique\n}',
    sanityHint: 'Look for model blocks and Prisma field annotations such as @id, @unique, or @default.',
  },
  {
    id: 'zod',
    label: 'Zod',
    sample: 'const User = z.object({\n  id: z.string(),\n  email: z.string().email(),\n})',
    sanityHint: 'Look for z.object(...) or other zod builders that define object shape.',
  },
] as const

const FORMAT_BY_ID: Record<SchemaFormatId, SchemaFormatOption> = Object.fromEntries(
  FORMAT_OPTIONS.map((option) => [option.id, option]),
) as Record<SchemaFormatId, SchemaFormatOption>

const getFormatLabel = (format: SchemaFormatId) => FORMAT_BY_ID[format].label

const getPlaceholder = (format: SchemaFormatId) => FORMAT_BY_ID[format].sample

const normalizeText = (value: string) => value.trim()

const validateSourceText = (sourceFormat: SchemaFormatId, targetFormat: SchemaFormatId, sourceText: string): string | null => {
  const trimmed = normalizeText(sourceText)

  if (!trimmed) {
    return 'Paste a schema before translating.'
  }

  if (sourceFormat === targetFormat) {
    return 'Choose different source and target formats.'
  }

  if (sourceFormat === 'sql-ddl') {
    if (!/(create\s+table|alter\s+table|create\s+schema|comment\s+on)/i.test(trimmed) || !/[();]/.test(trimmed)) {
      return 'This does not look like SQL DDL. Add a CREATE TABLE or ALTER TABLE statement.'
    }
  }

  if (sourceFormat === 'prisma') {
    if (!/\bmodel\s+\w+\s*\{/i.test(trimmed)) {
      return 'This does not look like Prisma schema text. Add a model block.'
    }
  }

  if (sourceFormat === 'zod') {
    if (!/\bz\.object\s*\(|\bzod\b/i.test(trimmed)) {
      return 'This does not look like a Zod schema. Add a z.object(...) definition.'
    }
  }

  return null
}

const buildConversionAssumptions = (
  sourceFormat: SchemaFormatId,
  targetFormat: SchemaFormatId,
  sourceText: string,
): string[] => {
  const assumptions = [
    `Translate ${getFormatLabel(sourceFormat)} into ${getFormatLabel(targetFormat)} without inventing tables, fields, or constraints that are not present in the source.`,
    'Preserve explicit nullability, defaults, unique constraints, identifiers, and relation hints when the target format can represent them.',
    'When a construct has no direct target equivalent, keep the closest valid representation and explain the gap instead of silently dropping it.',
  ]

  if (/foreign\s+key|references/i.test(sourceText)) {
    assumptions.push('Relation constraints may need manual review because foreign keys and ORM relations do not map 1:1 across every format.')
  }

  if (/\bcheck\b|\benum\b|generated\s+always|identity|serial|autoincrement/i.test(sourceText)) {
    assumptions.push('Advanced constraints and generated values may need manual cleanup in the target schema.')
  }

  if (/\bview\b|trigger|index|partial\s+index|compound\s+unique/i.test(sourceText)) {
    assumptions.push('Views, triggers, and vendor-specific indexes are usually only approximated in Prisma or Zod output.')
  }

  return assumptions
}

const buildConversionWarnings = (
  sourceFormat: SchemaFormatId,
  targetFormat: SchemaFormatId,
  sourceText: string,
): string[] => {
  const warnings = [
    'This is a best-effort structural translation, not a parser or compiler.',
    'Review the generated schema before using it in production or migrations.',
  ]

  if (sourceFormat === 'sql-ddl' && targetFormat === 'zod') {
    warnings.push('SQL-specific features such as foreign keys, checks, cascading actions, and indexes become documentation or manual validation notes in Zod.')
  }

  if (sourceFormat === 'prisma' && targetFormat === 'sql-ddl') {
    warnings.push('Prisma provider semantics, preview features, and relation helpers may be approximated in SQL DDL output.')
  }

  if (sourceFormat === 'zod' && targetFormat === 'prisma') {
    warnings.push('Custom refinements, transforms, and validation-only rules cannot be represented directly in Prisma.')
  }

  if (/default\s*\(|@default\(|uuid|cuid|autoincrement|identity/i.test(sourceText)) {
    warnings.push('Default value semantics should be checked carefully because generators and database defaults can differ by engine.')
  }

  if (/nullable|not\s+null|required|optional/i.test(sourceText)) {
    warnings.push('Nullability and optionality should be reviewed manually after conversion.')
  }

  return warnings
}

const buildPromptBundle = (
  sourceFormat: SchemaFormatId,
  targetFormat: SchemaFormatId,
  sourceText: string,
  assumptions: string[],
  warnings: string[],
) => {
  const sourceLabel = getFormatLabel(sourceFormat)
  const targetLabel = getFormatLabel(targetFormat)

  return {
    systemPrompt: [
      'You translate schemas between SQL DDL, Prisma, and Zod.',
      'Do not claim to fully parse ambiguous inputs.',
      'Preserve explicit structure and constraints when possible.',
      'Never silently drop defaults, nullability, keys, relations, enums, or checks.',
      'If something cannot be represented exactly, keep the closest valid form and call it out.',
      'Return markdown with the headings Translation, Assumptions, Warnings, and Review notes.',
    ].join('\n'),
    userPrompt: [
      `SOURCE_FORMAT: ${sourceLabel}`,
      `TARGET_FORMAT: ${targetLabel}`,
      '',
      'SOURCE_SCHEMA:',
      sourceText.trim(),
      '',
      'CONVERSION_ASSUMPTIONS:',
      ...assumptions.map((item) => `- ${item}`),
      '',
      'CONVERSION_WARNINGS:',
      ...warnings.map((item) => `- ${item}`),
      '',
      'Return only the translated result and the requested review notes. Do not add unrelated commentary.',
    ].join('\n'),
  }
}

export const SchemaTranslatorToolPage: React.FC = () => {
  const inference = useInference()
  const {
    activeProvider,
    setActiveProvider,
    selectedModel,
    setSelectedModel,
    availableProviders,
    isProcessing,
    errorMsg,
    runInference,
    abort,
    clearError,
    webLLM,
  } = inference

  const [sourceFormat, setSourceFormat] = useState<SchemaFormatId>('sql-ddl')
  const [targetFormat, setTargetFormat] = useState<SchemaFormatId>('prisma')
  const [sourceText, setSourceText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [runState, setRunState] = useState<RunState>('idle')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [validationAttempted, setValidationAttempted] = useState(false)

  useEffect(() => {
    if (copyState !== 'copied') return undefined

    const timeout = window.setTimeout(() => setCopyState('idle'), 1800)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  const validationMessage = useMemo(
    () => validateSourceText(sourceFormat, targetFormat, sourceText),
    [sourceFormat, sourceText, targetFormat],
  )

  const assumptions = useMemo(
    () => buildConversionAssumptions(sourceFormat, targetFormat, sourceText),
    [sourceFormat, sourceText, targetFormat],
  )

  const warnings = useMemo(
    () => buildConversionWarnings(sourceFormat, targetFormat, sourceText),
    [sourceFormat, sourceText, targetFormat],
  )

  const promptBundle = useMemo(
    () => buildPromptBundle(sourceFormat, targetFormat, sourceText, assumptions, warnings),
    [assumptions, sourceFormat, sourceText, targetFormat, warnings],
  )

  const sourceFormatLabel = getFormatLabel(sourceFormat)
  const targetFormatLabel = getFormatLabel(targetFormat)
  const sourcePlaceholder = getPlaceholder(sourceFormat)

  const activeWarningCount = warnings.length + assumptions.length

  const handleTranslate = async () => {
    setValidationAttempted(true)

    if (validationMessage) {
      setOutputText('')
      setRunState('idle')
      return
    }

    setOutputText('')
    setRunState('running')

    const actionId = `${sourceFormat}-to-${targetFormat}`

    await runInference({
      toolId: 'schema-translator',
      toolVersion: 1,
      actionId,
      systemPrompt: promptBundle.systemPrompt,
      userPrompt: promptBundle.userPrompt,
      temperature: 0.1,
      maxTokens: 2048,
      onChunk: (chunk) => {
        setOutputText((current) => current + chunk)
      },
      onComplete: (fullText) => {
        setOutputText(fullText)
        setRunState('idle')
      },
    })

    setRunState((current) => (current === 'cancelled' ? 'cancelled' : 'idle'))
  }

  const handleCancel = () => {
    abort()
    setRunState('cancelled')
  }

  const handleCopy = async () => {
    if (!outputText.trim()) return

    await navigator.clipboard.writeText(outputText)
    setCopyState('copied')
  }

  const handleReset = () => {
    setSourceText('')
    setOutputText('')
    setValidationAttempted(false)
    setRunState('idle')
    setCopyState('idle')
    clearError()
  }

  const showValidationError = validationAttempted && validationMessage

  return (
    <ToolPage>
      <ToolHeader
        eyebrow="Developer workbench"
        title="Schema translator"
        description="Translate schema definitions between SQL DDL, Prisma, and Zod with clear caveats about what can and cannot be preserved."
        icon={<Database className="h-5 w-5 text-cyan-400" />}
        actions={(
          <ProviderSelector
            activeProvider={activeProvider}
            onProviderChange={setActiveProvider}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            availableProviders={availableProviders}
          />
        )}
      />

      <WebGPULoadingOverlay
        isLoading={activeProvider === 'webgpu' && webLLM.isLoading}
        selectedModel={selectedModel}
        loadPercent={webLLM.loadPercent}
        speed={webLLM.speed}
        loadProgress={webLLM.loadProgress}
      />

      <ErrorAlert errorMsg={errorMsg} activeProvider={activeProvider} onDismiss={clearError} />

      <SplitPane
        className="items-start"
        leftClassName="space-y-6"
        rightClassName="space-y-6"
        left={(
          <div className="space-y-6">
            <section className="surface-nested rounded-xl border border-zinc-800/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Conversion direction</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">Choose the source and target schema formats before translating.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-900/40 bg-cyan-950/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  {sourceFormatLabel} → {targetFormatLabel}
                </div>
              </div>

              <fieldset className="mt-4 grid gap-4 sm:grid-cols-2">
                <legend className="sr-only">Schema formats</legend>

                <label className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">Source format</span>
                  <select
                    value={sourceFormat}
                    onChange={(event) => setSourceFormat(event.target.value as SchemaFormatId)}
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {FORMAT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-5 text-zinc-500">{FORMAT_BY_ID[sourceFormat].sanityHint}</p>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">Target format</span>
                  <select
                    value={targetFormat}
                    onChange={(event) => setTargetFormat(event.target.value as SchemaFormatId)}
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    {FORMAT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-5 text-zinc-500">{FORMAT_BY_ID[targetFormat].sanityHint}</p>
                </label>
              </fieldset>

              <div className="mt-4 rounded-lg border border-cyan-900/20 bg-cyan-950/10 p-3 text-xs leading-6 text-zinc-300">
                <p className="font-semibold text-cyan-200">Conversion assumptions</p>
                <ul className="mt-2 space-y-1.5 text-zinc-400">
                  {assumptions.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 rounded-lg border border-amber-900/25 bg-amber-950/10 p-3 text-xs leading-6 text-amber-100/90">
                <p className="font-semibold text-amber-200">Review warnings</p>
                <ul className="mt-2 space-y-1.5 text-amber-100/75">
                  {warnings.map((item) => (
                    <li key={item} className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="surface-nested rounded-xl border border-zinc-800/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <label htmlFor="schema-translator-source" className="text-sm font-semibold text-zinc-100">
                    Source input
                  </label>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">Paste the schema text you want translated.</p>
                </div>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {sourceText.trim().length} chars
                </div>
              </div>

              <textarea
                id="schema-translator-source"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder={sourcePlaceholder}
                className="mt-4 min-h-[260px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-[13px] leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                aria-describedby="schema-translator-source-help"
              />
              <p id="schema-translator-source-help" className="mt-2 text-[11px] leading-5 text-zinc-500">
                {FORMAT_BY_ID[sourceFormat].sanityHint}
              </p>

              {showValidationError && (
                <div className="mt-4 rounded-lg border border-rose-900/30 bg-rose-950/15 p-3 text-xs leading-6 text-rose-200" role="alert">
                  <div className="flex items-start gap-2">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{validationMessage}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleTranslate()
                  }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-900/50 bg-cyan-950/40 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-700 hover:bg-cyan-950/60 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isProcessing ? 'Translating…' : 'Translate schema'}
                </button>
              </div>
            </section>
          </div>
        )}
        right={(
          <section className="surface-nested rounded-xl border border-zinc-800/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Translated output</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  The model output is streamed here with review notes and manual caveats.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {runState === 'cancelled' && !isProcessing && (
                  <span className="rounded-full border border-amber-900/40 bg-amber-950/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Cancelled
                  </span>
                )}

                {isProcessing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    void handleCopy()
                  }}
                  disabled={!outputText.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {copyState === 'copied' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copyState === 'copied' ? 'Copied' : 'Copy output'}
                </button>
              </div>
            </div>

            <div
              className="mt-4 min-h-[420px] rounded-xl border border-zinc-800 bg-zinc-950/80 p-4"
              aria-busy={isProcessing}
              aria-live="polite"
            >
              {isProcessing && !outputText.trim() ? (
                <div className="flex min-h-[390px] items-center justify-center text-center">
                  <div className="space-y-3">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
                    <p className="text-sm font-medium text-zinc-100">Translating {sourceFormatLabel} into {targetFormatLabel}.</p>
                    <p className="max-w-sm text-xs leading-5 text-zinc-500">
                      The model is generating a best-effort conversion and review notes for constraints that need manual attention.
                    </p>
                  </div>
                </div>
              ) : outputText.trim() ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-zinc-100">{outputText}</pre>
              ) : runState === 'cancelled' ? (
                <div className="flex min-h-[390px] items-center justify-center text-center">
                  <div className="space-y-3">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-900/40 bg-amber-950/20 text-amber-300">
                      <X className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-100">Translation cancelled.</p>
                    <p className="max-w-sm text-xs leading-5 text-zinc-500">
                      No output was committed. You can adjust the schema and run the translation again.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[390px] items-center justify-center text-center">
                  <div className="space-y-3">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-100">No translation yet.</p>
                      <p className="max-w-sm text-xs leading-5 text-zinc-500">
                        Paste {sourceFormatLabel} schema text, choose a target format, and run a translation to render the output here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/70 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">State</div>
                <div className="mt-1 text-sm text-zinc-200">
                  {isProcessing ? 'Running' : runState === 'cancelled' ? 'Cancelled' : outputText.trim() ? 'Ready' : 'Empty'}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/70 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Model</div>
                <div className="mt-1 truncate text-sm text-zinc-200">{selectedModel || 'Default model'}</div>
              </div>

              <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/70 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Checks</div>
                <div className="mt-1 text-sm text-zinc-200">{activeWarningCount} review notes</div>
              </div>
            </div>

            {showValidationError && (
              <div className="mt-4 rounded-lg border border-rose-900/30 bg-rose-950/15 p-3 text-xs leading-6 text-rose-200" role="alert">
                <div className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{validationMessage}</p>
                </div>
              </div>
            )}
          </section>
        )}
      />
    </ToolPage>
  )
}
