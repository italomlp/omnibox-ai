import React, { useState } from 'react'
import { Sparkles, Copy, Check, RotateCcw, AlertTriangle, ArrowRight, Loader2, Languages, ShieldCheck } from 'lucide-react'
import { useInference } from '../../hooks/useInference'
import { type GrammarTaskContract, type GrammarTaskInput, type ToneTaskContract, type ToneTaskInput } from '../../services/inference'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { harperGrammar, type LocalGrammarDiagnostic } from './harperGrammar'
import {
  applyLocalGrammarSuggestion,
  dispatchGrammarCheck,
  shouldApplyInferenceResult,
  shouldShowGrammarProviderControls,
  type GrammarMode,
} from './grammarWorkspaceHelpers'

type StructuredRewriteContract = GrammarTaskContract | ToneTaskContract

const parseStructuredRewriteResult = (rawText: string): string => {
  try {
    const parsed = JSON.parse(rawText) as Partial<StructuredRewriteContract> & { task?: unknown; text?: unknown }
    if ((parsed.task === 'grammar' || parsed.task === 'tone') && typeof parsed.text === 'string') {
      return parsed.text
    }
  } catch {
    // fall back to raw text below
  }

  return rawText
}

export const GrammarWorkspace: React.FC = () => {
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
    webLLM,
  } = inference

  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [grammarMode, setGrammarMode] = useState<GrammarMode>('local')
  const [resultSource, setResultSource] = useState<'local' | 'ai'>('local')
  const [localDiagnostics, setLocalDiagnostics] = useState<LocalGrammarDiagnostic[]>([])
  const [localGrammarStatus, setLocalGrammarStatus] = useState<'idle' | 'checking' | 'ready' | 'unavailable'>('idle')
  const [localGrammarMessage, setLocalGrammarMessage] = useState<string | null>(null)
  const inputRevision = React.useRef(0)

  React.useEffect(() => {
    const reload = localStorage.getItem('omnibox-grammar-reload')
    if (reload) {
      try {
        const parsed = JSON.parse(reload)
        setInput(typeof parsed === 'string' ? parsed : JSON.stringify(parsed))
      } catch {
        setInput(reload)
      }
      localStorage.removeItem('omnibox-grammar-reload')
    }
  }, [])


  // Tone Shift sliders (0 - 100)
  const [toneSliders, setToneSliders] = useState({
    diplomatic: 50,
    executive: 30,
    critical: 0,
    assertive: 40,
  })

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    handleInputChange('')
    setOutput('')
    setResultSource('local')
    inference.clearError()
  }

  const handleSliderChange = (name: keyof typeof toneSliders, val: number) => {
    setToneSliders((prev) => ({ ...prev, [name]: val }))
  }

  const handleInputChange = (value: string) => {
    inputRevision.current += 1
    setInput(value)
    setLocalDiagnostics([])
    setLocalGrammarStatus('idle')
    setLocalGrammarMessage(null)
  }

  const executeInference = async (
    task: 'grammar' | 'tone',
    input: GrammarTaskInput | ToneTaskInput,
  ) => {
    const executionInputRevision = inputRevision.current
    setOutput('')
    setResultSource('ai')

    await runInference({
      task,
      input,
      toolId: 'grammar-tone',
      temperature: task === 'grammar' ? 0 : 0.1,
      onComplete: async (fullText) => {
        if (!shouldApplyInferenceResult(executionInputRevision, inputRevision.current)) {
          return
        }

        const finalResult = parseStructuredRewriteResult(fullText)
        setOutput(finalResult)
      },
    })
  }

  const handleLocalGrammarCheck = async () => {
    if (!input.trim()) return
    const checkedInputRevision = inputRevision.current
    setOutput('')
    setResultSource('local')
    setLocalDiagnostics([])
    setLocalGrammarMessage(null)
    setLocalGrammarStatus('checking')

    const result = await dispatchGrammarCheck('local', input, harperGrammar.diagnose, async () => undefined)
    if (!result || checkedInputRevision !== inputRevision.current) return
    if (result.status === 'stale') return

    if (result.status === 'unavailable') {
      setLocalGrammarStatus('unavailable')
      setLocalGrammarMessage(result.message)
      return
    }

    setLocalDiagnostics(result.diagnostics)
    setLocalGrammarStatus('ready')
  }

  const handleFixGrammar = () => {
    if (!input.trim()) return

    if (grammarMode === 'local') {
      void handleLocalGrammarCheck()
      return
    }

    void dispatchGrammarCheck('ai', input, harperGrammar.diagnose, () => executeInference('grammar', { text: input }))
  }

  const handleApplySuggestion = async (diagnostic: LocalGrammarDiagnostic, suggestionIndex: number) => {
    const suggestion = diagnostic.suggestions[suggestionIndex]
    if (!suggestion) return

    const appliedInputRevision = inputRevision.current

    try {
      const updatedInput = await applyLocalGrammarSuggestion(suggestion)
      if (appliedInputRevision !== inputRevision.current) return

      handleInputChange(updatedInput)
    } catch (error) {
      if (appliedInputRevision !== inputRevision.current) return

      setLocalDiagnostics([])
      setLocalGrammarStatus('unavailable')
      setLocalGrammarMessage(error instanceof Error ? error.message : 'Unable to apply this suggestion.')
    }
  }

  const handleShiftTone = () => {
    if (!input.trim()) return
    const { diplomatic, executive, critical, assertive } = toneSliders

    void executeInference(
      'tone',
      {
        text: input,
        profile: {
          diplomatic,
          executive,
          critical,
          assertive,
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="surface-nested flex flex-col items-stretch justify-start gap-4 rounded-xl border border-zinc-800/40 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-zinc-100">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Grammar Fixer & Tone Shifter
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Fix spelling/grammar mistakes instantly or shift writing styles using interactive range sliders.
          </p>
        </div>

        <fieldset className="grid w-full min-w-0 gap-2 sm:grid-cols-2" aria-label="Grammar checking mode">
          <label className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${grammarMode === 'local' ? 'border-emerald-700/70 bg-emerald-950/20' : 'border-zinc-800/70 hover:border-zinc-700'}`}>
            <input
              type="radio"
              name="grammar-mode"
              value="local"
              checked={grammarMode === 'local'}
              onChange={() => setGrammarMode('local')}
              className="mt-0.5 accent-emerald-500"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />Local English grammar</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-zinc-400">Private, on-device diagnostics. English only.</span>
            </span>
          </label>
          <label className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${grammarMode === 'ai' ? 'border-indigo-700/70 bg-indigo-950/20' : 'border-zinc-800/70 hover:border-zinc-700'}`}>
            <input
              type="radio"
              name="grammar-mode"
              value="ai"
              checked={grammarMode === 'ai'}
              onChange={() => setGrammarMode('ai')}
              className="mt-0.5 accent-indigo-500"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200"><Languages className="h-3.5 w-3.5 text-indigo-400" />AI Grammar Check</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-zinc-400">Use your selected provider for all languages.</span>
            </span>
          </label>
        </fieldset>

        {shouldShowGrammarProviderControls(grammarMode) && (
          <div className="w-full min-w-0 border-t border-zinc-800/60 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI grammar and tone provider</p>
            <ProviderSelector
              activeProvider={activeProvider}
              onProviderChange={setActiveProvider}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              availableProviders={availableProviders}
            />
          </div>
        )}
        <p className="text-right text-[10px] text-zinc-500">Powered by Harper</p>
      </div>

      {/* WebGPU Model Loading Overlay / Status */}
      <WebGPULoadingOverlay
        isLoading={activeProvider === 'webgpu' && webLLM.isLoading}
        selectedModel={selectedModel}
        loadPercent={webLLM.loadPercent}
        speed={webLLM.speed}
        loadProgress={webLLM.loadProgress}
      />

      {/* Error alert message */}
      <ErrorAlert
        errorMsg={errorMsg}
        activeProvider={activeProvider}
        onDismiss={inference.clearError}
      />

      {/* Workspace core layouts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Side: Input Frame */}
        <div className="surface-nested flex min-w-0 flex-col space-y-3 rounded-xl border border-zinc-800/40 p-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Input Snippet</h3>
            <span className="text-[10px] text-zinc-500">{input.length} characters</span>
          </div>

          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type or paste text content to rewrite..."
            className="glass-input control-touch min-h-[220px] max-h-[400px] w-full resize-y rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-4 text-sm text-zinc-200"
          />

          <div className="flex items-center gap-2 border-t border-zinc-900 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="button-icon text-zinc-400 hover:text-zinc-200"
              title="Clear input"
              aria-label="Clear input"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              onClick={handleFixGrammar}
               disabled={isProcessing || localGrammarStatus === 'checking' || !input.trim()}
              className="button-primary control-touch flex-1 text-xs disabled:opacity-40 disabled:pointer-events-none"
            >
               {grammarMode === 'local' ? 'Check English Grammar' : 'Run AI Grammar Check'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

         {/* Right Side: AI Output Preview or local diagnostic list */}
        <div className="surface-nested flex min-w-0 flex-col space-y-3 rounded-xl border border-zinc-800/40 p-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
             <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{resultSource === 'local' ? 'Local Diagnostics' : 'Refactored Result'}</h3>
            {output && (
              <button
                type="button"
                onClick={handleCopy}
                className="button-secondary control-standard text-[10px] text-zinc-400 hover:text-zinc-200"
                aria-label={copied ? 'Copied output' : 'Copy output'}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

           <div className="surface-nested relative min-h-[220px] flex-1 overflow-y-auto rounded-lg border border-zinc-800/60 p-4 text-sm text-zinc-300 font-sans leading-relaxed select-text break-words" aria-live="polite" aria-busy={isProcessing || localGrammarStatus === 'checking'}>
             {resultSource === 'ai' && isProcessing && !output && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30" role="status" aria-live="polite" aria-label="Generating output">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            )}
             {resultSource === 'local' && localGrammarStatus === 'checking' ? (
               <div className="flex h-full items-center justify-center gap-2 text-zinc-400" role="status" aria-live="polite">
                 <Loader2 className="h-5 w-5 animate-spin text-emerald-400" /> Checking locally…
               </div>
             ) : resultSource === 'local' && localGrammarStatus === 'unavailable' ? (
               <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-300" role="alert">
                 Local grammar diagnostics are unavailable. {localGrammarMessage}
               </div>
              ) : resultSource === 'local' && localDiagnostics.length > 0 ? (
               <ul className="space-y-2" aria-label="Local grammar diagnostics">
                 {localDiagnostics.map((diagnostic) => (
                   <li key={diagnostic.id} className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-3">
                     <p className="text-xs text-zinc-200">{diagnostic.message}</p>
                     {diagnostic.suggestions.length > 0 && (
                       <div className="mt-2 flex flex-wrap gap-2">
                         {diagnostic.suggestions.map((suggestion, suggestionIndex) => (
                           <button key={`${diagnostic.id}:${suggestion.replacement}:${suggestionIndex}`} type="button" onClick={() => void handleApplySuggestion(diagnostic, suggestionIndex)} className="button-secondary control-standard text-[11px] text-emerald-300 hover:text-emerald-200">
                             Apply “{suggestion.replacement}”
                           </button>
                         ))}
                       </div>
                     )}
                   </li>
                 ))}
                </ul>
              ) : resultSource === 'local' && localGrammarStatus === 'ready' ? (
                <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs leading-relaxed text-emerald-300" role="status">
                  No grammar issues found.
                </div>
              ) : resultSource === 'local' ? (
               <span className="text-zinc-600 italic">Run a local English grammar check to see diagnostics here.</span>
             ) : output ? (
               <p className="whitespace-pre-wrap break-words">{output}</p>
            ) : (
              <span className="text-zinc-600 italic">Output results will stream here...</span>
            )}
          </div>
        </div>
      </div>

      {/* Tone Shifter Sliders Panel */}
      <div className="surface-nested space-y-4 rounded-xl border border-zinc-800/40 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tone Shifter Sliders</h3>
          {selectedModel.toLowerCase().includes('1b') && (
            <span className="control-compact inline-flex items-center gap-1 rounded bg-amber-950/20 px-2 text-[10px] font-medium text-amber-500/80 border border-amber-900/30">
              <AlertTriangle className="w-3 h-3" />
              1B Model Active (sliders may be ignored)
            </span>
          )}
        </div>
        
        {selectedModel.toLowerCase().includes('1b') && (
          <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 p-3 text-[11px] leading-relaxed text-amber-400/90 flex items-start gap-2" role="alert">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Low Parameter Cap:</strong> You are currently running a 1B model ({selectedModel}). 
              Because 1B models have very small reasoning profiles, they are generally unable to execute complex style blends or numeric tone parameters. 
              For active tone shifting, we highly recommend switching to <strong>Gemma-2-2B</strong>, <strong>Llama-3B</strong>, or a <strong>Cloud API</strong>.
            </div>
          </div>
        )}
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(toneSliders) as (keyof typeof toneSliders)[]).map((slider) => (
            <div key={slider} className="min-w-0 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="capitalize text-zinc-300 font-medium">{slider}</span>
                <span className="font-mono text-indigo-400">{toneSliders[slider]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={toneSliders[slider]}
                onChange={(e) => handleSliderChange(slider, parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={handleShiftTone}
            disabled={isProcessing || localGrammarStatus === 'checking' || !input.trim()}
            className="button-primary control-touch w-full shadow-md neon-glow-indigo disabled:opacity-40 disabled:pointer-events-none sm:w-auto"
          >
            {isProcessing ? 'Streaming Rewrite...' : 'Shift Tone Style'}
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
