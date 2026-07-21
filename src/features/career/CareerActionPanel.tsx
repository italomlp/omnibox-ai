import React from 'react'
import { ArrowRight, Eye, Sparkles } from 'lucide-react'
import type { ContextBudgetResult } from '../../services/inference'
import { CAREER_ACTIONS, type CareerActionId } from './types'

interface CareerActionPanelProps {
  isProcessing: boolean
  hasRequiredInput: boolean
  gapAnalysisBudget: ContextBudgetResult | null
  onRunAction: (actionId: CareerActionId) => void
}

export const CareerActionPanel: React.FC<CareerActionPanelProps> = ({ isProcessing, hasRequiredInput, gapAnalysisBudget, onRunAction }) => (
  <div className="flex min-w-0 flex-col space-y-4">
    <div className="surface-nested space-y-3.5 rounded-xl border border-zinc-800/40 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">3. Run Career Diagnostics</h3>

      <div role="region" aria-label="Diagnostics tool definitions" className="surface-nested space-y-2.5 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3.5 text-[11px] text-zinc-400">
        <h4 id="diagnostics-info-title" className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Diagnostic Scope & Capabilities
        </h4>
        <dl className="grid gap-3 sm:grid-cols-3 leading-relaxed">
          <div>
            <dt className="font-bold text-zinc-200 uppercase tracking-wider text-[9px] mb-0.5">ATS Audit</dt>
            <dd>Simulates parser rules to detect formatting blockers and keyword density.</dd>
          </div>
          <div>
            <dt className="font-bold text-zinc-200 uppercase tracking-wider text-[9px] mb-0.5">Semantic Suitability</dt>
            <dd>Evaluates leadership seniority, leveling, and achievement scope.</dd>
          </div>
          <div>
            <dt className="font-bold text-zinc-200 uppercase tracking-wider text-[9px] mb-0.5">Gap Analysis Matrix</dt>
            <dd>Maps every core job requirement to resume evidence side-by-side.</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {CAREER_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onRunAction(action.id)}
            disabled={isProcessing || !hasRequiredInput}
            className="button-secondary control-touch text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:pointer-events-none"
          >
            {action.title}
            {action.id === 'ats-audit' ? <Sparkles className="w-3.5 h-3.5" /> : action.id === 'semantic-suitability' ? <Eye className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>

      {gapAnalysisBudget && (
        <div role="status" aria-live="polite" className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${gapAnalysisBudget.fits ? 'border-emerald-900/30 bg-emerald-950/20 text-emerald-300' : 'border-amber-900/30 bg-amber-950/20 text-amber-300'}`}>
          {gapAnalysisBudget.fits ? (
            <>Selected model fits this gap analysis context budget ({gapAnalysisBudget.estimatedInputTokens}/{gapAnalysisBudget.availableInputTokens} tokens estimated).</>
          ) : (
            <>Context budget exceeded by about {gapAnalysisBudget.overflowTokens} tokens for this selected model.</>
          )}
        </div>
      )}
    </div>
  </div>
)
