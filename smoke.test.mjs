#!/usr/bin/env node
import { spawn } from 'child_process'
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const FIXTURE_DIR = join(__dirname, 'fixtures')

const runScrub = (args, input) => {
  return new Promise((resolve) => {
    const proc = spawn('node', ['dist/index.js', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => (stdout += data.toString()))
    proc.stderr.on('data', (data) => (stderr += data.toString()))

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 })
    })

    proc.stdin.write(input)
    proc.stdin.end()
  })
}

const runScrubFile = (args) => {
  return new Promise((resolve) => {
    const proc = spawn('node', ['dist/index.js', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => (stdout += data.toString()))
    proc.stderr.on('data', (data) => (stderr += data.toString()))

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 })
    })

    proc.stdin.end()
  })
}

const setupFixtures = () => {
  if (!existsSync(FIXTURE_DIR)) {
    mkdirSync(FIXTURE_DIR, { recursive: true })
  }

  const ndjsonInput = [
    '{"id":1,"name":"john","password":"secret123","email":"john@example.com"}',
    '{"id":2,"name":"jane","token":"abc-xyz","api_key":"key123"}',
    '{"id":3,"name":"bob","auth":"Bearer xyz","secret":"hidden"}',
  ].join('\n')

  const singleJsonInput = JSON.stringify({
    users: [
      { name: 'john', password: 'secret', token: 'tok123' },
      { name: 'jane', api_key: 'key456', credit_card: '1234567890123456' },
    ],
  })

  writeFileSync(join(FIXTURE_DIR, 'ndjson.jsonl'), ndjsonInput)
  writeFileSync(join(FIXTURE_DIR, 'single.json'), singleJsonInput)
}

const cleanup = () => {
  if (existsSync(FIXTURE_DIR)) {
    rmSync(FIXTURE_DIR, { recursive: true })
  }
}

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

const runTests = async () => {
  console.log('🧪 Running smoke tests...\n')

  setupFixtures()

  try {
    console.log('--- Test 1: STDIN mode (basic) ---')
    const input1 = '{"name":"john","password":"secret"}\n'
    const result1 = await runScrub([], input1)
    assert(result1.code === 0, 'Exit code should be 0')
    assert(result1.stdout.includes('***** [REDACTED] *****'), 'Should redact password')
    assert(!result1.stdout.includes('secret'), 'Should not contain raw secret')

    console.log('\n--- Test 2: STDIN + --compact ---')
    const result2 = await runScrub(['-c'], input1)
    assert(result2.code === 0, 'Exit code should be 0')
    assert(result2.stdout.includes('{"name":"john","password":"'), 'Should be compact')

    console.log('\n--- Test 3: STDIN + --remove ---')
    const result3 = await runScrub(['-R'], input1)
    assert(result3.code === 0, 'Exit code should be 0')
    const parsed3 = JSON.parse(result3.stdout.trim())
    assert(parsed3.password === undefined, 'Password field should be removed')
    assert(parsed3.name === 'john', 'Name should remain')

    console.log('\n--- Test 4: STDIN + --color ---')
    const result4 = await runScrub(['--color'], input1)
    assert(result4.code === 0, 'Exit code should be 0')
    assert(result4.stdout.includes('\x1b['), 'Should contain ANSI color codes')

    console.log('\n--- Test 5: STDIN + --dry-run ---')
    const result5 = await runScrub(['-d'], input1)
    assert(result5.code === 0, 'Exit code should be 0')
    assert(result5.stdout.includes('secret'), 'Dry-run should not redact')

    console.log('\n--- Test 6: STDIN + --stats ---')
    const result6 = await runScrub(['-s'], input1)
    assert(result6.code === 0, 'Exit code should be 0')
    assert(result6.stderr.includes('Statistics'), 'Should show statistics')
    assert(result6.stderr.includes('Redacted fields:') || result6.stderr.includes('Redacted:'), 'Should show redacted count')

    console.log('\n--- Test 7: --strime with file (NDJSON) ---')
    const result7 = await runScrubFile([
      '--strime',
      join(FIXTURE_DIR, 'ndjson.jsonl'),
      '-c',
    ])
    assert(result7.code === 0, 'Exit code should be 0')
    assert(result7.stdout.includes('password'), 'Should contain password field')
    assert(result7.stdout.includes('***** [REDACTED] *****'), 'Should redact password')

    console.log('\n--- Test 8: --strime with file (single JSON) ---')
    const result8 = await runScrubFile([
      '--strime',
      join(FIXTURE_DIR, 'single.json'),
      '-c',
    ])
    assert(result8.code === 0, 'Exit code should be 0')
    const parsed8 = JSON.parse(result8.stdout.trim())
    assert(parsed8 && typeof parsed8 === 'object', 'Should output valid JSON object')

    console.log('\n--- Test 9: --strime + --remove ---')
    const result9 = await runScrubFile([
      '--strime',
      join(FIXTURE_DIR, 'ndjson.jsonl'),
      '-c',
      '-R',
    ])
    assert(result9.code === 0, 'Exit code should be 0')
    const lines9 = result9.stdout.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    assert(lines9[0].password === undefined, 'Password should be removed')

    console.log('\n--- Test 10: --strime + --stats ---')
    const result10 = await runScrubFile([
      '--strime',
      join(FIXTURE_DIR, 'ndjson.jsonl'),
      '-s',
    ])
    assert(result10.code === 0, 'Exit code should be 0')
    assert(result10.stderr.includes('Statistics'), 'Should show statistics')

    console.log('\n--- Test 11: Invalid key file ---')
    const result11 = await runScrub(['-k', 'file:nonexistent.keys'], '{"a":"b"}')
    assert(result11.code !== 0, 'Should fail with invalid key file')
    assert(result11.stderr.includes('Failed to read'), 'Should show file error')

    console.log('\n--- Test 12: Empty input ---')
    const result12 = await runScrub([], '')
    assert(result12.code === 0, 'Should handle empty input gracefully')

    console.log('\n========================================')
    console.log('🎉 All smoke tests passed!')
    console.log('========================================\n')
  } catch (error) {
    console.error('\n❌ Smoke test failed:', error)
    process.exit(1)
  } finally {
    cleanup()
  }
}

runTests()
