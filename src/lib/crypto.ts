function base64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0))
}

function toBuffer(u8: Uint8Array): ArrayBuffer {
  return new Uint8Array(u8).buffer
}

export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return base64(toBuffer(salt))
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password).slice(), 'PBKDF2', false, ['deriveBits', 'deriveKey'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: toBuffer(fromBase64(salt)), iterations: 100000, hash: 'SHA-256' },
    key, 256,
  )
  return base64(bits as ArrayBuffer)
}

async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const pwKey = await crypto.subtle.importKey(
    'raw', enc.encode(password).slice(), 'PBKDF2', false, ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toBuffer(fromBase64(salt)), iterations: 100000, hash: 'SHA-256' },
    pwKey, { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'],
  )
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return base64(raw)
}

export async function importKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(b64).slice(), { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function wrapMasterKey(key: CryptoKey, password: string, salt: string): Promise<string> {
  const wrappingKey = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.wrapKey('raw', key, wrappingKey, { name: 'AES-GCM', iv: iv.slice() })
  return JSON.stringify({ iv: base64(toBuffer(iv)), wrapped: base64(wrapped) })
}

export async function unwrapMasterKey(wrappedStr: string, password: string, salt: string): Promise<CryptoKey> {
  const { iv, wrapped } = JSON.parse(wrappedStr)
  const unwrappingKey = await deriveKey(password, salt)
  return crypto.subtle.unwrapKey(
    'raw', fromBase64(wrapped).slice(), unwrappingKey,
    { name: 'AES-GCM', iv: fromBase64(iv).slice() },
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
  )
}

export async function encryptData(key: CryptoKey, data: string): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.slice() }, key, enc.encode(data).slice())
  return { iv: base64(toBuffer(iv)), ciphertext: base64(encrypted) }
}

export async function decryptData(key: CryptoKey, data: { iv: string; ciphertext: string }): Promise<string> {
  const iv = fromBase64(data.iv)
  const ct = fromBase64(data.ciphertext)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv.slice() }, key, ct.slice())
  return new TextDecoder().decode(decrypted)
}
