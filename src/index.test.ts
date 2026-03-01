import { describe, it, expect, beforeEach } from 'vitest'
import { Masker } from './masker'
import { Stats } from './stats'
import type { JsonObject, JsonValue } from './types'

const DEFAULT_KEYS = 'password,token,secret,key,auth,credit_card,cvv,authorization'

describe('Masker', () => {
  let masker: Masker

  beforeEach(() => {
    masker = new Masker({
      sensitiveKeys: DEFAULT_KEYS,
      replacement: '***** [REDACTED] *****',
      remove: false,
    })
  })

  it('should redact password field', () => {
    const input: JsonObject = { username: 'john', password: 'secret123' }
    const result = masker.mask(input) as JsonObject
    expect(result.password).toBe('***** [REDACTED] *****')
    expect(result.username).toBe('john')
  })

  it('should redact nested sensitive fields', () => {
    const input: JsonObject = { user: { name: 'john', password: 'secret' } }
    const result = masker.mask(input) as JsonObject
    expect((result.user as JsonObject).password).toBe('***** [REDACTED] *****')
    expect((result.user as JsonObject).name).toBe('john')
  })

  it('should redact fields in arrays', () => {
    const input: JsonObject = { users: [{ name: 'john', password: 'secret1' }, { name: 'jane', password: 'secret2' }] }
    const result = masker.mask(input) as JsonObject
    const users = result.users as JsonValue[]
    expect((users[0] as JsonObject).password).toBe('***** [REDACTED] *****')
    expect((users[1] as JsonObject).password).toBe('***** [REDACTED] *****')
  })

  it('should handle case-insensitive key matching', () => {
    const input: JsonObject = { PASSWORD: 'secret', Password: 'secret', password: 'secret' }
    const result = masker.mask(input) as JsonObject
    expect(result.PASSWORD).toBe('***** [REDACTED] *****')
    expect(result.Password).toBe('***** [REDACTED] *****')
    expect(result.password).toBe('***** [REDACTED] *****')
  })

  it('should not redact non-sensitive fields', () => {
    const input: JsonObject = { name: 'john', email: 'john@example.com', age: 25, active: true }
    const result = masker.mask(input) as JsonObject
    expect(result.name).toBe('john')
    expect(result.email).toBe('john@example.com')
    expect(result.age).toBe(25)
    expect(result.active).toBe(true)
  })

  it('should handle partial key matches', () => {
    const input: JsonObject = { api_key: 'secret', my_password: 'secret', token: 'secret' }
    const result = masker.mask(input) as JsonObject
    expect(result.api_key).toBe('***** [REDACTED] *****')
    expect(result.my_password).toBe('***** [REDACTED] *****')
    expect(result.token).toBe('***** [REDACTED] *****')
  })

  it('should handle null values', () => {
    const input: JsonObject = { name: null, active: false }
    const result = masker.mask(input) as JsonObject
    expect(result.name).toBe(null)
    expect(result.active).toBe(false)
  })

  it('should handle empty objects', () => {
    const input: JsonObject = {}
    const result = masker.mask(input)
    expect(result).toEqual({})
  })

  it('should handle non-object values', () => {
    expect(masker.mask('string')).toBe('string')
    expect(masker.mask(123)).toBe(123)
    expect(masker.mask(true)).toBe(true)
  })

  it('should remove fields when remove option is true', () => {
    const remover = new Masker({
      sensitiveKeys: DEFAULT_KEYS,
      replacement: '',
      remove: true,
    })
    const input: JsonObject = { name: 'john', password: 'secret' }
    const result = remover.mask(input) as JsonObject
    expect(result.password).toBeUndefined()
    expect(result.name).toBe('john')
  })

  it('should count redacted fields', () => {
    const input: JsonObject = { password: 'secret', token: 'abc' }
    masker.mask(input)
    expect(masker.getRedactedCount()).toBe(2)
  })

  it('should mask string without parsing JSON', () => {
    const result = masker.maskString('{"name":"john","password":"secret"}')
    expect(result).toContain('"password":"***** [REDACTED] *****"')
    expect(result).toContain('"name":"john"')
  })
})

describe('Stats', () => {
  it('should track total', () => {
    const stats = new Stats(false)
    stats.incrementTotal()
    stats.incrementTotal()
    expect(stats.total).toBe(2)
  })

  it('should track redacted count', () => {
    const stats = new Stats(false)
    stats.incrementRedacted(3)
    expect(stats.redacted).toBe(3)
  })

  it('should track errors', () => {
    const stats = new Stats(false)
    stats.incrementErrors()
    expect(stats.errors).toBe(1)
  })

  it('should get stats object', () => {
    const stats = new Stats(false)
    stats.incrementTotal()
    stats.incrementRedacted(2)
    stats.incrementErrors()
    expect(stats.getStats()).toEqual({ total: 1, redacted: 2, errors: 1 })
  })
})
