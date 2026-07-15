import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Cpu, HardDrive, Sparkles } from 'lucide-react';
import {
  PROVIDER_DEFAULT_MODELS,
  WEBLLM_MODEL_CONFIGS,
  WEBLLM_MODEL_CONFIGS_BY_TIER,
  WEBLLM_TASK_KEYS,
  WEBLLM_TASK_LABELS,
  WEBLLM_TASK_SUPPORT_LABELS,
  WEBLLM_TIER_LABELS,
  type WebLLMModelConfig,
  type WebLLMModelTier,
  type WebLLMTaskKey,
} from '../../config/providers';

const tierOrder: WebLLMModelTier[] = ['fast', 'balanced', 'quality'];

const classNames = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const formatMemoryMB = (value: number): string => {
  if (value >= 1000) {
    const gb = value / 1000;
    return `${Number.isInteger(gb) ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }

  return `${Math.round(value)} MB`;
};

const formatDownloadSize = (value: number): string => {
  if (value >= 1000) {
    const gb = value / 1000;
    return `${Number.isInteger(gb) ? gb.toFixed(0) : gb.toFixed(1)} GB`;
  }

  return `${Math.round(value)} MB`;
};

const getTaskBadgeClass = (status: WebLLMModelConfig['taskSupport'][WebLLMTaskKey]): string => {
  switch (status) {
    case 'supported':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    case 'best-effort':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    default:
      return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
  }
};

export interface WebLLMModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
  selectedTask?: WebLLMTaskKey | null;
  workspaceActionLabel?: string;
  blockedReason?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  menuMode?: 'flow' | 'portal';
}

export const WebLLMModelPicker: React.FC<WebLLMModelPickerProps> = ({
  value,
  onChange,
  selectedTask = null,
  workspaceActionLabel,
  blockedReason,
  disabled = false,
  className,
  label = 'WebLLM model',
  menuMode = 'portal',
}) => {
  const pickerId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const previousOpenRef = useRef(false);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);

  const selectedConfig = useMemo(() => {
    return WEBLLM_MODEL_CONFIGS.find((config) => config.modelId === value) ??
      WEBLLM_MODEL_CONFIGS.find((config) => config.modelId === PROVIDER_DEFAULT_MODELS.webgpu) ??
      WEBLLM_MODEL_CONFIGS[0];
  }, [value]);

  const configsByTier = useMemo(
    () => tierOrder.map((tier) => ({ tier, models: WEBLLM_MODEL_CONFIGS_BY_TIER[tier] })),
    []
  );

  const flatConfigs = useMemo(
    () => configsByTier.flatMap((group) => group.models),
    [configsByTier]
  );

  const selectedTaskStatus = selectedTask ? selectedConfig.taskSupport[selectedTask] : null;
  const selectedTaskLabel = selectedTask ? WEBLLM_TASK_LABELS[selectedTask] : null;

  const selectedConfigIndex = useMemo(
    () => flatConfigs.findIndex((config) => config.modelId === selectedConfig.modelId),
    [flatConfigs, selectedConfig.modelId]
  );

  const activeConfig = flatConfigs[activeIndex] ?? selectedConfig;

  const closePicker = () => {
    setIsOpen(false);
  };

  const openPicker = () => {
    if (disabled) return;
    setActiveIndex(selectedConfigIndex >= 0 ? selectedConfigIndex : 0);
    setIsOpen(true);
  };

  const selectModel = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target) || portalRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => listboxRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedConfigIndex >= 0) {
      setActiveIndex(selectedConfigIndex);
    }
  }, [isOpen, selectedConfigIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const option = optionRefs.current[activeIndex];
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || menuMode !== 'portal') {
      setPortalStyle(null);
      return;
    }

    let rafId = 0;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = portalRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const gap = 8;
      const inset = 12;
      const width = rect.width;
      const maxHeightBelow = Math.max(160, viewportHeight - rect.bottom - gap - inset);
      const maxHeightAbove = Math.max(160, rect.top - gap - inset);
      const placeAbove = maxHeightBelow < 220 && maxHeightAbove > maxHeightBelow;
      const left = Math.min(Math.max(rect.left, inset), Math.max(inset, viewportWidth - width - inset));

      setPortalStyle({
        position: 'fixed',
        left,
        width,
        zIndex: 'var(--layer-popover40)',
        ...(placeAbove
          ? {
              bottom: Math.max(inset, viewportHeight - rect.top + gap),
              maxHeight: `calc(100dvh - ${Math.max(inset, viewportHeight - rect.top + gap)}px - ${inset}px)`,
            }
          : {
              top: rect.bottom + gap,
              maxHeight: `calc(100dvh - ${rect.bottom + gap}px - ${inset}px)`,
            }),
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);
    window.visualViewport?.addEventListener('resize', scheduleUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleUpdate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.visualViewport?.removeEventListener('resize', scheduleUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleUpdate);
    };
  }, [isOpen, menuMode]);

  useEffect(() => {
    if (previousOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    previousOpenRef.current = isOpen;
  }, [isOpen]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        openPicker();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(selectedConfigIndex >= 0 ? Math.min(selectedConfigIndex + 1, flatConfigs.length - 1) : 0);
        setIsOpen(true);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(selectedConfigIndex >= 0 ? Math.max(selectedConfigIndex - 1, 0) : flatConfigs.length - 1);
        setIsOpen(true);
        break;
      default:
        break;
    }
  };

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % flatConfigs.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + flatConfigs.length) % flatConfigs.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(flatConfigs.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectModel(activeConfig.modelId);
        break;
      case 'Escape':
        event.preventDefault();
        closePicker();
        break;
      default:
        break;
    }
  };

  const hardwareSummary = `${formatMemoryMB(selectedConfig.recommendedAvailableMemoryMB)} available GPU/shared memory · ${selectedConfig.recommendedSystemMemoryGB} GB RAM`;

  const selectedTaskBlockMessage =
    selectedTask && selectedTaskStatus === 'blocked'
      ? blockedReason ??
        `${selectedConfig.label} is blocked for ${workspaceActionLabel ?? selectedTaskLabel ?? 'this workspace action'}.`
      : null;

  const selectedTaskBestEffortMessage =
    selectedTask && selectedTaskStatus === 'best-effort'
      ? `${selectedConfig.label} can attempt ${workspaceActionLabel ?? selectedTaskLabel ?? 'this action'}, but output quality is not guaranteed.`
      : null;

  const menuContent = (
      <div
        ref={menuMode === 'portal' ? portalRef : undefined}
        className={classNames(
          menuMode === 'portal'
            ? 'fixed left-0 top-0 layer-popover40 w-auto'
            : 'absolute left-0 right-0 top-full layer-popover40 mt-2',
          'rounded-2xl border border-zinc-800 bg-zinc-950/98 p-2 shadow-2xl shadow-black/40 backdrop-blur'
        )}
      style={
        menuMode === 'portal'
          ? portalStyle
            ? { ...portalStyle, visibility: 'visible' }
            : { visibility: 'hidden' }
          : undefined
      }
    >
      <div
        ref={listboxRef}
        id={`${pickerId}-listbox`}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${pickerId}-option-${flatConfigs[activeIndex]?.modelId ?? selectedConfig.modelId}`}
        tabIndex={0}
        onKeyDown={handleListboxKeyDown}
        className="overflow-auto rounded-xl outline-none"
        style={menuMode === 'portal' ? { maxHeight: portalStyle?.maxHeight ?? '31rem' } : { maxHeight: '31rem' }}
      >
        {configsByTier.map((group) => (
          <div key={group.tier} className="space-y-2 p-1.5">
            <div className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <span>{WEBLLM_TIER_LABELS[group.tier]}</span>
              <span className="h-px flex-1 bg-zinc-800/80" />
            </div>

            <div className="space-y-1.5">
              {group.models.map((config) => {
                const index = flatConfigs.findIndex((item) => item.modelId === config.modelId);
                const isSelected = config.modelId === selectedConfig.modelId;
                const isActive = index === activeIndex;

                return (
                  <div
                    key={config.modelId}
                    id={`${pickerId}-option-${config.modelId}`}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectModel(config.modelId)}
                    className={classNames(
                      'cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors',
                      isActive
                        ? 'border-indigo-500/40 bg-indigo-500/10'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/80',
                      isSelected && 'ring-1 ring-inset ring-indigo-500/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="min-w-0 truncate text-sm font-medium text-zinc-100">{config.label}</span>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                            {config.family}
                          </span>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                            {config.parameterCount}
                          </span>
                        </div>

                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {formatMemoryMB(config.recommendedAvailableMemoryMB)} available GPU/shared memory
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {config.recommendedSystemMemoryGB} GB RAM
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                        {isSelected ? <Check className="h-3.5 w-3.5 text-indigo-400" /> : null}
                        <span>{WEBLLM_TIER_LABELS[config.tier]}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {WEBLLM_TASK_KEYS.map((task) => {
                        const status = config.taskSupport[task];
                        return (
                          <span
                            key={task}
                            className={classNames(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                              getTaskBadgeClass(status)
                            )}
                          >
                            {WEBLLM_TASK_LABELS[task]}: {WEBLLM_TASK_SUPPORT_LABELS[status]}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-zinc-400">
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">
                        <Sparkles className="h-3 w-3" />
                        Download {formatDownloadSize(config.downloadSizeMB)}
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">
                        Context {config.contextWindow.toLocaleString()} tokens
                      </span>
                      <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5">
                        Max input {config.maxRecommendedInputTokens.toLocaleString()} tokens
                      </span>
                      {config.requiredWebGpuFeatures?.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-300"
                        >
                          Requires {feature}
                        </span>
                      ))}
                      {config.warning ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          {config.warning}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={classNames('relative w-full min-w-0 space-y-3', className)}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        <span>{label}</span>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-zinc-400">
          {WEBLLM_TIER_LABELS[selectedConfig.tier]}
        </span>
      </div>

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${pickerId}-listbox`}
        onClick={() => (isOpen ? closePicker() : openPicker())}
        onKeyDown={handleTriggerKeyDown}
        className={classNames(
          'flex w-full items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-left transition-colors',
          'hover:border-zinc-700 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">{selectedConfig.label}</span>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
              {WEBLLM_TIER_LABELS[selectedConfig.tier]}
            </span>
            {selectedConfig.warning ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Warning
              </span>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-zinc-400">{hardwareSummary}</p>
        </div>

        <div className="mt-0.5 flex items-center gap-1 text-zinc-400">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isOpen ? (menuMode === 'portal' ? createPortal(menuContent, document.body) : menuContent) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span>Model details</span>
          {selectedTaskLabel ? (
            <span className={classNames('rounded-full border px-2 py-0.5', getTaskBadgeClass(selectedTaskStatus ?? 'supported'))}>
              {workspaceActionLabel ?? selectedTaskLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Download size</p>
            <p className="text-zinc-200">{formatDownloadSize(selectedConfig.downloadSizeMB)} actual model download.</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Memory guidance</p>
            <p className="text-zinc-200">
              Minimum {formatMemoryMB(selectedConfig.minimumAvailableMemoryMB)} available GPU/shared memory; recommended {formatMemoryMB(selectedConfig.recommendedAvailableMemoryMB)} and {selectedConfig.recommendedSystemMemoryGB} GB RAM.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recommended use cases</p>
            <p className="text-zinc-200">{selectedConfig.recommendedFor.join(', ')}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Task fit</p>
            <p className="text-zinc-200">
              {selectedTaskLabel
                ? selectedTaskStatus === 'blocked'
                  ? selectedTaskBlockMessage
                  : selectedTaskBestEffortMessage ?? `${selectedConfig.label} is a good fit for ${workspaceActionLabel ?? selectedTaskLabel}.`
                : 'Choose a workspace action to see task compatibility guidance.'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {WEBLLM_TASK_KEYS.map((task) => {
            const status = selectedConfig.taskSupport[task];
            const isSelectedTask = task === selectedTask;

            return (
              <span
                key={task}
                className={classNames(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  getTaskBadgeClass(status),
                  isSelectedTask && 'ring-1 ring-inset ring-indigo-500/30'
                )}
              >
                {WEBLLM_TASK_LABELS[task]}: {WEBLLM_TASK_SUPPORT_LABELS[status]}
              </span>
            );
          })}
          {selectedConfig.requiredWebGpuFeatures?.map((feature) => (
            <span key={feature} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
              Requires {feature}
            </span>
          ))}
        </div>

        {selectedConfig.warning ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{selectedConfig.warning}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
};
