import Dexie, { type Table } from 'dexie'

export interface HistoryItem {
  id?: number;
  workspaceId: string;
  toolId: string;
  timestamp: number;
  input: string | any; // Can be a string or a serialized payload (e.g., resume + job description)
  output: string;
  provider: string;
  model: string;
}

export interface DocumentItem {
  id?: number;
  name: string;
  content: string;
  timestamp: number;
}

export class OmniBoxDB extends Dexie {
  history!: Table<HistoryItem>
  documents!: Table<DocumentItem>

  constructor() {
    super('OmniBoxDB')
    this.version(1).stores({
      history: '++id, workspaceId, toolId, timestamp',
      documents: '++id, name, timestamp',
    })
  }
}

export const db = new OmniBoxDB()
