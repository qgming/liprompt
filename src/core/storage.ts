/** storage 读写的安全包装：任何异常都不应让页面崩溃 */

import { MAX_CACHE_BYTES } from './config'

export function readJson<T>(key: string): T | null {
  try {
    const raw = wx.getStorageSync(key)
    if (raw === '' || raw === null || raw === undefined) return null
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
  } catch (error) {
    return null
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value)
    if (serialized.length > MAX_CACHE_BYTES) {
      // 超大的缓存宁可不落盘，也不能把 storage 写满
      return false
    }
    wx.setStorageSync(key, serialized)
    return true
  } catch (error) {
    return false
  }
}

export function readString(key: string): string {
  try {
    const raw = wx.getStorageSync(key)
    return typeof raw === 'string' ? raw : ''
  } catch (error) {
    return ''
  }
}

export function writeString(key: string, value: string): void {
  try {
    wx.setStorageSync(key, value)
  } catch (error) {
    // 忽略
  }
}

export function remove(key: string): void {
  try {
    wx.removeStorageSync(key)
  } catch (error) {
    // 忽略
  }
}
