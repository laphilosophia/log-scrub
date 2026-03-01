export interface Options {
  keys: string
  replacement: string
  compact: boolean
  dryRun: boolean
  stats: boolean
  remove: boolean
  strime: boolean
  color: boolean
}

export interface Config {
  keys?: string
  replacement?: string
  compact?: boolean
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

export interface JsonObject {
  [key: string]: JsonValue
}

export interface ProcessedStats {
  total: number
  redacted: number
  errors: number
}
