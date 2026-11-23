declare module 'virtual:tool-loaders' {
  import type { ComponentType } from 'react'
  export const toolLoaders: Readonly<Record<string, () => Promise<{ default: ComponentType }>>>
}
