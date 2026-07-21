import React, { useEffect, useMemo, useState } from 'react'
import { Briefcase } from 'lucide-react'
import { ProviderSelector } from '../../components/shared/ProviderSelector'
import { WebGPULoadingOverlay } from '../../components/shared/WebGPULoadingOverlay'
import { ErrorAlert } from '../../components/shared/ErrorAlert'
import { ToolHeader } from '../../components/tooling/ToolHeader'
import { ToolPage } from '../../components/tooling/ToolPage'
import { SplitPane } from '../../components/tooling/SplitPane'
import { useInference } from '../../hooks/useInference'
import { WEBLLM_MODEL_CONFIG_BY_ID } from '../../config/providers'
import { extractTextFromDocx, extractTextFromPdf } from '../../utils/pdfParser'
import { getTaskContextBudget } from '../../services/inference'
import { CareerActionPanel } from './CareerActionPanel'
import { CareerContextPanel } from './CareerContextPanel'
import { CareerPastResults } from './CareerPastResults'
import { CareerResultDisplay } from './CareerResultDisplay'
import { careerRepository } from './careerRepository'
import {
  CAREER_ATS_PROMPT,
  CAREER_RELOAD_KEY,
  CAREER_SEMANTIC_PROMPT,
  CAREER_TOOL_ID,
  CAREER_TOOL_VERSION,
  parseCareerGapResult,
  type CareerActionId,
  type CareerGapResult,
  type CareerHistoryRecord,
  type CareerResumeRecord,
  type CareerValidationState,
} from './types'

const emptyValidationState: CareerValidationState = {}

