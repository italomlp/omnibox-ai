import React from 'react'
import type { RouteDescriptor } from '../../navigation'
import { LibraryPage } from '../../features/library/LibraryPage'
import { SettingsPanel } from '../../features/settings/SettingsPanel'
import { ToolRoutePage } from '../../features/tools/ToolRoutePage'
import { ToolsCatalogPage } from '../../features/tools/ToolsCatalogPage'
import { WorkbenchPage } from '../../features/workbench/WorkbenchPage'

interface WorkspaceRouterProps {
  route: RouteDescriptor
  onNavigate: (route: RouteDescriptor) => void
  privacyMode: boolean
  webGpuSupported: boolean | null
}

export const WorkspaceRouter: React.FC<WorkspaceRouterProps> = ({ route, onNavigate, privacyMode, webGpuSupported }) => {
  switch (route.view) {
    case 'workbench':
      return <WorkbenchPage onNavigate={onNavigate} privacyMode={privacyMode} webGpuSupported={webGpuSupported} />
    case 'tools':
      return <ToolsCatalogPage onNavigate={onNavigate} />
    case 'tool':
      return <ToolRoutePage toolId={route.tool} onNavigate={onNavigate} />
    case 'library':
      return <LibraryPage section={route.section} onNavigate={onNavigate} />
    case 'system':
      return <SettingsPanel />
    default:
      return <WorkbenchPage onNavigate={onNavigate} privacyMode={privacyMode} webGpuSupported={webGpuSupported} />
  }
}
