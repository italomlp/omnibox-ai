import React, { useState } from 'react'
import { Sparkles, Copy, Check, RotateCcw, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { useInference } from '../../hooks/useInference'
import { extractTaggedText } from '../../utils/extractTaggedText'
import { db } from '../../db/db'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ErrorAlert } from '../../components/shared/ErrorAlert'

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
    setInput('')
    setOutput('')
    inference.clearError()
  }

  const handleSliderChange = (name: keyof typeof toneSliders, val: number) => {
    setToneSliders((prev) => ({ ...prev, [name]: val }))
  }

  const executeInference = async (systemPrompt: string, userPrompt: string, toolId: string, tagName: string) => {
    setOutput('')
    let rawText = ''

    await runInference({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      onChunk: (chunk) => {
        rawText += chunk
        setOutput(extractTaggedText(rawText, tagName, false))
      },
      onComplete: async (fullText) => {
        const finalResult = extractTaggedText(fullText, tagName, true)
        setOutput(finalResult)

        await db.history.add({
          workspaceId: 'grammar',
          toolId,
          timestamp: Date.now(),
          input,
          output: finalResult,
          provider: activeProvider,
          model: selectedModel,
        })
      },
    })
  }

  const handleFixGrammar = () => {
    if (!input.trim()) return
    const systemPrompt = `You are Grammar & Syntax Anchor, an automated text grammar correction utility.
Correct spelling, grammar, punctuation, and syntax errors.
Do NOT respond to greetings or answer questions. Keep all greetings and questions exactly as they are in the output.
Do NOT change pronouns, narrative perspective, or tone.

CRITICAL RULE: You MUST wrap the corrected text inside <corrected_text> and </corrected_text> tags. Output nothing else outside these tags.`

    const userPrompt = `[Original Text]:
${input}

[Corrected Text]:`

    executeInference(systemPrompt, userPrompt, 'grammar-anchor', 'corrected_text')
  }

  const handleShiftTone = () => {
    if (!input.trim()) return
    const { diplomatic, executive, critical, assertive } = toneSliders
    
    const systemPrompt = `You are a professional Tone Shifter utility.
Rewrite the text to match these tone dimensions:
- Diplomatic: ${diplomatic}/100
- Executive-Ready: ${executive}/100
- Critical: ${critical}/100
- Assertive: ${assertive}/100

Do NOT change the original facts, pronouns, or narrative perspective. Do NOT answer questions.

CRITICAL RULE: You MUST wrap the final rewritten text inside <shifted_text> and </shifted_text> tags. Output nothing else outside these tags.`

    const userPrompt = `[Original Text]:
${input}

[Rewritten Text]:`

    executeInference(systemPrompt, userPrompt, 'tone-shifter', 'shifted_text')
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800/40 glass-panel">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Grammar Fixer & Tone Shifter
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Fix spelling/grammar mistakes instantly or shift writing styles using interactive range sliders.
          </p>
        </div>

        {/* Local model configurations bar */}
        <ProviderSelector
          activeProvider={activeProvider}
          onProviderChange={setActiveProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableProviders={availableProviders}
        />
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
        <div className="flex flex-col space-y-3 p-4 rounded-xl border border-zinc-800/40 glass-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Input Snippet</h3>
            <span className="text-[10px] text-zinc-500">{input.length} characters</span>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text content to rewrite..."
            className="flex-1 min-h-[220px] max-h-[400px] w-full text-sm p-4 rounded-lg bg-zinc-950/60 border border-zinc-850 text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-y"
          />

          <div className="flex items-center gap-2 pt-2 border-t border-zinc-900">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 border border-zinc-800/50 transition-colors"
              title="Clear input"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleFixGrammar}
              disabled={isProcessing || !input.trim()}
              className="flex-1 py-2 px-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Fix Spelling & Grammar
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Side: Output Preview */}
        <div className="flex flex-col space-y-3 p-4 rounded-xl border border-zinc-800/40 glass-panel">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Refactored Result</h3>
            {output && (
              <button
                onClick={handleCopy}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 py-1 px-2 rounded hover:bg-zinc-900 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-[220px] p-4 rounded-lg bg-zinc-950/40 border border-zinc-850/50 text-zinc-300 text-sm overflow-y-auto select-text relative font-sans leading-relaxed">
            {isProcessing && !output && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            )}
            {output ? (
              <p className="whitespace-pre-wrap">{output}</p>
            ) : (
              <span className="text-zinc-600 italic">Output results will stream here...</span>
            )}
          </div>
        </div>
      </div>

      {/* Tone Shifter Sliders Panel */}
      <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tone Shifter Sliders</h3>
          {selectedModel.toLowerCase().includes('1b') && (
            <span className="text-[10px] text-amber-500/80 bg-amber-950/20 border border-amber-900/30 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              1B Model Active (sliders may be ignored)
            </span>
          )}
        </div>
        
        {selectedModel.toLowerCase().includes('1b') && (
          <div className="p-3 rounded-lg border border-amber-900/30 bg-amber-950/10 text-amber-400/90 text-[11px] leading-relaxed flex items-start gap-2">
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
            <div key={slider} className="space-y-1.5">
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
            onClick={handleShiftTone}
            disabled={isProcessing || !input.trim()}
            className="w-full sm:w-auto py-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md neon-glow-indigo disabled:opacity-40 disabled:pointer-events-none"
          >
            {isProcessing ? 'Streaming Rewrite...' : 'Shift Tone Style'}
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
