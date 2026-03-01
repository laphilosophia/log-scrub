#!/usr/bin/env node
import { opts, inputFile } from './cli'
import { StrimeIngress } from './ingress/strime'
import chalk from 'chalk'

if (opts.strime && inputFile) {
  const ingress = new StrimeIngress(opts.keys)
  ingress.processFile(inputFile, process.stdout, opts)
} else if (opts.strime) {
  console.error(chalk.red('Error: --strime requires an input file'))
  console.error(chalk.gray('Usage: log-scrub --strime <file> [options]'))
  process.exit(1)
} else {
  require('./index-stdin')
}
