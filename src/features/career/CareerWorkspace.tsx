import React, { useState, useEffect, useMemo } from 'react'
import { Briefcase, Eye, Save, Trash, ArrowRight, Loader2, Sparkles, History, Upload } from 'lucide-react'
import { useInference } from '../../hooks/useInference'
import { extractTextFromPdf, extractTextFromDocx } from '../../utils/pdfParser'
import { db } from '../../db/db'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { useSettingsStore } from '../../store/useSettingsStore'
import { WEBLLM_MODEL_CONFIG_BY_ID } from '../../config/providers'
import { getTaskContextBudget, type CareerTaskContract } from '../../services/inference'

const parseCareerAnalysis = (rawText: string): CareerTaskContract | null => {
  try {
    const parsed = JSON.parse(rawText) as Partial<CareerTaskContract> & { task?: unknown; summary?: unknown; requirements?: unknown }
    if (parsed.task !== 'gap-analysis' || typeof parsed.summary !== 'string' || !Array.isArray(parsed.requirements)) {
      return null
    }

    return parsed as CareerTaskContract
  } catch {
    return null
  }
}

const statusLabel: Record<CareerTaskContract['requirements'][number]['status'], string> = {
  match: 'Match',
  partial_gap: 'Partial gap',
  omission: 'Omission',
}

const statusClass: Record<CareerTaskContract['requirements'][number]['status'], string> = {
  match: 'border-emerald-900/30 bg-emerald-950/20 text-emerald-300',
  partial_gap: 'border-amber-900/30 bg-amber-950/20 text-amber-300',
  omission: 'border-rose-900/30 bg-rose-950/20 text-rose-300',
}

