import React, { useId, useState } from 'react'
import { Check, Code2, Copy, FileJson2, Loader2, WandSparkles } from 'lucide-react'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { InlineError } from '../../components/tooling/InlineError'
import { SplitPane } from '../../components/tooling/SplitPane'
import { ToolHeader } from '../../components/tooling/ToolHeader'
import { ToolPage } from '../../components/tooling/ToolPage'
import { useInference } from '../../hooks/useInference'

type SourceMode = 'javascript' | 'json-example' | 'typescript-existing'
type OutputTarget = 'typescript-types' | 'typescript-interfaces' | 'jsdoc'

interface ValidationState {
  label?: string
  source?: string
}

const SOURCE_MODE_LABELS: Record<SourceMode, string> = {
  javascript: 'JavaScript',
  'json-example': 'JSON example',
  'typescript-existing': 'Existing TypeScript',
}

const TARGET_LABELS: Record<OutputTarget, string> = {
  'typescript-types': 'TypeScript types',
  'typescript-interfaces': 'TypeScript interfaces',
  jsdoc: 'JSDoc',
}

const SOURCE_MODE_HELPERS: Record<SourceMode, string> = {
  javascript: 'Infer TypeScript declarations from plain JavaScript source and preserve runtime intent.',
  'json-example': 'Treat the input as sample data and infer shapes from the example structure only.',
  'typescript-existing': 'Use the current TypeScript as the source of truth and refine the generated draft.',
}

const TARGET_HELPERS: Record<OutputTarget, string> = {
  'typescript-types': 'Prefer type aliases and utility types.',
  'typescript-interfaces': 'Prefer interfaces where they fit the source shape.',
  jsdoc: 'Emit concise JSDoc comments only.',
}

const SOURCE_PROMPT_ENVELOPES: Record<SourceMode, string> = {
  javascript: 'JAVASCRIPT_SOURCE',
  'json-example': 'JSON_EXAMPLE',
  'typescript-existing': 'TYPESCRIPT_SOURCE',
}

const TARGET_ACTION_IDS: Record<OutputTarget, string> = {
  'typescript-types': 'typescript-types',
  'typescript-interfaces': 'typescript-interfaces',
  jsdoc: 'jsdoc',
}

const buildTypeJsdocPrompt = (params: {
  sourceMode: SourceMode
  sourceText: string
  sourceLabel: string
  target: OutputTarget
}): { systemPrompt: string; userPrompt: string; temperature: number; maxTokens: number; stopSequences: string[] } => {
  const { sourceMode, sourceText, sourceLabel, target } = params

  const targetInstruction =
    target === 'jsdoc'
      ? 'Return only the JSDoc comments or annotation blocks needed for the source.'
      : target === 'typescript-interfaces'
        ? 'Return only TypeScript interface declarations and supporting types.'
        : 'Return only TypeScript type aliases and supporting types.'

  const systemPrompt = [
    'Return only code.',
    'Do not use markdown fences or commentary.',
    'Preserve the supplied source text exactly and infer from it without inventing extra behavior.',
    'If information is missing, keep assumptions concise and encode them as brief code comments only.',
    'Do not claim deterministic type safety or parser-level certainty.',
    targetInstruction,
    sourceMode === 'json-example'
      ? 'Treat the input as example JSON data and infer stable shapes, nullable fields, and arrays conservatively.'
      : sourceMode === 'typescript-existing'
        ? 'Treat the input as existing TypeScript and preserve its current declarations unless a narrower draft is clearly justified.'
        : 'Treat the input as JavaScript and infer public shapes, return values, and prop-like objects conservatively.',
  ].join('\n')

  const userPrompt = [
    `SOURCE_LABEL: ${sourceLabel}`,
    `SOURCE_MODE: ${SOURCE_MODE_LABELS[sourceMode]}`,
    `TARGET: ${TARGET_LABELS[target]}`,
    '',
    `BEGIN_${SOURCE_PROMPT_ENVELOPES[sourceMode]}`,
    sourceText,
    `END_${SOURCE_PROMPT_ENVELOPES[sourceMode]}`,
  ].join('\n')

  return {
    systemPrompt,
    userPrompt,
    temperature: 0.1,
    maxTokens: 1800,
    stopSequences: ['```'] as string[],
  }
}

