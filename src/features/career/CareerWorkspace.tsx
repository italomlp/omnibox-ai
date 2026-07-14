import React, { useState, useEffect } from 'react'
import { Briefcase, Eye, Save, Trash, ArrowRight, Loader2, Sparkles, History, Upload } from 'lucide-react'
import { useInference } from '../../hooks/useInference'
import { extractTextFromPdf, extractTextFromDocx } from '../../utils/pdfParser'
import { db } from '../../db/db'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { useSettingsStore } from '../../store/useSettingsStore'

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
    const prompt = `You are a career gap-analysis assistant. Compare the candidate's resume and the job description side-by-side. 
Generate a markdown table mapping every major requirement mentioned in the Job Description to the evidence inside the candidate's resume.
The table must use columns:
...
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
        <ProviderSelector
          activeProvider={activeProvider}
          onProviderChange={setActiveProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          availableProviders={availableProviders}
        />
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
        <div className="space-y-4 flex flex-col">
          {/* Resume manager panel */}
          <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                1. Candidate Resume / CV
              </h3>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* File picker */}
                <label className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
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
                  className="text-xs bg-zinc-950 border border-zinc-800 rounded py-1 px-2 text-zinc-300 w-28 focus:outline-none focus:border-indigo-500"
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

            {/* Parsing status bar */}
            {fileParsingStatus && (
              <div className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1.5 py-1 border-b border-zinc-900 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> {fileParsingStatus}
              </div>
            )}

            {fileParsingError && (
              <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2 leading-relaxed">
                {fileParsingError}
              </div>
            )}

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
          <div className="p-4 rounded-xl border border-zinc-800/40 glass-panel space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">3. Run Career Diagnostics</h3>

            {/* a11y-compliant Tool Definitions Card */}
            <div
              role="region"
              aria-label="Diagnostics tool definitions"
              className="p-3.5 rounded-lg bg-zinc-950/40 border border-zinc-850/50 text-[11px] text-zinc-400 space-y-2.5"
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
