import React from 'react'
import { GrammarWorkspace } from '../../features/grammar/GrammarWorkspace'
import { CareerWorkspace } from '../../features/career/CareerWorkspace'
import { SettingsPanel } from '../../features/settings/SettingsPanel'
import { HistoryWorkspace } from '../../features/history/HistoryWorkspace'
import type { WorkspaceId } from '../../store/useUIStore'

interface WorkspaceRouterProps {
  activeWorkspace: WorkspaceId;
  onNavigateWorkspace: (workspace: WorkspaceId) => void;
}
export const WorkspaceRouter: React.FC<WorkspaceRouterProps> = ({ activeWorkspace, onNavigateWorkspace }) => {
  switch (activeWorkspace) {
    case 'grammar':
      return <GrammarWorkspace />
    case 'career':
      return <CareerWorkspace />
    case 'settings':
      return <SettingsPanel />
    case 'history':
      return <HistoryWorkspace onNavigateWorkspace={onNavigateWorkspace} />
    default:
      return <GrammarWorkspace />
  }
}
