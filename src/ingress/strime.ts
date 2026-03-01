import { Engine, StrimeParser } from '@laphilosophia/strime'
import chalk from 'chalk'
import * as fs from 'fs'
import * as readline from 'readline'
import type { Options } from '../types'

export class StrimeIngress {
  private engine?: Engine
  private sensitiveKeys: string[]

  constructor(sensitiveKeys: string) {
    this.sensitiveKeys = this.normalizeSensitiveKeys(sensitiveKeys)
    if (this.sensitiveKeys.length === 0) {
      throw new Error('No valid sensitive keys provided for Strime ingress')
    }
  }

  private normalizeSensitiveKeys(rawKeys: string): string[] {
    return rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .filter((k) => !k.startsWith('file:'))
  }

  private sanitizeProjectionKey(key: string): string | null {
    if (key.startsWith('/') && key.endsWith('/')) {
      return null
    }

    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : null
  }

  private buildProjectionQuery(): string {
    const projectionKeys = this.sensitiveKeys
      .map((key) => this.sanitizeProjectionKey(key))
      .filter((key): key is string => key !== null)

    if (projectionKeys.length === 0) {
      throw new Error('No valid keys available to build Strime projection query')
    }

    return '{ ' + projectionKeys.join(', ') + ' }'
  }

  processFile(inputPath: string, output: NodeJS.WritableStream, options: Options): void {
    const query = this.buildProjectionQuery()
    console.error(chalk.gray(`Strime projection: ${query}`))

    try {
      const parser = new StrimeParser(query)
      const schema = parser.parse()
      this.engine = new Engine(schema)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parser error'
      throw new Error(`Failed to initialize Strime engine: ${message}`)
    }

    const isNdjson = inputPath.endsWith('.ndjson') || inputPath.endsWith('.jsonl')

    if (isNdjson) {
      this.processNdjson(inputPath, output, options)
    } else {
      this.processSingleJsonChunked(inputPath, output, options)
    }
  }

  private processNdjson(inputPath: string, output: NodeJS.WritableStream, options: Options): void {
    const fileStream = fs.createReadStream(inputPath, { encoding: 'utf8' })
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    })

    let lineCount = 0
    let redactedCount = 0
    let errorCount = 0
    const startTime = Date.now()

    rl.on('line', (line) => {
      if (!line.trim()) return
      lineCount++

      try {
        const buffer = Buffer.from(line)
        const result = this.engine!.execute(buffer)

        if (options.dryRun) {
          output.write(line + '\n')
        } else {
          const masked = this.maskResult(result, options)
          redactedCount += this.countRedacted(masked)
          output.write(this.formatOutput(masked, options))
        }
      } catch {
        errorCount++
        if (!options.dryRun) {
          output.write(line + '\n')
        }
      }
    })

    rl.on('close', () => {
      if (options.stats) {
        const duration = Date.now() - startTime
        console.error(chalk.yellow('\n--- Statistics ---'))
        console.error(chalk.green(`Lines: ${lineCount}`))
        console.error(chalk.red(`Redacted: ${redactedCount}`))
        if (errorCount > 0) {
          console.error(chalk.red(`Errors: ${errorCount}`))
        }
        console.error(chalk.gray(`Duration: ${duration}ms`))
      }
    })
  }

  private processSingleJsonChunked(
    inputPath: string,
    output: NodeJS.WritableStream,
    options: Options,
  ): void {
    const startTime = Date.now()
    const stats = fs.statSync(inputPath)
    const fileSize = stats.size

    const fileStream = fs.createReadStream(inputPath, {
      encoding: 'utf8',
      highWaterMark: 64 * 1024,
    })

    let buffer = ''
    let lineCount = 0
    let redactedCount = 0
    let errorCount = 0

    fileStream.on('data', (chunk: string) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        if (line.trim() === '[' || line.trim() === ']') continue
        if (line.trim() === ',') continue

        lineCount++

        try {
          const cleanLine = line.replace(/^,/, '').trim()
          if (!cleanLine) continue

          const buffer2 = Buffer.from(cleanLine)
          const result = this.engine!.execute(buffer2)

          if (options.dryRun) {
            output.write(cleanLine + '\n')
          } else {
            const masked = this.maskResult(result, options)
            redactedCount += this.countRedacted(masked)
            output.write(this.formatOutput(masked, options))
          }
        } catch {
          errorCount++
        }
      }
    })

    fileStream.on('end', () => {
      if (buffer.trim()) {
        try {
          const cleanLine = buffer.replace(/^,/, '').trim()
          if (cleanLine) {
            const buffer2 = Buffer.from(cleanLine)
            const result = this.engine!.execute(buffer2)
            if (options.dryRun) {
              output.write(cleanLine + '\n')
            } else {
              const masked = this.maskResult(result, options)
              redactedCount += this.countRedacted(masked)
              output.write(this.formatOutput(masked, options))
            }
          }
        } catch {
          errorCount++
        }
      }

      if (options.stats) {
        const duration = Date.now() - startTime
        const throughput = (fileSize / 1024 / 1024 / (duration / 1000)).toFixed(2)
        console.error(chalk.yellow('\n--- Statistics ---'))
        console.error(chalk.green(`Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`))
        console.error(chalk.green(`Lines: ${lineCount}`))
        console.error(chalk.red(`Redacted: ${redactedCount}`))
        if (errorCount > 0) {
          console.error(chalk.red(`Errors: ${errorCount}`))
        }
        console.error(chalk.gray(`Duration: ${duration}ms (${throughput} MB/s)`))
      }
    })

    fileStream.on('error', (err) => {
      console.error(chalk.red(`File error: ${err.message}`))
    })
  }

  private maskResult(result: unknown, options: Options): unknown {
    if (result === null || result === undefined) {
      return result
    }

    return this.traverseAndMask(result, options)
  }

  private traverseAndMask(obj: unknown, options: Options): unknown {
    if (obj === null || obj === undefined) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.traverseAndMask(item, options))
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {}
      const objRecord = obj as Record<string, unknown>

      for (const key in objRecord) {
        if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
          const value = objRecord[key]
          const isSensitive = this.isSensitiveKey(key)

          if (isSensitive) {
            if (!options.remove) {
              result[key] = options.replacement
            }
          } else if (typeof value === 'object' && value !== null) {
            result[key] = this.traverseAndMask(value, options)
          } else {
            result[key] = value
          }
        }
      }
      return result
    }

    return obj
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase()
    return this.sensitiveKeys.some((sensitive) => {
      if (sensitive.startsWith('/') && sensitive.endsWith('/')) {
        const pattern = new RegExp(sensitive.slice(1, -1))
        pattern.lastIndex = 0
        return pattern.test(key)
      }
      return lowerKey.includes(sensitive.toLowerCase())
    })
  }

  private countRedacted(obj: unknown): number {
    if (obj === null || obj === undefined) {
      return 0
    }

    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.countRedacted(item), 0)
    }

    if (typeof obj === 'object') {
      let count = 0
      const objRecord = obj as Record<string, unknown>

      for (const key in objRecord) {
        if (this.isSensitiveKey(key)) {
          count++
        } else if (typeof objRecord[key] === 'object' && objRecord[key] !== null) {
          count += this.countRedacted(objRecord[key])
        }
      }
      return count
    }

    return 0
  }

  private formatOutput(data: unknown, options: Options): string {
    if (options.compact) {
      return JSON.stringify(data) + '\n'
    }
    return JSON.stringify(data, null, 2) + '\n'
  }
}

export const createStrimeIngress = (sensitiveKeys: string): StrimeIngress => {
  return new StrimeIngress(sensitiveKeys)
}
