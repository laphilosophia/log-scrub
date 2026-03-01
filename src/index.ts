#!/usr/bin/env node
import chalk from 'chalk'
import { inputFile, opts } from './cli'
import { StrimeIngress } from './ingress/strime'

if (opts.strime && inputFile) {
  try {
    const ingress = new StrimeIngress(opts.keys)
    ingress.processFile(inputFile, process.stdout, opts)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Strime error'
    console.error(chalk.red(`Error: ${message}`))
    process.exit(1)
  }
} else if (opts.strime) {
  console.error(chalk.red('Error: --strime requires an input file'))
  console.error(chalk.gray('Usage: log-scrub --strime <file> [options]'))
  process.exit(1)
} else {
  require('./index-stdin')
}
