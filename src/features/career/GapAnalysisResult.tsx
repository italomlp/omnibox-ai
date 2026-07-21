import React from 'react'
import { CAREER_GAP_STATUS_CLASS, CAREER_GAP_STATUS_LABEL, type CareerGapResult } from './types'

interface GapAnalysisResultProps {
  result: CareerGapResult
}

export const GapAnalysisResult: React.FC<GapAnalysisResultProps> = ({ result }) => (
  <div className="space-y-4 select-text">
    <section className="rounded-lg border border-zinc-800/60 bg-zinc-950/50 p-4 space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Summary</div>
      <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">{result.summary}</p>
    </section>

    <section className="space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        Requirements ({result.requirements.length})
      </div>

      <div className="space-y-3">
        {result.requirements.map((requirement, index) => (
          <article key={`${requirement.requirement}-${index}`} className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h4 className="text-sm font-semibold text-zinc-100">{requirement.requirement}</h4>
              <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${CAREER_GAP_STATUS_CLASS[requirement.status]}`}>
                {CAREER_GAP_STATUS_LABEL[requirement.status]}
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
)
