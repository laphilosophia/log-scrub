#!/usr/bin/env node
import chalk from 'chalk';
import { program } from 'commander';
import split from 'split2';
import { pipeline } from 'stream';

program
  .name('log-scrub')
  .description('Sanitize and beautify JSON logs from stdin.')
  .option('-k, --keys <list>', 'Comma separated keys to redact', 'password,token,secret,key,auth,credit_card,cvv,authorization')
  .option('-r, --replacement <text>', 'Replacement text', '***** [REDACTED] *****')
  .option('-c, --compact', 'Compact JSON output (no pretty print)', false)
  .version('1.0.0')
  .parse();

const opts = program.opts();
const SENSITIVE_KEYS = opts.keys.split(',').map((k: string) => k.trim().toLowerCase());
const REPLACEMENT = opts.replacement;
const COMPACT = opts.compact;

const maskSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const newObj: any = {};
  for (const key in obj) {
    const value = obj[key];
    const lowerKey = key.toLowerCase();

    const isSensitive = SENSITIVE_KEYS.some((sensitive: string) => lowerKey.includes(sensitive));

    if (isSensitive) {
      newObj[key] = chalk.red(REPLACEMENT);
    } else if (typeof value === 'object') {
      newObj[key] = maskSensitiveData(value);
    } else {
      newObj[key] = value;
    }
  }
  return newObj;
};

const processor = split((line) => {
  try {
    const json = JSON.parse(line);
    const cleaned = maskSensitiveData(json);
    let output;
    if (COMPACT) {
      output = JSON.stringify(cleaned);
    } else {
      output = JSON.stringify(cleaned, null, 2)
        .replace(/"([^"]+)":/g, chalk.cyan('"$1":'))
        .replace(/: "([^"]+)"/g, `: ${chalk.green('"$1"')}`)
        .replace(/: (true|false)/g, `: ${chalk.yellow('$1')}`)
        .replace(/: ([0-9]+)/g, `: ${chalk.blue('$1')}`);
    }

    return output + '\n';
  } catch (e) {
    return chalk.gray(line) + '\n';
  }
});
pipeline(
  process.stdin,
  processor,
  process.stdout,
  (err) => {
    if (err) {
      if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') return;
      console.error('Stream Error:', err);
    }
  }
);