const isValidJsonExample = (value: string): boolean => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export const TypeJsdocToolPage: React.FC = () => {
  const inference = useInference()
  const sourceLabelId = useId()
  const sourceModeId = useId()
  const targetId = useId()
  const sourceContentId = useId()
  const outputHintId = useId()

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
    webLLM,
  } = inference

  const [sourceMode, setSourceMode] = useState<SourceMode>('javascript')
  const [target, setTarget] = useState<OutputTarget>('typescript-types')
  const [sourceLabel, setSourceLabel] = useState('Source')
  const [sourceText, setSourceText] = useState('')
  const [output, setOutput] = useState('')
  const [validation, setValidation] = useState<ValidationState>({})
  const [copied, setCopied] = useState(false)

  const sourceHelper = SOURCE_MODE_HELPERS[sourceMode]
  const targetHelper = TARGET_HELPERS[target]

  const outputEmpty = !output.trim()
  const sourceLabelValidation = validation.label ?? null
  const sourceContentValidation = validation.source ?? null

  const copyOutput = async () => {
    if (!output.trim()) return

    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      return
    }
  }

  const handleRun = async () => {
    const nextValidation: ValidationState = {}

    if (!sourceLabel.trim()) {
      nextValidation.label = 'Provide a label for the source field.'
    } else if (!sourceText.trim()) {
      nextValidation.source = 'Paste or type source content before generating output.'
    } else if (sourceMode === 'json-example' && !isValidJsonExample(sourceText)) {
      nextValidation.source = 'The JSON example must be valid JSON.'
    }

    setValidation(nextValidation)
    if (Object.keys(nextValidation).length > 0) {
      return
    }

    setOutput('')
    setCopied(false)

    const prompt = buildTypeJsdocPrompt({
      sourceMode,
      sourceText,
      sourceLabel: sourceLabel.trim(),
      target,
    })

    await runInference({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      stopSequences: prompt.stopSequences,
      toolId: 'type-jsdoc',
      toolVersion: 1,
      actionId: TARGET_ACTION_IDS[target],
      onChunk: (chunk) => {
        setOutput((current) => current + chunk)
      },
      onComplete: (fullText) => {
        setOutput(fullText)
      },
    })
  }

  const handleSourceTextChange = (value: string) => {
    setSourceText(value)
    setCopied(false)
    if (validation.source) {
      setValidation({})
    }
  }

  const handleSourceLabelChange = (value: string) => {
    setSourceLabel(value)
    setCopied(false)
    if (validation.label) {
      setValidation({})
    }
  }

  return (
    <ToolPage>
      <ToolHeader
        eyebrow="Developer Workbench"
        title="Type & JSDoc Generator"
        description="Draft TypeScript types, interfaces, or JSDoc from JavaScript, JSON examples, or existing TypeScript. Review every result before use."
        icon={<Code2 className="h-5 w-5 text-indigo-400" />}
        actions={
          <ProviderSelector
            activeProvider={activeProvider}
            onProviderChange={setActiveProvider}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            availableProviders={availableProviders}
          />
        }
      />

      <WebGPULoadingOverlay
        isLoading={activeProvider === 'webgpu' && webLLM.isLoading}
        selectedModel={selectedModel}
        loadPercent={webLLM.loadPercent}
        speed={webLLM.speed}
        loadProgress={webLLM.loadProgress}
      />

      <ErrorAlert errorMsg={errorMsg} activeProvider={activeProvider} onDismiss={inference.clearError} />

      <SplitPane
        left={
          <section className="surface-nested flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-800/40 p-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Source</h3>
              <p className="text-xs leading-relaxed text-zinc-400">{sourceHelper}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <label htmlFor={sourceModeId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Source mode
                </label>
                <select
                  id={sourceModeId}
                  value={sourceMode}
                  onChange={(event) => setSourceMode(event.target.value as SourceMode)}
                  className="control-standard model-control w-full min-w-0 border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(SOURCE_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0 space-y-1.5">
                <label htmlFor={targetId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Output target
                </label>
                <select
                  id={targetId}
                  value={target}
                  onChange={(event) => setTarget(event.target.value as OutputTarget)}
                  className="control-standard model-control w-full min-w-0 border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(TARGET_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/40 p-3 text-[11px] leading-relaxed text-zinc-400">
              Draft output only. This tool does not parse or prove types; it asks the model for a concise code-only inference.
            </div>

            <div className="space-y-1.5">
              <label htmlFor={sourceLabelId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Source label
              </label>
              <input
                value={sourceLabel}
                onChange={(event) => handleSourceLabelChange(event.target.value)}
                placeholder="Source"
                className="glass-input control-standard w-full border border-zinc-800/60 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
                id={sourceLabelId}
                aria-describedby={sourceLabelValidation ? `${sourceLabelId}-error` : undefined}
              />
              <InlineError id={`${sourceLabelId}-error`} message={sourceLabelValidation} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={sourceContentId} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Source content
              </label>
              <textarea
                id={sourceContentId}
                value={sourceText}
                onChange={(event) => handleSourceTextChange(event.target.value)}
                placeholder={
                  sourceMode === 'json-example'
                    ? '{\n  "id": 1,\n  "name": "Example"\n}'
                    : sourceMode === 'typescript-existing'
                      ? 'export interface Example { ... }'
                      : 'function example(input) { ... }'
                }
                rows={14}
                className="glass-input control-touch min-h-[16rem] w-full resize-y rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-4 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600"
                aria-describedby={sourceContentValidation ? `${sourceContentId}-error` : undefined}
                aria-invalid={Boolean(sourceContentValidation)}
              />
              <InlineError id={`${sourceContentId}-error`} message={sourceContentValidation} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
              <span className="rounded-full border border-zinc-800/70 bg-zinc-900/50 px-2 py-1">{SOURCE_MODE_LABELS[sourceMode]}</span>
              <span className="rounded-full border border-zinc-800/70 bg-zinc-900/50 px-2 py-1">{TARGET_LABELS[target]}</span>
              <span className="rounded-full border border-zinc-800/70 bg-zinc-900/50 px-2 py-1">Review before copy</span>
            </div>
          </section>
        }
        right={
          <section className="surface-nested flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-800/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Generated output</h3>
                <p className="text-xs leading-relaxed text-zinc-400">{targetHelper}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyOutput}
                  disabled={outputEmpty}
                  className="button-secondary control-standard text-xs disabled:pointer-events-none disabled:opacity-40"
                  aria-describedby={`${outputHintId}-hint`}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy output'}
                </button>
                {isProcessing ? (
                  <button
                    type="button"
                    onClick={abort}
                    className="button-danger control-standard text-xs"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      void handleRun()
                    }}
                    className="button-primary control-standard text-xs"
                  >
                    <WandSparkles className="h-4 w-4" />
                    Generate
                  </button>
                )}
              </div>
            </div>

            <p id={`${outputHintId}-hint`} className="text-[11px] leading-relaxed text-zinc-500">
              The prompt preserves the exact source text and requests code only with concise assumptions.
            </p>

            <div
              className="surface-nested relative min-h-[20rem] flex-1 overflow-auto rounded-lg border border-zinc-800/60 p-4 text-sm leading-relaxed text-zinc-200"
              aria-live="polite"
              aria-busy={isProcessing}
            >
              {isProcessing && outputEmpty ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-950/30" role="status" aria-label="Generating output">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    <span className="text-xs">Generating draft…</span>
                  </div>
                </div>
              ) : null}

              {output.trim() ? (
                <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-zinc-200">{output}</pre>
              ) : (
                <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 text-center text-zinc-500">
                  <FileJson2 className="h-5 w-5 text-zinc-600" />
                  <p className="text-sm">Generated code will appear here.</p>
                  <p className="max-w-sm text-xs leading-relaxed">
                    Choose a source mode, paste the source, and generate a draft for review.
                  </p>
                </div>
              )}
            </div>
          </section>
        }
      />
    </ToolPage>
  )
}
