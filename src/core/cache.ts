/** 二级缓存：进程内内存 + 本地 storage。storage 失败不影响内存命中。 */

import { readJson, writeJson } from './storage'

const memory = new Map<string, unknown>()

export function readCache<T>(key: string): T | null {
  if (memory.has(key)) {
    return memory.get(key) as T
  }

  const stored = readJson<T>(key)
  if (stored !== null) {
    memory.set(key, stored)
  }
  return stored
}

export function writeCache<T>(key: string, value: T): void {
  memory.set(key, value)
  writeJson(key, value)
}

export function peekCache<T>(key: string): T | null {
  return memory.has(key) ? (memory.get(key) as T) : null
}

export function dropCache(key: string): void {
  memory.delete(key)
}

export function clearMemoryCache(): void {
  memory.clear()
}
