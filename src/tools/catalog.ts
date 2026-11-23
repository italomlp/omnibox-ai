import type { ToolDefinition } from './types'

/** Checked-in build-time inventory. See docs/plans/2026-11-23-tool-catalog.md. */
export const TOOL_CATALOG_DATA = [
  {
    "id": "grammar-tone",
    "version": 1,
    "title": "Grammar & Tone",
    "description": "Shared grammar correction and tone adjustment workflows.",
    "categoryId": "writing",
    "capabilities": {
      "acceptsDocuments": true,
      "supportsLocalExecution": true,
      "supportsCloudExecution": true,
      "supportsStreaming": true,
      "supportsArtifacts": false
    },
    "actions": [
      {
        "id": "grammar",
        "title": "Grammar",
        "description": "Correct spelling, grammar, punctuation, and syntax.",
        "default": true
      },
      {
        "id": "tone",
        "title": "Tone",
        "description": "Adjust tone while preserving meaning."
      }
    ],
    "enabled": true,
    "implementation": {
      "folder": "src/features/grammar",
      "entry": "src/features/grammar/GrammarWorkspace.tsx",
      "export": "GrammarWorkspace"
    },
    "quickStart": true,
    "legacyWorkspace": "grammar"
  },
  {
    "id": "career",
    "version": 1,
    "title": "Career Suite",
    "description": "Resume and job-fit diagnostics for candidate materials.",
    "categoryId": "career",
    "capabilities": {
      "acceptsDocuments": true,
      "supportsLocalExecution": true,
      "supportsCloudExecution": true,
      "supportsStreaming": true,
      "supportsArtifacts": false
    },
    "actions": [
      {
        "id": "ats-audit",
        "title": "ATS Audit",
        "description": "Check for parsing blockers and keyword coverage."
      },
      {
        "id": "semantic-suitability",
        "title": "Semantic Suitability",
        "description": "Review how well the resume matches the role intent."
      },
      {
        "id": "gap-analysis",
        "title": "Gap Analysis",
        "description": "Map missing requirements to evidence and recommendations.",
        "default": true
      }
    ],
    "enabled": true,
    "implementation": {
      "folder": "src/features/career",
      "entry": "src/features/career/CareerWorkspace.tsx",
      "export": "CareerWorkspace"
    },
    "quickStart": true,
    "legacyWorkspace": "career"
  },
  {
    "id": "type-jsdoc",
    "version": 1,
    "title": "Type & JSDoc Generator",
    "description": "Generate TypeScript types and JSDoc from source examples.",
    "categoryId": "developer",
    "capabilities": {
      "acceptsDocuments": true,
      "supportsLocalExecution": true,
      "supportsCloudExecution": true,
      "supportsStreaming": true,
      "supportsArtifacts": true
    },
    "enabled": true,
    "implementation": {
      "folder": "src/features/type-jsdoc",
      "entry": "src/features/type-jsdoc/TypeJsdocToolPage.tsx",
      "export": "TypeJsdocToolPage"
    },
    "quickStart": false,
    "actions": [
      {
        "id": "typescript-types",
        "title": "TypeScript Types",
        "description": "Generate TypeScript types."
      },
      {
        "id": "typescript-interfaces",
        "title": "TypeScript Interfaces",
        "description": "Generate TypeScript interfaces."
      },
      {
        "id": "jsdoc",
        "title": "JSDoc",
        "description": "Generate JSDoc annotations."
      }
    ]
  },
  {
    "id": "schema-translator",
    "version": 1,
    "title": "Schema Translator",
    "description": "Translate between SQL, Prisma, and Zod schema formats.",
    "categoryId": "developer",
    "capabilities": {
      "acceptsDocuments": true,
      "supportsLocalExecution": true,
      "supportsCloudExecution": true,
      "supportsStreaming": true,
      "supportsArtifacts": true
    },
    "enabled": true,
    "implementation": {
      "folder": "src/features/schema-translator",
      "entry": "src/features/schema-translator/SchemaTranslatorToolPage.tsx",
      "export": "SchemaTranslatorToolPage"
    },
    "quickStart": false,
    "actions": [
      {
        "id": "translate",
        "title": "Translate",
        "description": "Translate between supported schema formats."
      }
    ]
  },
  {
    "id": "regex-interpreter",
    "version": 1,
    "title": "Regex Interpreter",
    "description": "Explain regex patterns or generate them from plain language.",
    "categoryId": "developer",
    "capabilities": {
      "acceptsDocuments": false,
      "supportsLocalExecution": true,
      "supportsCloudExecution": true,
      "supportsStreaming": false,
      "supportsArtifacts": true
    },
    "enabled": true,
    "implementation": {
      "folder": "src/features/regex",
      "entry": "src/features/regex/RegexInterpreterToolPage.tsx",
      "export": "RegexInterpreterToolPage"
    },
    "quickStart": false,
    "actions": [
      {
        "id": "explain",
        "title": "Explain",
        "description": "Explain and test a regular expression."
      },
      {
        "id": "generate",
        "title": "Generate",
        "description": "Generate a regular expression from requirements."
      }
    ]
  },
  {
    "id": "speech-studio",
    "version": 1,
    "title": "Speech Studio",
    "description": "Browser-capable speech-to-text and text-to-speech workflows.",
    "categoryId": "audio",
    "capabilities": {
      "acceptsDocuments": true,
      "supportsLocalExecution": true,
      "supportsCloudExecution": true,
      "supportsStreaming": true,
      "supportsArtifacts": true
    },
    "enabled": true,
    "implementation": {
      "folder": "src/features/speech",
      "entry": "src/features/speech/SpeechStudioToolPage.tsx",
      "export": "SpeechStudioToolPage"
    },
    "quickStart": false,
    "actions": [
      {
        "id": "transcription",
        "title": "Transcription",
        "description": "Transcribe microphone audio locally or with browser recognition."
      },
      {
        "id": "synthesis",
        "title": "Speech synthesis",
        "description": "Speak text with a browser voice."
      },
      {
        "id": "cleanup",
        "title": "Transcript cleanup",
        "description": "Clean up a transcript with inference."
      }
    ]
  }
] as const satisfies readonly ToolDefinition[]
