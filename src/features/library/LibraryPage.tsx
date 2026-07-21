import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CircleAlert, FileText, FolderCode, LayoutGrid, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react'
import type { LibrarySection, RouteDescriptor } from '../../navigation'
import { getTool } from '../../tools/getTool'
import { TOOL_REGISTRY_BY_ID } from '../../tools/registry'
import type { ArtifactRecord, DocumentRecord, RunRecord, RunStatus } from '../../db/db'
import { artifactsRepository, documentRecordsRepository, runsRepository } from '../../repositories'

interface LibraryPageProps {
  section?: LibrarySection
  onNavigate: (route: RouteDescriptor) => void
}

const SECTION_ORDER: readonly LibrarySection[] = ['runs', 'documents', 'artifacts', 'templates'] as const

const RUN_STATUS_OPTIONS: readonly (RunStatus | 'all')[] = ['all', 'queued', 'running', 'completed', 'cancelled', 'failed']

const formatTimestamp = (value: number): string => new Date(value).toLocaleString()

const titleCaseFromId = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[Unable to display payload]'
  }
}

const resolveToolTitle = (toolId: string): string => TOOL_REGISTRY_BY_ID[toolId as keyof typeof TOOL_REGISTRY_BY_ID]?.title ?? titleCaseFromId(toolId)

const resolveActionTitle = (toolId: string, actionId?: string): string | undefined => {
  if (!actionId) return undefined

  const tool = getTool(toolId as keyof typeof TOOL_REGISTRY_BY_ID)
  return tool?.actions?.find((action) => action.id === actionId)?.title ?? titleCaseFromId(actionId)
}

const getRunSummary = (run: RunRecord): string => {
  const actionTitle = resolveActionTitle(run.toolId, run.actionId)
  const toolTitle = resolveToolTitle(run.toolId)
  const executionLabel = `${run.execution.providerId} · ${run.execution.modelId} · ${run.execution.locality}`
  return `${toolTitle}${actionTitle ? ` · ${actionTitle}` : ''} · ${executionLabel}`
}

const EmptyState: React.FC<{
  icon: React.ReactNode
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}> = ({ icon, title, body, actionLabel, onAction }) => (
  <div className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-6 text-center">
    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400">
      {icon}
    </div>
    <h3 className="mt-3 text-sm font-semibold text-zinc-100">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
    {actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
)

const SectionButton: React.FC<{
  section: LibrarySection
  active: boolean
  label: string
  onSelect: (section: LibrarySection) => void
}> = ({ section, active, label, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(section)}
    aria-pressed={active}
    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? 'border-indigo-700 bg-indigo-950/40 text-indigo-200' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800'}`}
  >
    {label}
  </button>
)

const DetailField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3">
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
    <div className="mt-1 break-words text-sm text-zinc-100">{value}</div>
  </div>
)

