import { program } from 'commander'
import pkg from '../package.json'
import { DEFAULT_KEYS } from './constants'
import type { Options } from './types'
import { loadConfigSync } from './utils'

const config = loadConfigSync()

program
  .name('log-scrub')
  .description('Sanitize and beautify JSON logs from stdin.')
  .option(
    '-k, --keys <list>',
    'Comma separated keys to redact (use /regex/ for regex patterns, file:path for external file)',
    config.keys || DEFAULT_KEYS,
  )
  .option(
    '-r, --replacement <text>',
    'Replacement text',
    config.replacement || '***** [REDACTED] *****',
  )
  .option('-c, --compact', 'Compact JSON output (no pretty print)', config.compact || false)
  .option('-d, --dry-run', 'Show output without redaction', false)
  .option('-s, --stats', 'Show processing statistics', false)
  .option('-R, --remove', 'Remove sensitive fields completely instead of masking', false)
  .option(
    '-S, --strime',
    'Use Strime engine for ingress layer (recommended for large files)',
    false,
  )
  .option(
    '--color',
    'Enable colored output (requires json-colorizer, disabled by default for performance)',
    false,
  )
  .argument('[file]', 'Input file (if not provided, reads from stdin)')
  .version(pkg.version)
  .parse()

export const opts = program.opts<Options>()
export const inputFile = program.args[0]
