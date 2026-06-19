import { describe, it, expect } from 'vitest'
import { generateSalt, hashPassword, generateKey, encryptData, decryptData, exportKey, importKey, wrapMasterKey, unwrapMasterKey } from './crypto'

describe('crypto', () => {
  it('generateSalt returns 24-char base64 string', async () => {
    const salt = await generateSalt()
    expect(salt).toBeTypeOf('string')
    expect(salt.length).toBe(24)
  })

  it('hashPassword returns consistent results', async () => {
    const salt = await generateSalt()
    const pw = 'test1234'
    const h1 = await hashPassword(pw, salt)
    const h2 = await hashPassword(pw, salt)
    expect(h1).toBe(h2)
    expect(h1).toBeTypeOf('string')
    expect(h1.length).toBe(44)
  })

  it('hashPassword with different salt gives different hash', async () => {
    const s1 = await generateSalt()
    const s2 = await generateSalt()
    const h1 = await hashPassword('test', s1)
    const h2 = await hashPassword('test', s2)
    expect(h1).not.toBe(h2)
  })

  it('generateKey creates extractable AES-256-GCM key', async () => {
    const key = await generateKey()
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
    expect(key.extractable).toBe(true)
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('exportKey + importKey roundtrip', async () => {
    const key = await generateKey()
    const b64 = await exportKey(key)
    expect(b64).toBeTypeOf('string')
    const restored = await importKey(b64)
    expect(restored.type).toBe('secret')
  })

  it('encryptData + decryptData roundtrip', async () => {
    const key = await generateKey()
    const plain = 'hello world test data'
    const encrypted = await encryptData(key, plain)
    expect(encrypted.iv).toBeTypeOf('string')
    expect(encrypted.ciphertext).toBeTypeOf('string')
    const decrypted = await decryptData(key, encrypted)
    expect(decrypted).toBe(plain)
  })

  it('decryptData with wrong key fails', async () => {
    const key1 = await generateKey()
    const key2 = await generateKey()
    const encrypted = await encryptData(key1, 'secret')
    await expect(decryptData(key2, encrypted)).rejects.toThrow()
  })

  it('wrapMasterKey + unwrapMasterKey roundtrip', async () => {
    const key = await generateKey()
    const salt = await generateSalt()
    const wrapped = await wrapMasterKey(key, 'mypassword', salt)
    const unwrapped = await unwrapMasterKey(wrapped, 'mypassword', salt)
    expect(unwrapped.type).toBe('secret')
  })

  it('unwrapMasterKey with wrong password fails', async () => {
    const key = await generateKey()
    const salt = await generateSalt()
    const wrapped = await wrapMasterKey(key, 'correct', salt)
    await expect(unwrapMasterKey(wrapped, 'wrong', salt)).rejects.toThrow()
  })

  it('encryptData with unicode content', async () => {
    const key = await generateKey()
    const plain = 'Héllo Wörld 你好 🎉'
    const encrypted = await encryptData(key, plain)
    const decrypted = await decryptData(key, encrypted)
    expect(decrypted).toBe(plain)
  })
})
