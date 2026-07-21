import React from 'react'

interface ToolHeaderProps {
  title: string
  description: string
  icon: React.ReactNode
  eyebrow?: string
  actions?: React.ReactNode
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({ title, description, icon, eyebrow, actions }) => (
  <div className="surface-nested flex flex-col items-stretch justify-start gap-4 rounded-xl border border-zinc-800/40 p-4">
    <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p>}
        <h2 className="mt-1 flex min-w-0 items-center gap-2 text-lg font-bold text-zinc-100">
          {icon}
          {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-400">{description}</p>
      </div>
      {actions && <div className="w-full max-w-2xl min-w-0">{actions}</div>}
    </div>
  </div>
)
