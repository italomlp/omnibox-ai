import React, { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Copy, Loader2, RotateCcw, Sparkles, WandSparkles, XCircle } from 'lucide-react'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ToolHeader } from '../../components/tooling/ToolHeader'
import { SplitPane } from '../../components/tooling/SplitPane'
import { ToolPage } from '../../components/tooling/ToolPage'
import { useInference } from '../../hooks/useInference'

type RegexMode = 'explain' | 'generate'

interface RegexExample {
  index: number
  text: string
  captures: string[]
}

interface RegexAnalysis {
  ok: boolean
  error?: string
  matchCount: number
  examples: RegexExample[]
  scanNote: string
}

const MODE_OPTIONS: Array<{
  id: RegexMode
  label: string
  description: string
}> = [
  {
    id: 'explain',
    label: 'Explain Regex',
    description: 'Compile a JavaScript RegExp locally, test it against sample text, and explain what it does.',
  },
  {
    id: 'generate',
    label: 'Generate Regex',
    description: 'Describe the regex you want in plain language and have the model draft a JavaScript RegExp.',
  },
]

const EXAMPLE_LIMIT = 5

const formatError = (error: unknown): string => {
  if (error instanceof Error) return error.message
  return 'Invalid regular expression.'
}

const formatMatchExample = (match: RegExpExecArray): RegexExample => ({
  index: match.index ?? 0,
  text: match[0],
  captures: match.slice(1).filter((capture): capture is string => typeof capture === 'string' && capture.length > 0),
})

