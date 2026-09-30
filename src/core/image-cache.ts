/**
 * 封面图本地文件缓存。
 *
 * 远端图片每次都走网络既慢又费流量，这里把下载成功的图片存到小程序本地文件系统，
 * 索引（原始地址 -> 本地路径）落在 storage 里，按 LRU 保留最近使用的若干张。
 * 任何一步失败都退回远程地址，不阻塞渲染。
 */

import { canonicalImageKey, imageMirrorCandidates } from './image'
import { readJson, writeJson } from './storage'

const STORAGE_KEY = 'lp_image_files_v1'
const MAX_ENTRIES = 80
const DOWNLOAD_TIMEOUT = 60 * 1000

interface CacheRecord {
  path: string
  savedAt: number
  usedAt: number
}

const memory = new Map<string, CacheRecord>()
const pending = new Map<string, Promise<string>>()
let indexLoaded = false

function loadIndex(): void {
  if (indexLoaded) return
  indexLoaded = true

  const stored = readJson<Record<string, CacheRecord>>(STORAGE_KEY)
  if (!stored || typeof stored !== 'object') return

  Object.keys(stored).forEach((key) => {
    const record = stored[key]
    if (record && typeof record.path === 'string' && record.path) {
      memory.set(key, {
        path: record.path,
        savedAt: typeof record.savedAt === 'number' ? record.savedAt : 0,
        usedAt: typeof record.usedAt === 'number' ? record.usedAt : 0,
      })
    }
  })
}

function persist(): void {
  const output: Record<string, CacheRecord> = {}
  memory.forEach((record, key) => {
    output[key] = record
  })
  writeJson(STORAGE_KEY, output)
}

function isRemote(url: string): boolean {
  return typeof url === 'string' && /^https?:\/\//.test(url)
}

/** 同步取本地路径，取不到返回空串（调用方自行回退远程地址） */
export function getCachedImageSync(url: string): string {
  if (!isRemote(url)) return url || ''
  loadIndex()

  const key = canonicalImageKey(url)
  const record = memory.get(key)
  if (!record) return ''

  record.usedAt = Date.now()
  return record.path
}

function fileExists(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const manager = wx.getFileSystemManager()
      manager.getFileInfo({
        filePath,
        success: () => resolve(true),
        fail: () => resolve(false),
      })
    } catch (error) {
      resolve(false)
    }
  })
}

function download(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      timeout: DOWNLOAD_TIMEOUT,
      success: (result: { statusCode: number; tempFilePath: string }) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) {
          resolve(result.tempFilePath)
          return
        }
        reject(new Error(`图片下载失败 ${result.statusCode}`))
      },
      fail: (error: unknown) => reject(error),
    })
  })
}

function saveFile(tempFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().saveFile({
      tempFilePath,
      success: (result: { savedFilePath: string }) => resolve(result.savedFilePath),
      fail: (error: unknown) => reject(error),
    })
  })
}

function removeSavedFile(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve()
      return
    }
    try {
      wx.getFileSystemManager().removeSavedFile({
        filePath,
        complete: () => resolve(),
      })
    } catch (error) {
      resolve()
    }
  })
}

async function prune(): Promise<void> {
  if (memory.size <= MAX_ENTRIES) return

  const entries = Array.from(memory.entries()).sort((left, right) => {
    const leftTime = left[1].usedAt || left[1].savedAt
    const rightTime = right[1].usedAt || right[1].savedAt
    return leftTime - rightTime
  })

  while (entries.length && memory.size > MAX_ENTRIES) {
    const entry = entries.shift()
    if (!entry) break
    memory.delete(entry[0])
    await removeSavedFile(entry[1].path)
  }
  persist()
}

/** 缓存单张图片，返回可直接用于 image src 的地址（失败时原样返回远程地址） */
export function cacheImage(url: string): Promise<string> {
  if (!isRemote(url)) return Promise.resolve(url || '')
  loadIndex()

  const key = canonicalImageKey(url)
  const running = pending.get(key)
  if (running) return running

  const task = (async (): Promise<string> => {
    const current = memory.get(key)
    if (current && (await fileExists(current.path))) {
      current.usedAt = Date.now()
      persist()
      return current.path
    }
    if (current) memory.delete(key)

    const candidates = imageMirrorCandidates(url)
    for (const candidate of candidates) {
      try {
        const temp = await download(candidate)
        const saved = await saveFile(temp)
        memory.set(key, { path: saved, savedAt: Date.now(), usedAt: Date.now() })
        persist()
        await prune()
        return saved
      } catch (error) {
        // 换下一个镜像继续尝试
      }
    }

    throw new Error('图片缓存失败')
  })()
    .catch(() => url)
    .then((result) => {
      pending.delete(key)
      return result
    })

  pending.set(key, task)
  return task
}

/** 批量缓存，返回「原始地址 -> 可展示地址」的映射 */
export async function cacheImageBatch(urls: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set((urls || []).filter(Boolean)))
  const pairs = await Promise.all(
    unique.map(async (url) => [url, await cacheImage(url)] as [string, string])
  )

  const output: Record<string, string> = {}
  pairs.forEach((pair) => {
    output[pair[0]] = pair[1]
  })
  return output
}

/** 清空本地图片缓存（「我的」页可挂一个入口） */
export async function clearImageCache(): Promise<void> {
  loadIndex()
  const paths = Array.from(memory.values()).map((record) => record.path)
  memory.clear()
  pending.clear()
  persist()
  await Promise.all(paths.map((filePath) => removeSavedFile(filePath)))
}
