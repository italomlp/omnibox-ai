import type { ToolDefinition } from './types'

const sharedExecutionCapabilities = {
  acceptsDocuments: true,
  supportsLocalExecution: true,
  supportsCloudExecution: true,
  supportsStreaming: true,
  supportsArtifacts: false,
} as const

export const TOOL_REGISTRY = [
  {
    id: 'grammar-tone',
    version: 1,
    title: 'Grammar & Tone',
    description: 'Shared grammar correction and tone adjustment workflows.',
    categoryId: 'writing',
    capabilities: sharedExecutionCapabilities,
    actions: [
      {
        id: 'grammar',
        title: 'Grammar',
        description: 'Correct spelling, grammar, punctuation, and syntax.',
        default: true,
      },
      {
        id: 'tone',
        title: 'Tone',
        description: 'Adjust tone while preserving meaning.',
      },
    ],
  },
  {
    id: 'career',
    version: 1,
    title: 'Career Suite',
    description: 'Resume and job-fit diagnostics for candidate materials.',
    categoryId: 'career',
    capabilities: sharedExecutionCapabilities,
    actions: [
      {
        id: 'ats-audit',
        title: 'ATS Audit',
        description: 'Check for parsing blockers and keyword coverage.',
      },
      {
        id: 'semantic-suitability',
        title: 'Semantic Suitability',
        description: 'Review how well the resume matches the role intent.',
      },
      {
        id: 'gap-analysis',
        title: 'Gap Analysis',
        description: 'Map missing requirements to evidence and recommendations.',
        default: true,
      },
    ],
  },
  {
    id: 'type-jsdoc',
    version: 1,
    title: 'Type & JSDoc Generator',
    description: 'Generate TypeScript types and JSDoc from source examples.',
    categoryId: 'developer',
    capabilities: {
      acceptsDocuments: true,
      supportsLocalExecution: true,
      supportsCloudExecution: true,
      supportsStreaming: true,
      supportsArtifacts: true,
    },
  },
  {
    id: 'schema-translator',
    version: 1,
    title: 'Schema Translator',
    description: 'Translate between SQL, Prisma, and Zod schema formats.',
    categoryId: 'developer',
    capabilities: {
      acceptsDocuments: true,
      supportsLocalExecution: true,
      supportsCloudExecution: true,
      supportsStreaming: true,
      supportsArtifacts: true,
    },
  },
  {
    id: 'regex-interpreter',
    version: 1,
    title: 'Regex Interpreter',
    description: 'Explain regex patterns or generate them from plain language.',
    categoryId: 'developer',
    capabilities: {
      acceptsDocuments: false,
      supportsLocalExecution: true,
      supportsCloudExecution: true,
      supportsStreaming: false,
      supportsArtifacts: true,
    },
  },
  {
    id: 'speech-studio',
    version: 1,
    title: 'Speech Studio',
    description: 'Browser-capable speech-to-text and text-to-speech workflows.',
    categoryId: 'audio',
    capabilities: {
      acceptsDocuments: true,
      supportsLocalExecution: true,
      supportsCloudExecution: true,
      supportsStreaming: true,
      supportsArtifacts: true,
    },
  },
] as const satisfies readonly ToolDefinition[]

export const TOOL_REGISTRY_BY_ID = Object.fromEntries(
  TOOL_REGISTRY.map((tool) => [tool.id, tool]),
) as Readonly<Record<ToolDefinition['id'], ToolDefinition>>