const analyzeRegex = (pattern: string, flags: string, testText: string): RegexAnalysis => {
  if (!pattern.trim()) {
    return {
      ok: false,
      error: 'Enter a regex pattern before running Explain Regex.',
      matchCount: 0,
      examples: [],
      scanNote: 'No pattern provided.',
    }
  }

  let regex: RegExp

  try {
    regex = new RegExp(pattern, flags)
  } catch (error) {
    return {
      ok: false,
      error: formatError(error),
      matchCount: 0,
      examples: [],
      scanNote: 'Pattern could not be compiled by the browser RegExp engine.',
    }
  }

  if (!testText) {
    return {
      ok: true,
      matchCount: 0,
      examples: [],
      scanNote: 'No test text provided. Add sample text to count matches and extract examples.',
    }
  }

  const scanFlags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`
  const scanRegex = new RegExp(regex.source, scanFlags)
  const examples: RegexExample[] = []
  let matchCount = 0

  for (let iteration = 0; iteration <= testText.length + 1; iteration += 1) {
    const match = scanRegex.exec(testText)
    if (!match) {
      break
    }

    matchCount += 1
    if (examples.length < EXAMPLE_LIMIT) {
      examples.push(formatMatchExample(match))
    }

    if (match[0] === '') {
      const nextIndex = (match.index ?? 0) + 1
      scanRegex.lastIndex = nextIndex
    }
  }

  return {
    ok: true,
    matchCount,
    examples,
    scanNote: 'Match counting uses a browser RegExp scan clone so examples stay safe, finite, and copyable.',
  }
}

const buildExplainPrompt = (pattern: string, flags: string, testText: string, analysis: RegexAnalysis): string => {
  const lines = [
    'Explain this JavaScript regular expression for a developer.',
    'Use native ECMAScript RegExp semantics in a browser.',
    `Pattern: /${pattern}/${flags}`,
    'Assume the regex must work in JavaScript, not PCRE or a server-only engine.',
    'Cover what it matches, how the flags change behavior, and any notable assumptions.',
    'If sample text is present, ground the explanation in those observed matches.',
    'Call out edge cases such as empty matches, greedy vs lazy behavior, boundaries, capturing groups, lookarounds, and flag interactions when relevant.',
    'Return plain text that is easy to copy.',
  ]

  if (testText) {
    lines.push('', 'Test text:', testText)
  }

  lines.push(
    '',
    'Local JavaScript scan summary:',
    `- Compile status: ${analysis.ok ? 'ok' : 'failed'}`,
    `- Match count: ${analysis.matchCount}`,
    `- Example matches: ${analysis.examples.length || 'none'}`,
    `- Note: ${analysis.scanNote}`,
  )

  if (analysis.examples.length > 0) {
    lines.push(
      '- Examples:',
      ...analysis.examples.map((example, index) => {
        const captureSummary = example.captures.length > 0 ? ` | captures: ${JSON.stringify(example.captures)}` : ''
        return `  ${index + 1}. @${example.index} ${JSON.stringify(example.text)}${captureSummary}`
      }),
    )
  }

  lines.push(
    '',
    'Structure the response with these sections:',
    '1. Plain-language explanation',
    '2. Flags and assumptions',
    '3. Examples from the provided text',
    '4. Edge cases / gotchas',
  )

  return lines.join('\n')
}

const buildGeneratePrompt = (requirements: string, testText: string): string => {
  const lines = [
    'Generate a JavaScript regular expression for the requirements below.',
    'Use native ECMAScript RegExp syntax and keep the answer grounded in browser behavior.',
    'Choose sensible flags and explain any assumptions you make.',
    'If the request is ambiguous, state the assumption before the regex.',
    'Return plain text that is easy to copy.',
    '',
    'Requirements:',
    requirements,
  ]

  if (testText) {
    lines.push('', 'Optional test text to validate against:', testText)
  }

  lines.push(
    '',
    'Structure the response with these sections:',
    '1. Regex literal / pattern + flags',
    '2. Why it works',
    '3. Assumptions',
    '4. Edge cases / gotchas',
    '5. Example matches or test cases',
  )

  return lines.join('\n')
}

const copyText = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text)
}

export const RegexInterpreterToolPage: React.FC = () => {
  const inference = useInference()
  const {
    activeProvider,
    setActiveProvider,
    selectedModel,
    setSelectedModel,
    availableProviders,
    isProcessing,
    errorMsg,
    clearError,
    runInference,
    abort,
    webLLM,
  } = inference

  const [mode, setMode] = useState<RegexMode>('explain')
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('')
  const [testText, setTestText] = useState('')
  const [requirements, setRequirements] = useState('')
  const [output, setOutput] = useState('')
  const [outputState, setOutputState] = useState<'idle' | 'running' | 'done' | 'error' | 'cancelled'>('idle')
  const [outputMessage, setOutputMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const cancelledRef = useRef(false)

  const localAnalysis = useMemo(() => analyzeRegex(pattern, flags, testText), [pattern, flags, testText])
  const hasExplainValidationError = mode === 'explain' && !localAnalysis.ok
  const hasGenerateRequirements = mode === 'generate' && !requirements.trim()

  const currentPromptSummary = useMemo(() => {
    if (mode === 'explain') {
      return `JavaScript RegExp: /${pattern}/${flags}`
    }

    return 'Plain-language regex requirements'
  }, [flags, mode, pattern])

  const handleReset = () => {
    cancelledRef.current = true
    abort()
    setPattern('')
    setFlags('')
    setTestText('')
    setRequirements('')
    setOutput('')
    setOutputState('idle')
    setOutputMessage('')
    clearError()
  }

  const handleRun = async () => {
    clearError()
    setCopied(false)
    cancelledRef.current = false

    if (mode === 'explain') {
      if (!localAnalysis.ok) {
        setOutput('')
        setOutputState('error')
        setOutputMessage(localAnalysis.error ?? 'Regex compile failed.')
        return
      }

      setOutput('')
      setOutputState('running')
      setOutputMessage('')

      const prompt = buildExplainPrompt(pattern, flags, testText, localAnalysis)

      await runInference({
        toolId: 'regex-interpreter',
        toolVersion: 1,
        actionId: mode,
        systemPrompt: 'You are a precise JavaScript regex interpreter. Explain ECMAScript RegExp behavior for a developer using plain language.',
        userPrompt: prompt,
        temperature: 0.2,
        onChunk: (chunk) => {
          setOutput((current) => current + chunk)
        },
        onComplete: (fullText) => {
          if (cancelledRef.current) {
            return
          }

          setOutput(fullText)
          setOutputState('done')
          setOutputMessage('')
        },
      })

      if (cancelledRef.current) {
        return
      }

      if (inference.errorMsg) {
        setOutputState('error')
        setOutputMessage(inference.errorMsg)
      }

      return
    }

    if (!requirements.trim()) {
      setOutput('')
      setOutputState('error')
      setOutputMessage('Describe the regex requirements before generating a pattern.')
      return
    }

    setOutput('')
    setOutputState('running')
    setOutputMessage('')

    const prompt = buildGeneratePrompt(requirements, testText)

    await runInference({
      toolId: 'regex-interpreter',
      toolVersion: 1,
      actionId: mode,
      systemPrompt: 'You are a senior JavaScript regex engineer. Generate ECMAScript RegExp patterns that are practical, precise, and grounded in browser behavior.',
      userPrompt: prompt,
      temperature: 0.3,
      onChunk: (chunk) => {
        setOutput((current) => current + chunk)
      },
      onComplete: (fullText) => {
        if (cancelledRef.current) {
          return
        }

        setOutput(fullText)
        setOutputState('done')
        setOutputMessage('')
      },
    })

    if (cancelledRef.current) {
      return
    }

    if (inference.errorMsg) {
      setOutputState('error')
      setOutputMessage(inference.errorMsg)
    }
  }

  const handleCancel = () => {
    cancelledRef.current = true
    abort()
    setOutputState('cancelled')
    setOutputMessage('Run canceled before completion.')
  }

  const handleCopy = async () => {
    if (!output) return
    await copyText(output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const outputLabel =
    outputState === 'running'
      ? 'Running'
      : outputState === 'done'
      ? 'Ready'
      : outputState === 'error'
      ? 'Error'
      : outputState === 'cancelled'
      ? 'Canceled'
      : 'Empty'

  return (
    <ToolPage>
      <ToolHeader
        eyebrow="Regex"
        title="Regex Interpreter"
        description="Explain JavaScript regular expressions locally or generate a new one from plain-language requirements."
        icon={<Sparkles className="h-5 w-5 text-indigo-400" />}
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

      <ErrorAlert errorMsg={errorMsg} activeProvider={activeProvider} onDismiss={clearError} />

      <SplitPane
        left={
          <div className="surface-nested min-w-0 space-y-4 rounded-xl border border-zinc-800/40 p-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Mode</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODE_OPTIONS.map((option) => {
                  const active = option.id === mode
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (isProcessing) {
                          cancelledRef.current = true
                          abort()
                          setOutputState('idle')
                          setOutput('')
                          setOutputMessage('')
                        }

                        setMode(option.id)
                        setOutputState('idle')
                        setOutputMessage('')
                        clearError()
                      }}
                      aria-pressed={active}
                      className={`rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                        active
                          ? 'border-indigo-500/40 bg-indigo-500/10 text-zinc-100'
                          : 'border-zinc-800/60 bg-zinc-950/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {option.id === 'explain' ? <WandSparkles className="h-4 w-4 text-indigo-400" /> : <Sparkles className="h-4 w-4 text-indigo-400" />}
                        {option.label}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{option.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-800/60 bg-zinc-950/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {mode === 'explain' ? 'Explain Regex Input' : 'Generate Regex Input'}
                </h3>
                <span className="text-[10px] text-zinc-500">{currentPromptSummary}</span>
              </div>

              {mode === 'explain' ? (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Pattern</span>
                    <input
                      value={pattern}
                      onChange={(event) => setPattern(event.target.value)}
                      placeholder="^([A-Z]{2,})-(\d+)$"
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
                        hasExplainValidationError ? 'border-rose-500/40' : 'border-zinc-800/70'
                      }`}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Flags</span>
                    <input
                      value={flags}
                      onChange={(event) => setFlags(event.target.value)}
                      placeholder="gim"
                      className="w-full rounded-lg border border-zinc-800/70 bg-zinc-950 px-3 py-2.5 font-mono text-xs text-zinc-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Test text</span>
                    <textarea
                      value={testText}
                      onChange={(event) => setTestText(event.target.value)}
                      placeholder="Optional sample text to scan locally..."
                      rows={8}
                      className="w-full rounded-lg border border-zinc-800/70 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </label>

                  <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-2 font-medium text-zinc-300">
                      {localAnalysis.ok ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
                      Local JavaScript RegExp check
                    </div>
                    {!pattern.trim() ? (
                      <p className="mt-2 leading-relaxed text-zinc-500">Enter a pattern to compile it with the browser RegExp engine.</p>
                    ) : !localAnalysis.ok ? (
                      <p className="mt-2 leading-relaxed text-rose-300">{localAnalysis.error}</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <p className="leading-relaxed">
                          Compiled successfully. Match count: <span className="font-semibold text-zinc-200">{localAnalysis.matchCount}</span>
                        </p>
                        <p className="leading-relaxed text-zinc-500">{localAnalysis.scanNote}</p>
                        {localAnalysis.examples.length > 0 ? (
                          <ol className="space-y-1.5 font-mono text-[11px] text-zinc-300">
                            {localAnalysis.examples.map((example, index) => (
                              <li key={`${example.index}-${index}`} className="rounded-md border border-zinc-800/70 bg-zinc-950/80 px-2.5 py-2">
                                <div>
                                  #{index + 1} @ {example.index}: {JSON.stringify(example.text)}
                                </div>
                                {example.captures.length > 0 ? (
                                  <div className="mt-1 text-zinc-500">captures: {JSON.stringify(example.captures)}</div>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                        ) : testText ? (
                          <p className="leading-relaxed text-zinc-500">No matches found in the supplied test text.</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Plain-language requirements</span>
                    <textarea
                      value={requirements}
                      onChange={(event) => setRequirements(event.target.value)}
                      placeholder="Describe the matching behavior you want..."
                      rows={8}
                      className={`w-full rounded-lg border bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${
                        hasGenerateRequirements ? 'border-rose-500/40' : 'border-zinc-800/70'
                      }`}
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Optional test text</span>
                    <textarea
                      value={testText}
                      onChange={(event) => setTestText(event.target.value)}
                      placeholder="Optional sample text to validate the generated pattern against..."
                      rows={6}
                      className="w-full rounded-lg border border-zinc-800/70 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </label>
                </>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isProcessing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {mode === 'explain' ? 'Explain Regex' : 'Generate Regex'}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!isProcessing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800/70 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800/70 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        }
        right={
          <div className="surface-nested min-w-0 space-y-4 rounded-xl border border-zinc-800/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Output</h3>
                <p className="mt-1 text-xs text-zinc-500">State: {outputLabel}</p>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!output}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800/70 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4" aria-live="polite" aria-busy={isProcessing}>
              {outputState === 'running' ? (
                <div className="flex min-h-[18rem] items-center justify-center gap-3 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  <span>Processing {mode === 'explain' ? 'regex explanation' : 'regex generation'}…</span>
                </div>
              ) : outputState === 'error' ? (
                <div className="flex min-h-[18rem] items-start gap-3 text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p className="font-semibold">{mode === 'explain' ? 'Explain Regex failed.' : 'Generate Regex failed.'}</p>
                    <p>{outputMessage}</p>
                  </div>
                </div>
              ) : outputState === 'cancelled' ? (
                <div className="flex min-h-[18rem] items-start gap-3 text-zinc-400">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                  <div className="space-y-2 text-sm leading-relaxed">
                    <p className="font-semibold text-zinc-200">Canceled</p>
                    <p>{outputMessage || 'The current run was canceled.'}</p>
                    {output ? <pre className="whitespace-pre-wrap break-words rounded-lg border border-zinc-800/60 bg-zinc-950/70 p-3 text-xs text-zinc-300">{output}</pre> : null}
                  </div>
                </div>
              ) : output ? (
                <textarea
                  readOnly
                  value={output}
                  className="min-h-[18rem] w-full resize-none rounded-lg border border-transparent bg-transparent font-mono text-sm leading-relaxed text-zinc-200 outline-none select-text"
                />
              ) : (
                <div className="flex min-h-[18rem] items-center justify-center text-zinc-500">
                  <div className="max-w-sm space-y-2 text-center text-sm leading-relaxed">
                    <p className="font-medium text-zinc-300">No output yet.</p>
                    <p>
                      {mode === 'explain'
                        ? 'Enter a pattern and flags, then run Explain Regex to get a plain-language breakdown.'
                        : 'Describe the behavior you want, then run Generate Regex to draft a JavaScript pattern.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />
    </ToolPage>
  )
}
