import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PROVIDER_DEFAULT_MODELS, WEBLLM_MODEL_CONFIGS, WEBLLM_TASK_LABELS, WEBLLM_TASK_SUPPORT_LABELS, type WebLLMTaskKey } from '../../config/providers'
import { useSettingsStore } from '../../store/useSettingsStore'

export interface WebLLMModelPickerProps {
  value: string
  onChange: (modelId: string) => void
  selectedTask?: WebLLMTaskKey | null
  workspaceActionLabel?: string
  blockedReason?: string
  disabled?: boolean
  className?: string
  label?: string
  menuMode?: 'flow' | 'portal'
}

export const WebLLMModelPicker: React.FC<WebLLMModelPickerProps> = ({ value, onChange, selectedTask, workspaceActionLabel, blockedReason, disabled, className, label = 'WebLLM model' }) => {
  const [open, setOpen] = useState(false)
  const auto = useSettingsStore((state) => state.webLLMAuto)
  const setAuto = useSettingsStore((state) => state.setWebLLMAuto)
  const [features, setFeatures] = useState<Set<string> | null>(null)
  const [gpuUnavailable, setGpuUnavailable] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = WEBLLM_MODEL_CONFIGS.find((model) => model.modelId === value) ?? WEBLLM_MODEL_CONFIGS.find((model) => model.modelId === PROVIDER_DEFAULT_MODELS.webgpu) ?? WEBLLM_MODEL_CONFIGS[0]

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    dialog?.showModal()
    let cancelled = false
    if (navigator.gpu) {
      void navigator.gpu.requestAdapter().then((adapter) => {
        if (!cancelled) {
          setGpuUnavailable(!adapter)
          if (adapter) setFeatures(new Set(adapter.features))
        }
      }).catch(() => { if (!cancelled) setGpuUnavailable(true) })
    } else setGpuUnavailable(true)
    return () => { cancelled = true; dialog?.close(); trigger?.focus() }
  }, [open])

  const fit = selectedTask ? selected.taskSupport[selectedTask] : null
  return <div className={className}>
    <button ref={triggerRef} type="button" disabled={disabled} aria-haspopup="dialog" onClick={() => setOpen(true)} className="theme-panel w-full rounded-xl border px-3 py-3 text-left text-sm theme-text-strong disabled:opacity-60">
      <span className="font-semibold">{auto ? 'Automatic by task' : selected.label}</span><span className="ml-2 text-xs theme-text-faint">Change model</span>
    </button>
    {!auto && fit && <p className="mt-2 text-xs theme-text-faint">{workspaceActionLabel ?? WEBLLM_TASK_LABELS[selectedTask!]}: {WEBLLM_TASK_SUPPORT_LABELS[fit]}{fit === 'blocked' && blockedReason ? ` — ${blockedReason}` : ''}</p>}
    {open && createPortal(<dialog ref={dialogRef} aria-label={label} onCancel={(event) => { event.preventDefault(); setOpen(false) }} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false) }} className="theme-panel-strong m-auto max-h-[85dvh] w-[min(36rem,calc(100vw-2rem))] overflow-auto rounded-2xl border p-5 text-left backdrop:bg-black/70">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold theme-text-strong">{label}</h2><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1 theme-text-strong">Close</button></div>
      <p className="mb-3 text-xs theme-text-faint">Hardware fit is an estimate. Available GPU memory cannot be reliably measured by the browser.</p>
      <button type="button" onClick={() => { setAuto(true); setOpen(false) }} aria-pressed={auto} className="theme-panel mb-2 w-full rounded-xl border p-3 text-left theme-text-strong">Automatic by task{auto ? ' · Selected' : ''}</button>
      <div className="space-y-2">{WEBLLM_MODEL_CONFIGS.map((model) => {
        const missing = features && model.requiredWebGpuFeatures?.filter((feature) => !features.has(feature))
        return <div key={model.modelId} className="theme-panel rounded-xl border p-3">
          <button type="button" onClick={() => { onChange(model.modelId); setAuto(false); setOpen(false) }} className="w-full text-left theme-text-strong" aria-pressed={!auto && model.modelId === selected.modelId}>
            <span className="font-semibold">{model.label}</span>{!auto && model.modelId === selected.modelId ? ' · Selected' : ''}
            <span className="mt-1 block text-xs theme-text-faint">Estimated download: {model.downloadSizeMB} MB · {gpuUnavailable ? 'WebGPU unavailable' : missing?.length ? `Unsupported: ${missing.join(', ')}` : 'Hardware fit unknown'}{selectedTask ? ` · ${WEBLLM_TASK_LABELS[selectedTask]}: ${WEBLLM_TASK_SUPPORT_LABELS[model.taskSupport[selectedTask]]}` : ''}</span>
          </button>
          <details className="mt-2 text-xs theme-text-faint"><summary className="cursor-pointer">Details</summary><p className="mt-1">Recommended GPU/shared memory: {model.recommendedAvailableMemoryMB} MB; system RAM: {model.recommendedSystemMemoryGB} GB. Context: {model.contextWindow} tokens. {model.warning}</p></details>
        </div>
      })}</div>
    </dialog>, document.body)}
  </div>
}
