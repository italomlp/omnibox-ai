import React, { useState, useEffect } from 'react'
import { useSettingsStore, PROVIDER_MODELS_LIST } from '../store/store'
import type { ProviderId } from '../store/store'
import { StreamingClient } from '../services/StreamingClient'
import { useWebLLM } from '../hooks/useWebLLM'
import { db } from '../db/db'
import { Sparkles, Copy, Check, RotateCcw, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'

export function extractTaggedText(fullText: string, tagName: string, isComplete = false): string {
  const openTag = `<${tagName}>`
  const closeTag = `</${tagName}>`
  
  // 1. Strict XML tag extraction match
  const match = new RegExp(`${openTag}([\\s\\S]*?)${closeTag}`, 'i').exec(fullText)
  if (match) {
    return match[1].trim()
  }
  
  // 2. If open tag exists, extract from there
  const openTagIndex = fullText.toLowerCase().indexOf(openTag)
  if (openTagIndex !== -1) {
    let content = fullText.slice(openTagIndex + openTag.length)
    const closeTagIndex = content.toLowerCase().indexOf(closeTag)
    if (closeTagIndex !== -1) {
      return content.slice(0, closeTagIndex).trim()
    }
    if (isComplete) {
      return content.trim()
    }
    const lastLessThan = content.lastIndexOf('<')
    if (lastLessThan !== -1 && lastLessThan > content.length - closeTag.length - 2) {
      const possibleCloseTag = content.slice(lastLessThan)
      if (closeTag.startsWith(possibleCloseTag.toLowerCase())) {
        return content.slice(0, lastLessThan).trim()
      }
    }
    return content.trim()
  }
  
  // 3. Resilient Fallback: Strip headers, structural tags, and preambles
  let cleaned = fullText
  
  // Clean opening elements (matches [Corrected/Rewritten/Shifted/Shiffted Text]: with flexible spacing/spelling)
  cleaned = cleaned.replace(/^[\s\S]*?<(?:corrected|shifted|shiffted)_text>/i, '')
  cleaned = cleaned.replace(/^[\s\S]*?\[(?:corrected|rewritten|shifted|shiffted)\s+text\]:\s*/i, '')
  
  // Clean closing elements (matches </corrected/shifted/shiffted_text> tags)
  cleaned = cleaned.replace(/<\/(?:corrected|shifted|shiffted)_text>[\s\S]*$/i, '')
  
  // Strip trailing partial tags during stream
  if (!isComplete) {
    const lastLessThan = cleaned.lastIndexOf('<')
    if (lastLessThan !== -1 && lastLessThan > cleaned.length - closeTag.length - 2) {
      const possibleCloseTag = cleaned.slice(lastLessThan)
      if (closeTag.startsWith(possibleCloseTag.toLowerCase())) {
        cleaned = cleaned.slice(0, lastLessThan)
      }
    }
  }
  
  // Delay initial output slightly if no headers/tags are found yet (prevents showing early raw preamble)
  if (!isComplete && fullText.length < 80 && !fullText.includes('[Corrected Text]:') && !fullText.includes('<corrected_text>')) {
    return ''
  }
  
  return cleaned.trim()
}

export const GrammarWorkspace: React.FC = () => {
  const settings = useSettingsStore()
  const webLLM = useWebLLM()

  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Model routing settings for this specific workspace session
  const [activeProvider, setActiveProvider] = useState<ProviderId>('webgpu')
  const [selectedModel, setSelectedModel] = useState('')

  // Tone Shift sliders (0 - 100)
  const [toneSliders, setToneSliders] = useState({
    diplomatic: 50,
    executive: 30,
    critical: 0,
    assertive: 40,
  })

  // Filter available providers based on Privacy Mode
  const availableProviders = Object.keys(settings.apiKeys).filter((prov) => {
    if (settings.privacyMode) {
      return prov === 'webgpu' || prov === 'ollama'
    }
    return prov !== 'webgpu'
  }) as ProviderId[]
  
  const providersToUse = settings.privacyMode
    ? ['webgpu', 'ollama'] as ProviderId[]
    : ['webgpu', ...availableProviders]

  useEffect(() => {
    if (activeProvider === 'webgpu') {
      setSelectedModel(settings.selectedModels.webgpu || 'gemma-2-2b-it-q4f16_1-MLC')
    } else {
      setSelectedModel(settings.selectedModels[activeProvider] || '')
    }
  }, [activeProvider, settings.selectedModels])

  useEffect(() => {
    if (settings.privacyMode && activeProvider !== 'webgpu' && activeProvider !== 'ollama') {
      setActiveProvider('webgpu')
    }
  }, [settings.privacyMode, activeProvider])

  const handleCopy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setInput('')
    setOutput('')
    setErrorMsg(null)
  }

  const handleSliderChange = (name: keyof typeof toneSliders, val: number) => {
    setToneSliders((prev) => ({ ...prev, [name]: val }))
  }

  const executeInference = async (systemPrompt: string, userPrompt: string, toolId: string, tagName: string) => {
    setIsProcessing(true)
    setOutput('')
    setErrorMsg(null)

    const providerConfig = {
      apiKey: settings.apiKeys[activeProvider],
      baseUrl: settings.baseUrls[activeProvider],
      selectedModel: selectedModel,
    }

    let rawText = ''

    try {
      if (activeProvider === 'webgpu') {
        if (!webLLM.isSupported) {
          throw new Error('WebGPU is not supported on this browser/device.')
        }

        const engine = await webLLM.loadModel(selectedModel)
        if (!engine) {
          throw new Error('Failed to load WebLLM model in browser context.')
        }

        await webLLM.generate(
          selectedModel,
          userPrompt,
          systemPrompt,
          (chunk) => {
            rawText += chunk
            setOutput(extractTaggedText(rawText, tagName, false))
          }
        )

        const finalResult = extractTaggedText(rawText, tagName, true)
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
      } else {
        await StreamingClient.stream(
          activeProvider,
          providerConfig,
          {
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.3,
          },
          {
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
            onError: (err) => {
              console.error(err)
              setErrorMsg(err.message || 'Stream processing failed.')
            },
          }
        )
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred during inference.')
    } finally {
      setIsProcessing(false)
    }
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase">Provider</label>
            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value as ProviderId)}
              className="text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500"
            >
              {providersToUse.map((prov) => (
                <option key={prov} value={prov}>
                  {prov === 'webgpu' ? 'Tier 1: WebGPU (Local)' : prov === 'ollama' ? 'Tier 2: Ollama (Local)' : `Tier 3: ${prov}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500"
            >
              {PROVIDER_MODELS_LIST[activeProvider]?.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* WebGPU Model Loading Overlay / Status */}
      {activeProvider === 'webgpu' && webLLM.isLoading && (
        <div className="p-4 rounded-xl border border-indigo-900/30 bg-indigo-950/10 text-zinc-300 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Loading WebGPU Model assets ({selectedModel})...
            </span>
            <span className="font-mono text-zinc-400">{webLLM.speed}</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${webLLM.loadPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 font-mono leading-none">{webLLM.loadProgress}</p>
        </div>
      )}

      {/* Error alert message */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Execution Failed</p>
            <p className="leading-relaxed">{errorMsg}</p>
            {activeProvider === 'webgpu' && errorMsg.includes('maxStorageBuffersPerShaderStage') && (
              <div className="mt-2 p-2.5 rounded bg-zinc-950/40 border border-red-900/20 text-zinc-300 space-y-1.5">
                <p className="font-semibold text-yellow-500">⚠️ Hardware WebGPU Limits Exceeded</p>
                <p className="leading-normal text-[11px]">
                  Your browser or graphics card limits WebGPU shader stages to <strong>8</strong> storage buffers, while this model requires <strong>10</strong>.
                </p>
                <p className="leading-normal text-[11px]">
                  <strong>Recommended Action:</strong> Switch the provider to <strong>Tier 2: Ollama (Local)</strong> or <strong>Tier 3: Cloud BYOK</strong> (OpenRouter / OpenAI / Gemini).
                </p>
              </div>
            )}
            {activeProvider === 'ollama' && (
              <p className="mt-1.5 text-zinc-400">
                Ensure you launched Ollama with: <code>OLLAMA_ORIGINS="*" ollama serve</code>
              </p>
            )}
          </div>
        </div>
      )}

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