export const CareerWorkspace: React.FC = () => {
  const inference = useInference()
  const privacyMode = useSettingsStore((state) => state.privacyMode)
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

  // Inputs
  const [resumeText, setResumeText] = useState('')
  const [jobDescText, setJobDescText] = useState('')
  const [resumeName, setResumeName] = useState('My Resume')

  // File parsing states
  const [fileParsingStatus, setFileParsingStatus] = useState('')
  const [fileParsingError, setFileParsingError] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileParsingStatus('Initializing parser...')
    setFileParsingError('')
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      let parsedText = ''

      if (extension === 'pdf') {
        parsedText = await extractTextFromPdf(file, setFileParsingStatus, {
          allowExternalLibraries: !privacyMode,
        })
      } else if (extension === 'docx') {
        parsedText = await extractTextFromDocx(file, setFileParsingStatus, {
          allowExternalLibraries: !privacyMode,
        })
      } else if (extension === 'txt' || extension === 'md') {
        setFileParsingStatus('Reading text file...')
        parsedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (event) => resolve(event.target?.result as string || '')
          reader.onerror = (err) => reject(err)
          reader.readAsText(file)
        })
        setFileParsingStatus('Reading complete.')
      } else {
        throw new Error('Unsupported file format. Please upload a PDF, DOCX, TXT, or Markdown file.')
      }

      setResumeText(parsedText)
      const baseName = file.name.replace(/\.[^/.]+$/, "")
      setResumeName(baseName)

      // Save parsed document to IndexedDB
      const existing = await db.documents.where('name').equals(baseName).first()
      if (existing) {
        await db.documents.update(existing.id!, {
          content: parsedText,
          timestamp: Date.now(),
        })
      } else {
        await db.documents.add({
          name: baseName,
          content: parsedText,
          timestamp: Date.now(),
        })
      }
      loadStoredData()
      setTimeout(() => setFileParsingStatus(''), 2000)
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Failed to parse the selected file.'
      setFileParsingError(message)
      setFileParsingStatus('Parsing failed.')
      setTimeout(() => setFileParsingStatus(''), 4000)
    }
  }
  
  // States
  const [output, setOutput] = useState('')
  const [gapAnalysis, setGapAnalysis] = useState<CareerTaskContract | null>(null)
  
  // IndexedDB Document lists
  const [savedResumes, setSavedResumes] = useState<{ id?: number; name: string; content: string }[]>([])
  const [pastAnalyses, setPastAnalyses] = useState<{ id?: number; toolId: string; timestamp: number; output: string }[]>([])

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

    // Check if we need to reload a previous run
    const reload = localStorage.getItem('omnibox-career-reload')
    if (reload) {
      try {
        const parsed: unknown = JSON.parse(reload)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const reloadPayload = parsed as Record<string, unknown>
          if (typeof reloadPayload.resume === 'string') setResumeText(reloadPayload.resume)
          if (typeof reloadPayload.jobDesc === 'string') setJobDescText(reloadPayload.jobDesc)
        } else {
          setResumeText(reload)
        }
      } catch (e) {
        console.error('Failed to parse reloaded career state:', e)
        setResumeText(reload)
      }
      localStorage.removeItem('omnibox-career-reload')
    }
  }, [])

  const selectedWebLLMConfig = activeProvider === 'webgpu' ? WEBLLM_MODEL_CONFIG_BY_ID[selectedModel] : undefined

  const gapAnalysisBudget = useMemo(() => {
    if (!selectedWebLLMConfig) {
      return null
    }

    return getTaskContextBudget(
      'gap-analysis',
      {
        resumeText,
        jobDescription: jobDescText,
      },
      { contextWindowTokens: selectedWebLLMConfig.contextWindow },
    )
  }, [jobDescText, resumeText, selectedWebLLMConfig])


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
      inference.abort() // Trigger local error
      // Note: we can manually set error or handle it
      alert('Please supply both your resume content and the job description to run this evaluation.')
      return
    }

    setGapAnalysis(null)
    setOutput('')
    
    const userPrompt = `## CANDIDATE RESUME:
${resumeText}

## TARGET JOB DESCRIPTION:
${jobDescText}`

    await runInference({
      systemPrompt,
      userPrompt,
      temperature: 0.2, // Low temperature for precise gap analyses
      onChunk: (chunk) => {
        setOutput((prev) => prev + chunk)
      },
      onComplete: async (fullText) => {
        setOutput(fullText)

        // Log locally (fixes stale closure by using fullText directly)
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
    })
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
    if (!resumeText.trim() || !jobDescText.trim()) {
      inference.abort()
      alert('Please supply both your resume content and the job description to run this evaluation.')
      return
    }

    setOutput('')
    setGapAnalysis(null)

    void runInference({
      task: 'gap-analysis',
      input: {
        resumeText,
        jobDescription: jobDescText,
      },
      temperature: 0,
      onComplete: async (fullText) => {
        const parsed = parseCareerAnalysis(fullText)
        if (parsed) {
          setGapAnalysis(parsed)
        } else {
          setOutput('Structured gap analysis output could not be parsed.')
        }

        await db.history.add({
          workspaceId: 'career',
          toolId: 'gap-analysis',
          timestamp: Date.now(),
          input: { resume: resumeText, jobDesc: jobDescText },
          output: fullText,
          provider: activeProvider,
          model: selectedModel,
        })
        loadStoredData()
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Workspace Header Panel */}
      <div className="surface-nested flex flex-col items-stretch justify-between gap-4 rounded-xl border border-zinc-800/40 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-zinc-100">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Career Engineering Suite
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Validate resume ATS parsing compliance, review semantic suitability gaps, and create direct skill-mapping gap matrixes.
          </p>
        </div>

        {/* Local model configurations bar */}
        <div className="w-full min-w-0 md:w-auto md:flex-none">
          <ProviderSelector
            activeProvider={activeProvider}
            onProviderChange={setActiveProvider}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            availableProviders={availableProviders}
          />
        </div>
      </div>

      {/* WebGPU Model Loading Overlay */}
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
        {/* Left Side: Dual input frames */}
        <div className="flex flex-col space-y-4 min-w-0">
          {/* Resume manager panel */}
          <div className="surface-nested space-y-3 rounded-xl border border-zinc-800/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                1. Candidate Resume / CV
              </h3>

              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-1 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end">
                {/* File picker */}
                <label className="button-secondary control-touch w-full cursor-pointer select-none text-[10px] text-indigo-400 hover:text-indigo-300 sm:w-auto">
                  <Upload className="w-3 h-3 flex-shrink-0" />
                  Upload CV (PDF/DOCX)
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  aria-label="Resume document name"
                  className="control-standard model-control min-w-0 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300 sm:w-40 sm:flex-1"
                  placeholder="Document Name"
                />
                <button
                  type="button"
                  onClick={handleSaveResume}
                  className="button-icon self-start text-zinc-300 hover:text-zinc-100 sm:self-auto"
                  title="Save CV content to database"
                  aria-label="Save CV content to database"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Parsing status bar */}
            {fileParsingStatus && (
              <div className="flex items-center gap-1.5 border-b border-zinc-900 py-1 text-[10px] font-semibold text-indigo-400 animate-pulse" role="status" aria-live="polite">
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> {fileParsingStatus}
              </div>
            )}

            {fileParsingError && (
              <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-300" role="alert">
                {fileParsingError}
              </div>
            )}

            {/* Load Saved Resume List */}
            {savedResumes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-y border-zinc-900 py-1.5 min-w-0">
                <span className="text-[10px] text-zinc-500">Stored:</span>
                {savedResumes.map((doc) => (
                  <div key={doc.id} className="flex min-w-0 items-center gap-1 rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-300">
                    <button 
                      type="button"
                      onClick={() => handleLoadResume(doc.content, doc.name)}
                      className="max-w-28 truncate font-medium hover:text-indigo-400"
                      aria-label={`Load saved resume ${doc.name}`}
                    >
                      {doc.name}
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteResume(doc.id!)}
                      className="button-icon ml-1 h-6 w-6 shrink-0 text-zinc-500 hover:text-red-400"
                      aria-label={`Delete saved resume ${doc.name}`}
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
              className="glass-input control-touch h-44 w-full resize-y rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-3 text-xs font-mono text-zinc-200"
            />
          </div>

          {/* Job description input */}
          <div className="surface-nested space-y-3 rounded-xl border border-zinc-800/40 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              2. Target Job Description
            </h3>
            <textarea
              value={jobDescText}
              onChange={(e) => setJobDescText(e.target.value)}
              placeholder="Paste the target job description requirements here..."
              className="glass-input control-touch h-44 w-full resize-y rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-3 text-xs text-zinc-200"
            />
          </div>
        </div>

        {/* Right Side: Output Preview & Controls */}
        <div className="flex min-w-0 flex-col space-y-4">
          {/* Action Trigger Deck */}
          <div className="surface-nested space-y-3.5 rounded-xl border border-zinc-800/40 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">3. Run Career Diagnostics</h3>

            {/* a11y-compliant Tool Definitions Card */}
            <div
              role="region"
              aria-label="Diagnostics tool definitions"
              className="surface-nested space-y-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3.5 text-[11px] text-zinc-400"
            >
              <h4 id="diagnostics-info-title" className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Diagnostic Scope & Capabilities
              </h4>
              <dl className="grid gap-3 sm:grid-cols-3 leading-relaxed">
                <div>
                  <dt className="font-bold text-zinc-200 uppercase tracking-wider text-[9px] mb-0.5">ATS Audit</dt>
                  <dd>Simulates parser rules to detect formatting blockers (tables, columns) and keyword matching density to pass initial HR filters.</dd>
                </div>
                <div>
                  <dt className="font-bold text-zinc-200 uppercase tracking-wider text-[9px] mb-0.5">Semantic Suitability</dt>
                  <dd>Evaluates leadership seniority, leveling, and achievement scope against role expectations (goes beyond direct keyword matching).</dd>
                </div>
                <div>
                  <dt className="font-bold text-zinc-200 uppercase tracking-wider text-[9px] mb-0.5">Gap Analysis Matrix</dt>
                  <dd>Maps every core job requirement to resume evidence side-by-side, identifying exact omissions and recommending specific bullet reframes.</dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={runAtsAudit}
                disabled={isProcessing || !resumeText.trim() || !jobDescText.trim()}
                className="button-secondary control-touch text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
              >
                ATS Audit
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              
              <button
                type="button"
                onClick={runSemanticEvaluation}
                disabled={isProcessing || !resumeText.trim() || !jobDescText.trim()}
                className="button-secondary control-touch text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
              >
                Semantic Suitability
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={runGapAnalysis}
                disabled={isProcessing || !resumeText.trim() || !jobDescText.trim()}
                className="button-secondary control-touch text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
              >
                Gap Analysis Matrix
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {gapAnalysisBudget && (
              <div
                role="status"
                aria-live="polite"
                className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${gapAnalysisBudget.fits ? 'border-emerald-900/30 bg-emerald-950/20 text-emerald-300' : 'border-amber-900/30 bg-amber-950/20 text-amber-300'}`}
              >
                {gapAnalysisBudget.fits ? (
                  <>
                    Selected model fits this gap analysis context budget ({gapAnalysisBudget.estimatedInputTokens}/{gapAnalysisBudget.availableInputTokens} tokens estimated).
                  </>
                ) : (
                  <>
                    Context budget exceeded by about {gapAnalysisBudget.overflowTokens} tokens for this selected model.
                  </>
                )}
              </div>
            )}
          </div>

          {/* Results panel */}
          <div className="surface-nested flex min-h-[300px] flex-1 flex-col space-y-3 rounded-xl border border-zinc-800/40 p-4 min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Analysis Output</h3>
            <div className="surface-nested relative flex-1 overflow-y-auto rounded-lg border border-zinc-800/60 p-4 text-xs text-zinc-300 font-sans leading-relaxed select-text break-words" aria-live="polite" aria-busy={isProcessing}>
              {isProcessing && !output && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/30" role="status" aria-live="polite" aria-label="Generating analysis">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              )}
              {gapAnalysis ? (
                <div className="space-y-4 select-text">
                  <section className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-4 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Summary</div>
                    <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">{gapAnalysis.summary}</p>
                  </section>

                  <section className="space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Requirements ({gapAnalysis.requirements.length})
                    </div>

                    <div className="space-y-3">
                      {gapAnalysis.requirements.map((requirement, index) => (
                        <article key={`${requirement.requirement}-${index}`} className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4 space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <h4 className="text-sm font-semibold text-zinc-100">{requirement.requirement}</h4>
                            <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass[requirement.status]}`}>
                              {statusLabel[requirement.status]}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Source evidence</div>
                            {requirement.resumeEvidence.length > 0 ? (
                              <ul className="space-y-1.5 text-xs text-zinc-300">
                                {requirement.resumeEvidence.map((evidence, evidenceIndex) => (
                                  <li key={`${evidenceIndex}-${evidence}`} className="rounded border border-zinc-800/70 bg-zinc-900/60 px-3 py-2 whitespace-pre-wrap break-words">
                                    {evidence}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs italic text-zinc-500">No direct resume evidence found.</p>
                            )}
                          </div>

                          {requirement.recommendation && (
                            <div className="space-y-1.5">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Conditional recommendation</div>
                              <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">{requirement.recommendation}</p>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                output ? (
                  <div className="markdown-body space-y-3 whitespace-pre-wrap break-words select-text">
                    {output}
                  </div>
                ) : (
                  <span className="text-zinc-600 italic">Select one of the diagnostic tools above to run evaluation streams...</span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History log drawer */}
      {pastAnalyses.length > 0 && (
        <div className="surface-nested space-y-3 rounded-xl border border-zinc-800/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <History className="w-4 h-4 text-zinc-500" /> Past Analysis Logs
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
            {pastAnalyses.map((log) => (
              <div key={log.id} className="surface-nested space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">{log.toolId.replace('-', ' ')}</span>
                  <span className="text-[9px] text-zinc-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="break-words text-[10px] leading-relaxed text-zinc-400 line-clamp-3">
                  {log.toolId === 'gap-analysis' ? parseCareerAnalysis(log.output)?.summary ?? 'Structured gap analysis result' : log.output}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const parsed = log.toolId === 'gap-analysis' ? parseCareerAnalysis(log.output) : null
                    if (parsed) {
                      setOutput('')
                      setGapAnalysis(parsed)
                      return
                    }

                    setGapAnalysis(null)
                    setOutput('Structured gap analysis result could not be parsed.')
                  }}
                  className="button-secondary control-standard text-[9px] text-indigo-400 hover:text-indigo-300"
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
