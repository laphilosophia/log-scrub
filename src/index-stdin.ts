#!/usr/bin/env node
import chalk from 'chalk'
import split from 'split2'
import { pipeline } from 'stream'
import { opts } from './cli'
import { Masker } from './masker'
import { Stats } from './stats'

const masker = new Masker({
  sensitiveKeys: opts.keys,
  replacement: opts.replacement,
  remove: opts.remove,
})
const stats = new Stats(opts.stats)

const processLine = (line: string): string => {
  try {
    stats.incrementTotal()

    if (opts.dryRun) {
      return line + '\n'
    }

    const masked = masker.maskString(line)
    stats.incrementRedacted(masker.getRedactedCount())

    if (opts.compact) {
      return masked + '\n'
    }

    try {
      const parsed = JSON.parse(masked)
      return JSON.stringify(parsed, null, 2) + '\n'
    } catch {
      return masked + '\n'
    }
  } catch (e) {
    stats.incrementErrors()
    if (e instanceof SyntaxError) {
      return chalk.gray(line) + '\n'
    }
    console.error(chalk.red(`Error processing line: ${line}`))
    return ''
  }
}

const processor = split(processLine)

const isStreamError = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error
}

pipeline(process.stdin, processor, process.stdout, (err?: Error | null) => {
  if (err) {
    if (isStreamError(err) && err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      stats.print()
      return
    }
    console.error(chalk.red('Stream Error:'), err.message)
  }
  stats.print()
})
