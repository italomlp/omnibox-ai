import React from 'react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
  leftClassName?: string
  rightClassName?: string
}

export const SplitPane: React.FC<SplitPaneProps> = ({ left, right, className, leftClassName, rightClassName }) => (
  <div className={`flex flex-col gap-6 lg:grid lg:grid-cols-2 ${className ?? ''}`.trim()}>
    <div className={leftClassName}>{left}</div>
    <div className={rightClassName}>{right}</div>
  </div>
)
