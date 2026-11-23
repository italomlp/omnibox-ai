import type { Plugin } from 'vite'
export function toolCatalogPlugin(): Plugin
export function validateCatalog(catalog: unknown, root?: string): unknown
export function generateToolLoaders(catalog: unknown[]): string
export function findDisabledModules(catalog: unknown[], moduleIds: string[], root?: string): string[]
