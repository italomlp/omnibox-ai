import React from 'react'
import { Loader2, Save, Trash, Upload } from 'lucide-react'
import { InlineError } from '../../components/tooling/InlineError'
import { type CareerResumeRecord, type CareerValidationState } from './types'

interface CareerContextPanelProps {
  resumeName: string
  resumeText: string
  jobDescription: string
  savedResumes: CareerResumeRecord[]
  parsingStatus: string
  parsingError: string
  validation: CareerValidationState
  onResumeNameChange: (value: string) => void
  onResumeTextChange: (value: string) => void
  onJobDescriptionChange: (value: string) => void
  onImportResumeFile: (file: File) => void
  onSaveResume: () => void
  onLoadResume: (record: CareerResumeRecord) => void
  onDeleteResume: (record: CareerResumeRecord) => void
}

export const CareerContextPanel: React.FC<CareerContextPanelProps> = ({
  resumeName,
  resumeText,
  jobDescription,
  savedResumes,
  parsingStatus,
  parsingError,
  validation,
  onResumeNameChange,
  onResumeTextChange,
  onJobDescriptionChange,
  onImportResumeFile,
  onSaveResume,
  onLoadResume,
  onDeleteResume,
}) => (
  <div className="flex min-w-0 flex-col space-y-4">
    <div className="surface-nested space-y-3 rounded-xl border border-zinc-800/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          1. Candidate Resume / CV
        </h3>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-md sm:flex-none">
          <div className="flex w-full justify-end">
            <label className="button-secondary control-touch w-full cursor-pointer select-none text-[10px] text-indigo-400 hover:text-indigo-300 sm:w-auto">
              <Upload className="w-3 h-3 flex-shrink-0" />
              Upload CV (PDF/DOCX)
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onImportResumeFile(file)
                  event.target.value = ''
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex w-full items-center gap-2">
            <input
              type="text"
              value={resumeName}
              onChange={(event) => onResumeNameChange(event.target.value)}
              aria-label="Resume document name"
              className="control-standard model-control min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-300"
              placeholder="Document Name"
            />
            <button
              type="button"
              onClick={onSaveResume}
              className="button-icon flex-shrink-0 text-zinc-300 hover:text-zinc-100"
              title="Save CV content to database"
              aria-label="Save CV content to database"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {parsingStatus && (
        <div className="flex items-center gap-1.5 border-b border-zinc-900 py-1 text-[10px] font-semibold text-indigo-400 animate-pulse" role="status" aria-live="polite">
          <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" /> {parsingStatus}
        </div>
      )}

      <InlineError message={parsingError || null} />

      {savedResumes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-y border-zinc-900 py-1.5 min-w-0">
          <span className="text-[10px] text-zinc-500">Stored:</span>
          {savedResumes.map((record) => (
            <div key={record.id ?? record.name} className="flex min-w-0 items-center gap-1 rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-300">
              <button
                type="button"
                onClick={() => onLoadResume(record)}
                className="max-w-28 truncate font-medium hover:text-indigo-400"
                aria-label={`Load saved resume ${record.name}`}
              >
                {record.name}
              </button>
              <button
                type="button"
                onClick={() => onDeleteResume(record)}
                className="button-icon ml-1 h-6 w-6 shrink-0 text-zinc-500 hover:text-red-400"
                aria-label={`Delete saved resume ${record.name}`}
              >
                <Trash className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="career-resume-input" className="text-[10px] text-zinc-500 font-bold uppercase">Resume content</label>
        <textarea
          id="career-resume-input"
          value={resumeText}
          onChange={(event) => onResumeTextChange(event.target.value)}
          aria-invalid={Boolean(validation.resume)}
          aria-describedby={validation.resume ? 'career-resume-error' : undefined}
          placeholder="Paste raw text or markdown CV details here..."
          className="glass-input control-touch h-44 w-full resize-y rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-3 text-xs font-mono text-zinc-200"
        />
        <InlineError id="career-resume-error" message={validation.resume ?? null} />
      </div>
    </div>

    <div className="surface-nested space-y-3 rounded-xl border border-zinc-800/40 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
        2. Target Job Description
      </h3>
      <textarea
        id="career-job-description-input"
        value={jobDescription}
        onChange={(event) => onJobDescriptionChange(event.target.value)}
        aria-invalid={Boolean(validation.jobDescription)}
        aria-describedby={validation.jobDescription ? 'career-job-description-error' : undefined}
        placeholder="Paste the target job description requirements here..."
        className="glass-input control-touch h-44 w-full resize-y rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-3 text-xs text-zinc-200"
      />
      <InlineError id="career-job-description-error" message={validation.jobDescription ?? null} />
    </div>
  </div>
)