export const CareerToolPage: React.FC = () => {
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

  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resumeName, setResumeName] = useState('My Resume')
  const [savedResumes, setSavedResumes] = useState<CareerResumeRecord[]>([])
  const [pastResults, setPastResults] = useState<CareerHistoryRecord[]>([])
  const [parsingStatus, setParsingStatus] = useState('')
  const [parsingError, setParsingError] = useState('')
  const [validation, setValidation] = useState<CareerValidationState>(emptyValidationState)
  const [output, setOutput] = useState('')
  const [gapResult, setGapResult] = useState<CareerGapResult | null>(null)

  const selectedWebLLMConfig = activeProvider === 'webgpu' ? WEBLLM_MODEL_CONFIG_BY_ID[selectedModel] : undefined

  const gapAnalysisBudget = useMemo(() => {
    if (!selectedWebLLMConfig) return null

    return getTaskContextBudget(
      'gap-analysis',
      { resumeText, jobDescription },
      { contextWindowTokens: selectedWebLLMConfig.contextWindow },
    )
  }, [jobDescription, resumeText, selectedWebLLMConfig])

  const hasRequiredInput = Boolean(resumeText.trim() && jobDescription.trim())

  const refreshSavedResumes = async () => {
    setSavedResumes(await careerRepository.listSavedResumes())
  }

  const refreshPastResults = async () => {
    setPastResults(await careerRepository.listHistory())
  }

  useEffect(() => {
    void refreshSavedResumes()
    void refreshPastResults()

    const reload = localStorage.getItem(CAREER_RELOAD_KEY)
    if (reload) {
      const payload = careerRepository.parseReloadPayload(reload)
      setResumeText(payload.resume)
      setJobDescription(payload.jobDesc)
      localStorage.removeItem(CAREER_RELOAD_KEY)
    }
  }, [])

  const clearValidation = (field?: keyof CareerValidationState) => {
    setValidation((current) => {
      if (!field) return emptyValidationState
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const requireInputs = (): boolean => {
    const nextValidation: CareerValidationState = {}
    if (!resumeText.trim()) nextValidation.resume = 'Add a resume or paste resume text before running a diagnostic.'
    if (!jobDescription.trim()) nextValidation.jobDescription = 'Add a job description before running a diagnostic.'
    setValidation(nextValidation)
    return Object.keys(nextValidation).length === 0
  }

  const handleResumeTextChange = (value: string) => {
    setResumeText(value)
    if (validation.resume && value.trim()) clearValidation('resume')
  }

  const handleJobDescriptionChange = (value: string) => {
    setJobDescription(value)
    if (validation.jobDescription && value.trim()) clearValidation('jobDescription')
  }

  const importResumeFile = async (file: File) => {
    setParsingStatus('Initializing parser...')
    setParsingError('')

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      let parsedText = ''

      if (extension === 'pdf') {
        parsedText = await extractTextFromPdf(file, setParsingStatus)
      } else if (extension === 'docx') {
        parsedText = await extractTextFromDocx(file, setParsingStatus)
      } else if (extension === 'txt' || extension === 'md') {
        setParsingStatus('Reading text file...')
        parsedText = await file.text()
        setParsingStatus('Reading complete.')
      } else {
        throw new Error('Unsupported file format. Please upload a PDF, DOCX, TXT, or Markdown file.')
      }

      setResumeText(parsedText)
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      setResumeName(baseName)
      await careerRepository.saveResume({ name: baseName, content: parsedText, source: 'file-import' })
      await refreshSavedResumes()
      window.setTimeout(() => setParsingStatus(''), 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse the selected file.'
      setParsingError(message)
      setParsingStatus('Parsing failed.')
      window.setTimeout(() => setParsingStatus(''), 4000)
    }
  }

  const saveResume = async () => {
    if (!resumeText.trim()) {
      setValidation((current) => ({ ...current, resume: 'Add resume content before saving.' }))
      return
    }

    await careerRepository.saveResume({ name: resumeName.trim() || 'My Resume', content: resumeText, source: 'paste' })
    await refreshSavedResumes()
  }

  const loadResume = (record: CareerResumeRecord) => {
    setResumeText(record.content)
    setResumeName(record.name)
  }

  const deleteResume = async (record: CareerResumeRecord) => {
    await careerRepository.deleteResume(record.name)
    await refreshSavedResumes()
  }

  const recordCompletion = async (toolId: CareerActionId, outputText: string) => {
    await careerRepository.recordHistory({
      workspaceId: 'career',
      toolId,
      timestamp: Date.now(),
      input: { resume: resumeText, jobDesc: jobDescription },
      output: outputText,
      provider: activeProvider,
      model: selectedModel,
    })
    await refreshPastResults()
  }

  const runLegacyAction = async (actionId: Exclude<CareerActionId, 'gap-analysis'>) => {
    if (!requireInputs()) return

    clearValidation()
    setGapResult(null)
    setOutput('')

    const actionPrompt = actionId === 'ats-audit' ? CAREER_ATS_PROMPT : CAREER_SEMANTIC_PROMPT

    await runInference({
      systemPrompt: actionPrompt,
      userPrompt: `## CANDIDATE RESUME:\n${resumeText}\n\n## TARGET JOB DESCRIPTION:\n${jobDescription}`,
      temperature: 0.2,
      toolId: CAREER_TOOL_ID,
      toolVersion: CAREER_TOOL_VERSION,
      actionId,
      onChunk: (chunk) => {
        setOutput((current) => current + chunk)
      },
      onComplete: async (fullText) => {
        setOutput(fullText)
        await recordCompletion(actionId, fullText)
      },
    })
  }

  const runGapAnalysis = async () => {
    if (!requireInputs()) return

    clearValidation()
    setOutput('')
    setGapResult(null)

    await runInference({
      task: 'gap-analysis',
      input: {
        resumeText,
        jobDescription,
      },
      temperature: 0,
      toolId: CAREER_TOOL_ID,
      toolVersion: CAREER_TOOL_VERSION,
      actionId: 'gap-analysis',
      onComplete: async (fullText) => {
        const parsed = parseCareerGapResult(fullText)
        if (parsed) {
          setGapResult(parsed)
          setOutput('')
        } else {
          setGapResult(null)
          setOutput('Structured gap analysis output could not be parsed.')
        }

        await recordCompletion('gap-analysis', fullText)
      },
    })
  }

  const reloadResult = (record: CareerHistoryRecord) => {
    const rawInput = typeof record.input === 'string' ? record.input : JSON.stringify(record.input)
    setGapResult(null)

    if (record.toolId === 'gap-analysis') {
      const parsed = parseCareerGapResult(record.output)
      if (parsed) {
        setOutput('')
        setGapResult(parsed)
        return
      }
    }

    setOutput(record.output || rawInput)
  }

  return (
    <ToolPage>
      <ToolHeader
        eyebrow="Career"
        title="Career Suite"
        description="Validate ATS parsing, review semantic fit, and map concrete gaps against a role."
        icon={<Briefcase className="w-5 h-5 text-indigo-400" />}
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
          <CareerContextPanel
            resumeName={resumeName}
            resumeText={resumeText}
            jobDescription={jobDescription}
            savedResumes={savedResumes}
            parsingStatus={parsingStatus}
            parsingError={parsingError}
            validation={validation}
            onResumeNameChange={(value) => {
              setResumeName(value)
            }}
            onResumeTextChange={handleResumeTextChange}
            onJobDescriptionChange={handleJobDescriptionChange}
            onImportResumeFile={importResumeFile}
            onSaveResume={saveResume}
            onLoadResume={loadResume}
            onDeleteResume={deleteResume}
          />
        }
        right={<CareerActionPanel isProcessing={isProcessing} hasRequiredInput={hasRequiredInput} gapAnalysisBudget={gapAnalysisBudget} onRunAction={(actionId) => { void (actionId === 'gap-analysis' ? runGapAnalysis() : runLegacyAction(actionId)) }} />}
      />

      <CareerResultDisplay isProcessing={isProcessing} output={output} gapResult={gapResult} />
      <CareerPastResults records={pastResults} onReload={reloadResult} />
    </ToolPage>
  )
}
