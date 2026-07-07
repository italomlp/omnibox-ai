import React, { useState, useEffect } from 'react'
import { useSettingsStore, PROVIDER_MODELS_LIST } from '../store/store'
import type { ProviderId } from '../store/store'
import { StreamingClient } from '../services/StreamingClient'
import { useWebLLM } from '../hooks/useWebLLM'
import { db } from '../db/db'
import { Briefcase, Eye, Save, Trash, AlertTriangle, ArrowRight, Loader2, Sparkles, History } from 'lucide-react'

export const CareerWorkspace: React.FC = () => {
  const settings = useSettingsStore()
  const webLLM = useWebLLM()

  // Inputs
  const [resumeText, setResumeText] = useState('')
  const [jobDescText, setJobDescText] = useState('')
  const [resumeName, setResumeName] = useState('My Resume')
  
  // States
  const [output, setOutput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Model Configuration
  const [activeProvider, setActiveProvider] = useState<ProviderId>('openai')
  const [selectedModel, setSelectedModel] = useState('')

  // IndexedDB Document lists
  const [savedResumes, setSavedResumes] = useState<{ id?: number; name: string; content: string }[]>([])
  const [pastAnalyses, setPastAnalyses] = useState<{ id?: number; toolId: string; timestamp: number; output: string }[]>([])

  // Load provider selections
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
      setSelectedModel(settings.selectedModels.webgpu || 'gemma-2b-it')
    } else {
      setSelectedModel(settings.selectedModels[activeProvider] || '')
    }
  }, [activeProvider, settings.selectedModels])

  useEffect(() => {
    if (settings.privacyMode && activeProvider !== 'webgpu' && activeProvider !== 'ollama') {
      setActiveProvider('webgpu')
    }
  }, [settings.privacyMode, activeProvider])

  // Fetch saved documents and past analysis outputs from Dexie
  const loadStoredData = async () => {
    try {
      const docs = await db.documents.toArray()
      setSavedResumes(docs)
      const hist = await db.history
        .where('workspaceId')
        .equals('career')
        .reverse()
        .limit(10)
        .toArray()
      setPastAnalyses(hist)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadStoredData()
  }, [])

  const handleSaveResume = async () => {
    if (!resumeText.trim()) return
    try {
      // Look for existing document with same name
      const existing = await db.documents.where('name').equals(resumeName).first()
      if (existing) {
        await db.documents.update(existing.id!, {
          content: resumeText,
          timestamp: Date.now(),
        })
      } else {
        await db.documents.add({
          name: resumeName,
          content: resumeText,
          timestamp: Date.now(),
        })
      }
      loadStoredData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleLoadResume = (content: string, name: string) => {
    setResumeText(content)
    setResumeName(name)
  }

  const handleDeleteResume = async (id: number) => {
    try {
      await db.documents.delete(id)
      loadStoredData()
    } catch (e) {
      console.error(e)
    }
  }

  const runAnalysis = async (systemPrompt: string, toolId: string) => {
    if (!resumeText.trim() || !jobDescText.trim()) {
      setErrorMsg('Please supply both your resume content and the job description to run this evaluation.')
      return
    }

    setIsProcessing(true)
    setOutput('')
    setErrorMsg(null)

    const providerConfig = {
      apiKey: settings.apiKeys[activeProvider],
      baseUrl: settings.baseUrls[activeProvider],
      selectedModel: selectedModel,
    }

    const userPrompt = `## CANDIDATE RESUME:
${resumeText}

## TARGET JOB DESCRIPTION:
${jobDescText}`

    try {
      if (activeProvider === 'webgpu') {
        if (!webLLM.isSupported) {
          throw new Error('WebGPU is not supported on this browser.')
        }

        const engine = await webLLM.loadModel(selectedModel)
        if (!engine) {
          throw new Error('Failed to load WebGPU model.')
        }

        await webLLM.generate(
          selectedModel,
          userPrompt,
          systemPrompt,
          (chunk) => setOutput((prev) => prev + chunk)
        )

        // Log locally
        await db.history.add({
          workspaceId: 'career',
          toolId,
          timestamp: Date.now(),
          input: { resume: resumeText, jobDesc: jobDescText },
          output: output, // Note: output state is updated asynchronously, so we construct it
          provider: 'webgpu',
          model: selectedModel,
        })
        loadStoredData()
      } else {
        await StreamingClient.stream(
          activeProvider,
          providerConfig,
          {
            prompt: userPrompt,
            systemPrompt,
            temperature: 0.2, // Low temperature for precise gap analyses
          },
          {
            onChunk: (chunk) => setOutput((prev) => prev + chunk),
            onComplete: async (fullText) => {
              await db.history.add({
                workspaceId: 'career',
                toolId,
                timestamp: Date.now(),
                input: { resume: resumeText, jobDesc: jobDescText },
                output: fullText,
                provider: activeProvider,
                model: selectedModel,
              })
              loadStoredData()
            },
            onError: (err) => {
              console.error(err)
              setErrorMsg(err.message || 'Analysis stream failed.')
            },
          }
        )
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'An error occurred during career evaluation.')
    } finally {
      setIsProcessing(false)
    }
  }

  const runAtsAudit = () => {
    const prompt = `You are a strict Applicant Tracking System (ATS) parsing audit simulator. Scan the provided resume and evaluate it against the target job description. 
Perform the following checks:
1. Identify formatting features that might break common parser models (columns, tables, icons, headers, custom Bullet formats).
2. Scan for keyword matching density, highlighting core acronyms and technical nouns missing from the resume.
3. Check section order and header compatibility.

Output your results as a clean markdown document. Begin with a visual "ATS Readiness Table" [Metric | Score (1-10) | Notes], followed by a section on "Identified Parsing Blockers" and a checklist of "Missing Essential Keywords". Keep your feedback extremely brief, constructive, and actionable.`
    runAnalysis(prompt, 'ats-audit')
  }

  const runSemanticEvaluation = () => {
    const prompt = `You are an expert executive recruiter and technical career evaluator. Review the candidate's resume against the target job description to evaluate "Semantic Suitability".
Assess:
1. Leveling alignment: Does the depth of achievements and scale of ownership (e.g., tech lead, manager, architect) match the expectations of the target role?
2. Depth of impact: Look beyond keyword matches to evaluate if the results achieved (scale, metrics, scope) indicate preparedness for this role.
3. Soft-skills and behavioral hints.

Output a structured executive evaluation. Use markdown format. Include sections: "Leveling Verdict", "Hierarchy/Ownership Gaps", and "Key Recommendations to Reframe Impact".`
    runAnalysis(prompt, 'semantic-suitability')
  }

  const runGapAnalysis = () => {
    const prompt = `You are a career gap-analysis assistant. Compare the candidate's resume and the job description side-by-side. 
Generate a markdown table mapping every major requirement mentioned in the Job Description to the evidence inside the candidate's resume.
The table must use columns:
| Required Skill / Responsibility | Evidence in Resume | Status (Match / Partial Gap / Omission) | Recommendation / Bullet to Add |

Ensure you list at least 6 core requirements from the job description. If a requirement has no evidence in the resume, explicitly mark the status as "Omission" and provide a placeholder bullet demonstrating how the candidate could showcase this skill if they have it.`
    runAnalysis(prompt, 'gap-analysis')
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800/40 glass-panel">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Career Engineering Suite
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Validate resume ATS parsing compliance, review semantic suitability gaps, and create direct skill-mapping gap matrixes.
          </p>
        </div>

        {/* Local model configurations bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col space-y-1">
            <label className="text-[10px] text-zinc-500 font-semibold uppercase">Provider</label>
            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value as ProviderId)}
              className="text-xs bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-zinc-300 focus:outline-none focus:border-indigo-500 animate-none"
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

      {/* WebGPU Model Loading Overlay */}
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
        </div>
      )}

      {/* Error alert message */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Evaluation Interrupted</p>
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
        {/* Left Side: Dual input frames */}
        <div className="space-y-4 flex flex-col">
          {/* Resume manager panel */}
          <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                1. Candidate Resume / CV
              </h3>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  className="text-xs bg-zinc-950 border border-zinc-800 rounded py-1 px-2 text-zinc-300 w-32 focus:outline-none focus:border-indigo-500"
                  placeholder="Document Name"
                />
                <button
                  onClick={handleSaveResume}
                  className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-colors"
                  title="Save CV content to database"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Load Saved Resume List */}
            {savedResumes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 py-1.5 border-y border-zinc-900">
                <span className="text-[10px] text-zinc-500">Stored:</span>
                {savedResumes.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300">
                    <button 
                      onClick={() => handleLoadResume(doc.content, doc.name)}
                      className="hover:text-indigo-400 font-medium"
                    >
                      {doc.name}
                    </button>
                    <button 
                      onClick={() => handleDeleteResume(doc.id!)}
                      className="hover:text-red-400 ml-1 text-zinc-500"
                    >
                      <Trash className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste raw text or markdown CV details here..."
              className="w-full h-44 text-xs p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-y font-mono"
            />
          </div>

          {/* Job description input */}
          <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              2. Target Job Description
            </h3>
            <textarea
              value={jobDescText}
              onChange={(e) => setJobDescText(e.target.value)}
              placeholder="Paste the target job description requirements here..."
              className="w-full h-44 text-xs p-3 rounded-lg bg-zinc-950/60 border border-zinc-850 text-zinc-200 focus:outline-none focus:border-indigo-500/50 resize-y"
            />
          </div>
        </div>

        {/* Right Side: Output Preview & Controls */}
        <div className="flex flex-col space-y-4">
          {/* Action Trigger Deck */}
          <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">3. Run Career Diagnostics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={runAtsAudit}
                disabled={isProcessing || !resumeText.trim() || !jobDescText.trim()}
                className="py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 hover:text-indigo-300 text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                ATS Audit
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              
              <button
                onClick={runSemanticEvaluation}
                disabled={isProcessing || !resumeText.trim() || !jobDescText.trim()}
                className="py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 hover:text-indigo-300 text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                Semantic Suitability
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={runGapAnalysis}
                disabled={isProcessing || !resumeText.trim() || !jobDescText.trim()}
                className="py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 hover:text-indigo-300 text-indigo-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                Gap Analysis Matrix
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Results panel */}
          <div className="flex-1 p-4 rounded-xl border border-zinc-800/40 glass-panel flex flex-col space-y-3 min-h-[300px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Analysis Output</h3>
            <div className="flex-1 p-4 rounded-lg bg-zinc-950/40 border border-zinc-850/50 text-zinc-300 text-xs overflow-y-auto select-text relative font-sans leading-relaxed">
              {isProcessing && !output && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              )}
              {output ? (
                // Output is structured markdown, we render formatting using basic layout structures or a custom split display
                <div className="markdown-body space-y-3 whitespace-pre-wrap select-text">
                  {output}
                </div>
              ) : (
                <span className="text-zinc-600 italic">Select one of the diagnostic tools above to run evaluation streams...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History log drawer */}
      {pastAnalyses.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <History className="w-4 h-4 text-zinc-500" /> Past Analysis Logs
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pastAnalyses.map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 text-left space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">{log.toolId.replace('-', ' ')}</span>
                  <span className="text-[9px] text-zinc-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed">
                  {log.output}
                </p>
                <button
                  onClick={() => setOutput(log.output)}
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Reload result
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
