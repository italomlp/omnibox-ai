import type { HistoryItem } from '../../db/db'
import type { CareerTaskContract } from '../../services/inference'

export const CAREER_TOOL_ID = 'career' as const
export const CAREER_TOOL_VERSION = 1 as const

export const CAREER_ACTIONS = [
  {
    id: 'ats-audit',
    title: 'ATS Audit',
    description: 'Check for parser blockers and keyword coverage.',
  },
  {
    id: 'semantic-suitability',
    title: 'Semantic Suitability',
    description: 'Review leveling, ownership depth, and role fit.',
  },
  {
    id: 'gap-analysis',
    title: 'Gap Analysis',
    description: 'Map missing requirements to evidence and recommendations.',
    default: true,
  },
] as const

export type CareerActionId = (typeof CAREER_ACTIONS)[number]['id']

export type CareerGapResult = CareerTaskContract

export interface CareerResumeRecord {
  id?: number
  name: string
  content: string
  updatedAt: number
}

export type CareerHistoryRecord = HistoryItem

export interface CareerValidationState {
  resume?: string
  jobDescription?: string
}

export interface CareerReloadPayload {
  resume: string
  jobDesc: string
}

export const CAREER_RELOAD_KEY = 'omnibox-career-reload'

export const CAREER_GAP_STATUS_LABEL: Record<CareerGapResult['requirements'][number]['status'], string> = {
  match: 'Match',
  partial_gap: 'Partial gap',
  omission: 'Omission',
}

export const CAREER_GAP_STATUS_CLASS: Record<CareerGapResult['requirements'][number]['status'], string> = {
  match: 'border-emerald-900/30 bg-emerald-950/20 text-emerald-300',
  partial_gap: 'border-amber-900/30 bg-amber-950/20 text-amber-300',
  omission: 'border-rose-900/30 bg-rose-950/20 text-rose-300',
}

export const CAREER_ATS_PROMPT = `You are a strict Applicant Tracking System (ATS) parsing audit simulator. Scan the provided resume and evaluate it against the target job description.
Perform the following checks:
1. Identify formatting features that might break common parser models (columns, tables, icons, headers, custom Bullet formats).
2. Scan for keyword matching density, highlighting core acronyms and technical nouns missing from the resume.
3. Check section order and header compatibility.

Output your results as a clean markdown document. Begin with a visual "ATS Readiness Table" [Metric | Score (1-10) | Notes], followed by a section on "Identified Parsing Blockers" and a checklist of "Missing Essential Keywords". Keep your feedback extremely brief, constructive, and actionable.`

export const CAREER_SEMANTIC_PROMPT = `You are an expert executive recruiter and technical career evaluator. Review the candidate's resume against the target job description to evaluate "Semantic Suitability".
Assess:
1. Leveling alignment: Does the depth of achievements and scale of ownership (e.g., tech lead, manager, architect) match the expectations of the target role?
2. Depth of impact: Look beyond keyword matches to evaluate if the results achieved (scale, metrics, scope) indicate preparedness for this role.
3. Soft-skills and behavioral hints.

Output a structured executive evaluation. Use markdown format. Include sections: "Leveling Verdict", "Hierarchy/Ownership Gaps", and "Key Recommendations to Reframe Impact".`

export const parseCareerGapResult = (rawText: string): CareerGapResult | null => {
  try {
    const parsed = JSON.parse(rawText) as Partial<CareerGapResult> & { task?: unknown; summary?: unknown; requirements?: unknown }
    if (parsed.task !== 'gap-analysis' || typeof parsed.summary !== 'string' || !Array.isArray(parsed.requirements)) {
      return null
    }

    return parsed as CareerGapResult
  } catch {
    return null
  }
}

export const buildCareerReloadPayload = (resume: string, jobDesc: string): string =>
  JSON.stringify({ resume, jobDesc })

export const parseCareerReloadPayload = (value: string): CareerReloadPayload => {
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      return {
        resume: typeof record.resume === 'string' ? record.resume : '',
        jobDesc: typeof record.jobDesc === 'string' ? record.jobDesc : '',
      }
    }
  } catch {
    // fall through
  }

  return { resume: value, jobDesc: '' }
}
