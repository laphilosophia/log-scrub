import * as fs from 'fs'
import * as path from 'path'
import type { JsonValue } from '../types'

type SensitivePattern =
  | {
      type: 'string'
      value: string
      regex: RegExp
    }
  | {
      type: 'regex'
      value: RegExp
      regex: RegExp
    }

export interface MaskerOptions {
  sensitiveKeys: string
  replacement: string
  remove: boolean
}

export class Masker {
  private patterns: SensitivePattern[]
  private replacement: string
  private remove: boolean
  private redactedCount = 0

  constructor(options: MaskerOptions) {
    this.patterns = this.parseKeys(options.sensitiveKeys)
    if (this.patterns.length === 0) {
      throw new Error('No sensitive key patterns could be loaded')
    }
    this.replacement = options.replacement
    this.remove = options.remove
  }

  private parseKeys(keysString: string): SensitivePattern[] {
    const fileMatch = keysString.match(/^file:(.+)$/)
    if (fileMatch) {
      return this.loadKeysFromFile(fileMatch[1].trim())
    }

    return keysString.split(',').map((k) => this.parseKey(k.trim()))
  }

  private loadKeysFromFile(filePath: string): SensitivePattern[] {
    const resolvedPath = path.resolve(filePath)

    let content: string

    try {
      content = fs.readFileSync(resolvedPath, 'utf-8')
    } catch {
      throw new Error(`Failed to read sensitive key file: ${resolvedPath}`)
    }

    const patterns = content
      .split('\n')
      .filter((line: string) => line.trim() !== '')
      .map((line: string) => this.parseKey(line.trim()))

    if (patterns.length === 0) {
      throw new Error(`Sensitive key file is empty: ${resolvedPath}`)
    }

    return patterns
  }

  private parseKey(key: string): SensitivePattern {
    const regexMatch = key.match(/^\/(.+)\/([gimsuy]*)$/)
    if (regexMatch) {
      const regex = new RegExp(regexMatch[1], regexMatch[2])
      return { type: 'regex', value: regex, regex }
    }

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`("${escapedKey}"\\s*:\\s*)("[^"]*"|[^,\\s][^,}]*)`, 'gi')
    return { type: 'string', value: key.toLowerCase(), regex }
  }

  maskString(line: string): string {
    this.redactedCount = 0

    if (this.remove) {
      return this.removeSensitiveFieldsFromJson(line)
    }

    let result = line

    for (const pattern of this.patterns) {
      result = result.replace(pattern.regex, (_match, prefix) => {
        this.redactedCount++
        return `${prefix}"${this.replacement}"`
      })
    }

    return result
  }

  private removeSensitiveFieldsFromJson(line: string): string {
    try {
      const parsed = JSON.parse(line) as JsonValue
      const masked = this.mask(parsed)
      return JSON.stringify(masked)
    } catch {
      return line
    }
  }

  mask(obj: JsonValue): JsonValue {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.mask(item))
    }

    if (typeof obj === 'object') {
      const newObj: Record<string, JsonValue> = {}
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key]
          const lowerKey = key.toLowerCase()
          const isSensitive = this.patterns.some((p) => {
            if (p.type === 'regex') {
              p.value.lastIndex = 0
              return p.value.test(key)
            }
            return lowerKey.includes(p.value)
          })

          if (isSensitive) {
            if (this.remove) {
              continue
            }
            newObj[key] = this.replacement
            this.redactedCount++
          } else if (typeof value === 'object' && value !== null) {
            newObj[key] = this.mask(value)
          } else {
            newObj[key] = value
          }
        }
      }
      return newObj
    }

    return obj
  }

  getRedactedCount(): number {
    return this.redactedCount
  }

  resetCount(): void {
    this.redactedCount = 0
  }
}
