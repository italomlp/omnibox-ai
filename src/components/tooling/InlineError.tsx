import React from 'react'

interface InlineErrorProps {
  id?: string
  message: string | null | undefined
  className?: string
}

export const InlineError: React.FC<InlineErrorProps> = ({ id, message, className }) => {
  if (!message) return null

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={`rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 py-2 text-xs leading-relaxed text-rose-300 ${className ?? ''}`.trim()}
    >
      {message}
    </p>
  )
}
