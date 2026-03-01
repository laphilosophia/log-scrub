import chalk from 'chalk'
import type { ProcessedStats } from './types'

export class Stats implements ProcessedStats {
  total = 0
  redacted = 0
  errors = 0
  private enabled: boolean

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  incrementTotal(): void {
    this.total++
  }

  incrementRedacted(count = 1): void {
    this.redacted += count
  }

  incrementErrors(): void {
    this.errors++
  }

  getStats(): ProcessedStats {
    return {
      total: this.total,
      redacted: this.redacted,
      errors: this.errors,
    }
  }

  print(): void {
    if (!this.enabled) return

    console.error(chalk.yellow('\n--- Statistics ---'))
    console.error(chalk.green(`Total lines: ${this.total}`))
    console.error(chalk.red(`Redacted fields: ${this.redacted}`))
    if (this.errors > 0) {
      console.error(chalk.red(`Parse errors: ${this.errors}`))
    }
  }
}