const RecordShell: React.FC<{
  active: boolean
  title: string
  subtitle: string
  meta: React.ReactNode
  onSelect: () => void
  onDelete: () => void
}> = ({ active, title, subtitle, meta, onSelect, onDelete }) => (
  <article className={`rounded-2xl border p-4 transition ${active ? 'border-indigo-700/70 bg-indigo-950/20' : 'border-zinc-800/70 bg-zinc-950/70'}`}>
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-sm font-semibold text-zinc-50">{title}</h3>
          <p className="break-words text-xs leading-5 text-zinc-400">{subtitle}</p>
        </div>
        {active ? (
          <span className="shrink-0 rounded-full border border-indigo-700 bg-indigo-950/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
            Selected
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-xs text-zinc-500">{meta}</div>
    </button>

    <div className="mt-3 flex items-center justify-end gap-2 border-t border-zinc-900/60 pt-3">
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-rose-900/40 hover:bg-rose-950/20 hover:text-rose-200"
        aria-label="Delete this record"
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
    </div>
  </article>
)

const RunDetail: React.FC<{
  run: RunRecord
  onDelete: () => void
}> = ({ run, onDelete }) => {
  const toolTitle = resolveToolTitle(run.toolId)
  const actionTitle = resolveActionTitle(run.toolId, run.actionId)

  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Run detail</div>
          <h3 className="mt-1 text-lg font-semibold text-zinc-50">{toolTitle}</h3>
          <p className="mt-1 text-sm text-zinc-400">{actionTitle ?? 'Default action'} · {run.status}</p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-rose-900/40 hover:bg-rose-950/20 hover:text-rose-200"
        >
          <Trash2 className="h-4 w-4" /> Delete run
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailField label="Tool" value={toolTitle} />
        <DetailField label="Action" value={actionTitle ?? 'Default'} />
        <DetailField label="Execution" value={`${run.execution.providerId} · ${run.execution.modelId} · ${run.execution.locality}`} />
        <DetailField label="Timestamp" value={formatTimestamp(run.createdAt)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailField label="Status" value={run.status} />
        <DetailField label="Completed" value={run.completedAt ? formatTimestamp(run.completedAt) : '—'} />
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Raw input</div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3 text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words select-text">{safeJson(run.input)}</pre>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Raw output</div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3 text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words select-text">{run.output ?? '[No output saved]'}</pre>
        </div>

        {run.error ? (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">Error</div>
            <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-xs leading-6 text-rose-100 whitespace-pre-wrap break-words select-text">{safeJson(run.error)}</pre>
          </div>
        ) : null}
      </div>
    </section>
  )
}

const DocumentDetail: React.FC<{
  document: DocumentRecord
  onDelete: () => void
}> = ({ document, onDelete }) => (
  <section className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Document detail</div>
        <h3 className="mt-1 text-lg font-semibold text-zinc-50">{document.name}</h3>
        <p className="mt-1 text-sm text-zinc-400">{document.contentType} · {document.source}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-rose-900/40 hover:bg-rose-950/20 hover:text-rose-200"
      >
        <Trash2 className="h-4 w-4" /> Delete document
      </button>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <DetailField label="Created" value={formatTimestamp(document.createdAt)} />
      <DetailField label="Updated" value={formatTimestamp(document.updatedAt)} />
    </div>

    <div className="mt-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Content</div>
      <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3 text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words select-text">{document.content}</pre>
    </div>
  </section>
)

const ArtifactDetail: React.FC<{
  artifact: ArtifactRecord
  onDelete: () => void
}> = ({ artifact, onDelete }) => (
  <section className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Artifact detail</div>
        <h3 className="mt-1 text-lg font-semibold text-zinc-50">{artifact.title}</h3>
        <p className="mt-1 text-sm text-zinc-400">{artifact.type} · {resolveToolTitle(artifact.toolId)}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-rose-900/40 hover:bg-rose-950/20 hover:text-rose-200"
      >
        <Trash2 className="h-4 w-4" /> Delete artifact
      </button>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <DetailField label="Tool" value={resolveToolTitle(artifact.toolId)} />
      <DetailField label="Created" value={formatTimestamp(artifact.createdAt)} />
      <DetailField label="Source run" value={artifact.sourceRunId ?? '—'} />
      <DetailField label="Type" value={artifact.type} />
    </div>

    <div className="mt-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Content</div>
      <pre className="mt-2 max-h-96 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/80 p-3 text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words select-text">{safeJson(artifact.content)}</pre>
    </div>
  </section>
)

export const LibraryPage: React.FC<LibraryPageProps> = ({ section, onNavigate }) => {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([])
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null)
  const [selectedArtifactId, setSelectedArtifactId] = useState<number | null>(null)
  const [toolFilter, setToolFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all')

  const selectedSection = section ?? 'runs'

  const loadRecords = async () => {
    const [nextRuns, nextDocuments, nextArtifacts] = await Promise.all([
      runsRepository.list(),
      documentRecordsRepository.list(),
      artifactsRepository.list(),
    ])

    setRuns(nextRuns)
    setDocuments(nextDocuments)
    setArtifacts(nextArtifacts)
  }

  useEffect(() => {
    void loadRecords()
  }, [])

  const toolOptions = useMemo(() => {
    const toolIds = new Set<string>(runs.map((run) => run.toolId))
    return Array.from(toolIds).sort((left, right) => resolveToolTitle(left).localeCompare(resolveToolTitle(right)))
  }, [runs])

  const filteredRuns = useMemo(() => {
    const filtered = runs.filter((run) => {
      if (toolFilter !== 'all' && run.toolId !== toolFilter) return false
      if (statusFilter !== 'all' && run.status !== statusFilter) return false
      return true
    })

    return filtered
  }, [runs, toolFilter, statusFilter])

  useEffect(() => {
    if (filteredRuns.length === 0) {
      setSelectedRunId(null)
      return
    }

    if (!selectedRunId || !filteredRuns.some((run) => run.id === selectedRunId)) {
      setSelectedRunId(filteredRuns[0].id ?? null)
    }
  }, [filteredRuns, selectedRunId])

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedDocumentId(null)
      return
    }

    if (!selectedDocumentId || !documents.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(documents[0].id ?? null)
    }
  }, [documents, selectedDocumentId])

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedArtifactId(null)
      return
    }

    if (!selectedArtifactId || !artifacts.some((artifact) => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(artifacts[0].id ?? null)
    }
  }, [artifacts, selectedArtifactId])

  const selectedRun = filteredRuns.find((run) => run.id === selectedRunId) ?? filteredRuns[0] ?? null
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) ?? documents[0] ?? null
  const selectedArtifact = artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? artifacts[0] ?? null

  const confirmAndClear = async (scope: LibrarySection) => {
    const labels: Record<LibrarySection, string> = {
      runs: 'canonical runs collection',
      documents: 'canonical documents collection',
      artifacts: 'canonical artifacts collection',
      templates: 'templates view',
    }

    if (!window.confirm(`This will permanently delete only the ${labels[scope]}. Legacy history tables and settings will remain untouched. Continue?`)) {
      return
    }

    if (scope === 'runs') {
      await runsRepository.clear()
      setRuns([])
      setSelectedRunId(null)
      return
    }

    if (scope === 'documents') {
      await documentRecordsRepository.clear()
      setDocuments([])
      setSelectedDocumentId(null)
      return
    }

    if (scope === 'artifacts') {
      await artifactsRepository.clear()
      setArtifacts([])
      setSelectedArtifactId(null)
    }
  }

  const deleteRun = async (runId: number) => {
    if (!window.confirm('Delete this run record? This only removes the selected canonical run.')) return
    await runsRepository.delete(runId)
    setRuns((current) => current.filter((run) => run.id !== runId))
    if (selectedRunId === runId) setSelectedRunId(null)
  }

  const deleteDocument = async (documentId: number) => {
    if (!window.confirm('Delete this document record? This only removes the selected canonical document.')) return
    await documentRecordsRepository.delete(documentId)
    setDocuments((current) => current.filter((document) => document.id !== documentId))
    if (selectedDocumentId === documentId) setSelectedDocumentId(null)
  }

  const deleteArtifact = async (artifactId: number) => {
    if (!window.confirm('Delete this artifact record? This only removes the selected canonical artifact.')) return
    await artifactsRepository.delete(artifactId)
    setArtifacts((current) => current.filter((artifact) => artifact.id !== artifactId))
    if (selectedArtifactId === artifactId) setSelectedArtifactId(null)
  }

  const renderRunsSection = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Runs</div>
          <h2 className="text-lg font-semibold text-zinc-50">Canonical run history</h2>
          <p className="text-sm leading-6 text-zinc-400">Newest first. Filter by tool or status, inspect raw payloads, and delete a single run without touching other local data.</p>
        </div>

        <button
          type="button"
          onClick={() => void confirmAndClear('runs')}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-800 hover:bg-rose-950/40"
        >
          <Trash2 className="h-4 w-4" /> Clear runs
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Tool</span>
          <select
            value={toolFilter}
            onChange={(event) => setToolFilter(event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Filter runs by tool"
          >
            <option value="all">All tools</option>
            {toolOptions.map((toolId) => (
              <option key={toolId} value={toolId}>{resolveToolTitle(toolId)}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RunStatus | 'all')}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Filter runs by status"
          >
            {RUN_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status === 'all' ? 'All statuses' : titleCaseFromId(status)}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredRuns.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-3">
            {filteredRuns.map((run) => (
              <RecordShell
                key={run.id}
                active={run.id === selectedRun?.id}
                title={`${resolveToolTitle(run.toolId)}${resolveActionTitle(run.toolId, run.actionId) ? ` · ${resolveActionTitle(run.toolId, run.actionId)}` : ''}`}
                subtitle={getRunSummary(run)}
                meta={<span className="font-mono">{formatTimestamp(run.createdAt)} · {run.status}</span>}
                onSelect={() => setSelectedRunId(run.id ?? null)}
                onDelete={() => void deleteRun(run.id!)}
              />
            ))}
          </div>

          {selectedRun ? <RunDetail run={selectedRun} onDelete={() => void deleteRun(selectedRun.id!)} /> : null}
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="h-4 w-4" />}
          title={runs.length === 0 ? 'No runs yet' : 'No runs match these filters'}
          body={runs.length === 0
            ? 'Executed tools will appear here once canonical run records are saved.'
            : 'Adjust the tool or status filters to reveal matching runs.'}
          actionLabel={runs.length === 0 ? undefined : 'Reset filters'}
          onAction={runs.length === 0 ? undefined : () => { setToolFilter('all'); setStatusFilter('all') }}
        />
      )}
    </div>
  )

  const renderDocumentsSection = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Documents</div>
          <h2 className="text-lg font-semibold text-zinc-50">Canonical document records</h2>
          <p className="text-sm leading-6 text-zinc-400">Review saved documents, inspect raw content, and delete a single document record with an explicit confirmation.</p>
        </div>

        <button
          type="button"
          onClick={() => void confirmAndClear('documents')}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-800 hover:bg-rose-950/40"
        >
          <Trash2 className="h-4 w-4" /> Clear documents
        </button>
      </div>

      {documents.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-3">
            {documents.map((document) => (
              <RecordShell
                key={document.id}
                active={document.id === selectedDocument?.id}
                title={document.name}
                subtitle={`${document.contentType} · ${document.source}`}
                meta={<span className="font-mono">{formatTimestamp(document.updatedAt)}</span>}
                onSelect={() => setSelectedDocumentId(document.id ?? null)}
                onDelete={() => void deleteDocument(document.id!)}
              />
            ))}
          </div>

          {selectedDocument ? <DocumentDetail document={selectedDocument} onDelete={() => void deleteDocument(selectedDocument.id!)} /> : null}
        </div>
      ) : (
        <EmptyState
          icon={<FolderCode className="h-4 w-4" />}
          title="No documents saved"
          body="Paste, import, or generate a document to populate the canonical document library."
        />
      )}
    </div>
  )

  const renderArtifactsSection = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Artifacts</div>
          <h2 className="text-lg font-semibold text-zinc-50">Canonical artifact records</h2>
          <p className="text-sm leading-6 text-zinc-400">Inspect saved outputs and linked sources. Deleting an artifact only removes that artifact record.</p>
        </div>

        <button
          type="button"
          onClick={() => void confirmAndClear('artifacts')}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-900/30 bg-rose-950/20 px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-800 hover:bg-rose-950/40"
        >
          <Trash2 className="h-4 w-4" /> Clear artifacts
        </button>
      </div>

      {artifacts.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <RecordShell
                key={artifact.id}
                active={artifact.id === selectedArtifact?.id}
                title={artifact.title}
                subtitle={`${artifact.type} · ${resolveToolTitle(artifact.toolId)}`}
                meta={<span className="font-mono">{formatTimestamp(artifact.createdAt)}</span>}
                onSelect={() => setSelectedArtifactId(artifact.id ?? null)}
                onDelete={() => void deleteArtifact(artifact.id!)}
              />
            ))}
          </div>

          {selectedArtifact ? <ArtifactDetail artifact={selectedArtifact} onDelete={() => void deleteArtifact(selectedArtifact.id!)} /> : null}
        </div>
      ) : (
        <EmptyState
          icon={<ShieldAlert className="h-4 w-4" />}
          title="No artifacts saved"
          body="Artifacts created by tools will appear here once canonical artifact persistence is in use."
        />
      )}
    </div>
  )

  const renderTemplatesSection = () => (
    <EmptyState
      icon={<LayoutGrid className="h-4 w-4" />}
      title="Templates are not wired yet"
      body="This transitional Library section is intentionally empty until template persistence lands."
    />
  )

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-zinc-800/60 bg-zinc-950/60 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
              <FileText className="h-3.5 w-3.5" /> Library
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-50">Local records</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Runs, documents, artifacts, and templates live here as canonical local data. Each delete action is scoped to one collection or one selected record.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadRecords()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SECTION_ORDER.map((librarySection) => (
            <SectionButton
              key={librarySection}
              section={librarySection}
              active={selectedSection === librarySection}
              label={librarySection.charAt(0).toUpperCase() + librarySection.slice(1)}
              onSelect={(nextSection) => onNavigate({ view: 'library', section: nextSection })}
            />
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 text-sm leading-6 text-amber-100">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>Clear actions delete only the selected canonical collection. They do not touch settings or legacy tables.</p>
        </div>
      </header>

      {selectedSection === 'runs' ? renderRunsSection() : null}
      {selectedSection === 'documents' ? renderDocumentsSection() : null}
      {selectedSection === 'artifacts' ? renderArtifactsSection() : null}
      {selectedSection === 'templates' ? renderTemplatesSection() : null}

      <button
        type="button"
        onClick={() => onNavigate({ view: 'workbench' })}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to workbench
      </button>
    </section>
  )
}
