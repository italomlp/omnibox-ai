import React from 'react'
import { GrammarWorkspace } from '../../features/grammar/GrammarWorkspace'
import { CareerWorkspace } from '../../features/career/CareerWorkspace'
import { SettingsPanel } from '../../features/settings/SettingsPanel'

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
    default:
      return <GrammarWorkspace />
  }
}
