import { routeForLegacyWorkspace } from '../../navigation/routes'

/** Only these legacy workspaces have input reload adapters. */
export const canReloadLegacyWorkspace = (workspace: string): boolean =>
  (workspace === 'grammar' || workspace === 'career') && routeForLegacyWorkspace(workspace)?.view === 'tool'
