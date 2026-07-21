import React from 'react'

interface ToolPageProps {
  children: React.ReactNode
  className?: string
}

export const ToolPage: React.FC<ToolPageProps> = ({ children, className }) => (
  <div className={`space-y-6 ${className ?? ''}`.trim()}>{children}</div>
)
