import React from 'react'
import { GrammarWorkspace } from '../../features/grammar/GrammarWorkspace'
import { CareerWorkspace } from '../../features/career/CareerWorkspace'
import { SettingsPanel } from '../../features/settings/SettingsPanel'
import { HistoryWorkspace } from '../../features/history/HistoryWorkspace'

interface WorkspaceRouterProps {
  activeWorkspace: string;
}
export const WorkspaceRouter: React.FC<WorkspaceRouterProps> = ({ activeWorkspace }) => {
  switch (activeWorkspace) {
    case 'grammar':
      return <GrammarWorkspace />
    case 'career':
      return <CareerWorkspace />
    case 'settings':
      return <SettingsPanel />
    case 'history':
      return <HistoryWorkspace />
    default:
      return <GrammarWorkspace />
  }
}
