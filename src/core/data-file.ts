/**
 * 整包正文的本地文件缓存。
 *
 * 为什么不复用 storage：微信 storage 单个 key 上限 1MB，而文本整包正文约 1.2MB、
 * 加上 JSON 转义会更大，writeJson 会直接拒绝落盘（见 storage.ts 的 MAX_CACHE_BYTES）。
 * 文件系统配额 200MB，且 core/image-cache.ts 已经在用同一套 API，这里沿用相同思路。
 *
 * 只负责「读写一个 JSON 文件」，业务语义交给调用方；任何失败都返回空值让调用方回退网络。
 */

import { DATA_CACHE_DIR } from './config'

function filePath(type: string): string {
  return `${wx.env.USER_DATA_PATH}/${DATA_CACHE_DIR}/${type}-detail.json`
}

function ensureDir(): void {
  const manager = wx.getFileSystemManager()
  const dir = `${wx.env.USER_DATA_PATH}/${DATA_CACHE_DIR}`
  try {
    manager.accessSync(dir)
  } catch (error) {
    manager.mkdirSync(dir, true)
  }
}

/**
 * 同步读正文表。返回 null 表示没有可用缓存（文件不存在 / 损坏 / 宿主不支持），
 * 调用方必须自行回退到网络，不能把它当成「数据为空」。
 */
export function readDetailSync<T>(type: string): Record<string, T> | null {
  try {
    const raw = wx.getFileSystemManager().readFileSync(filePath(type), 'utf8')
    if (typeof raw !== 'string' || !raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, T>
  } catch (error) {
    return null
  }
}

/** 写入正文表；失败静默（写不上只是下次仍走网络，不影响本次功能） */
export function writeDetail(type: string, value: unknown): void {
  try {
    ensureDir()
    wx.getFileSystemManager().writeFileSync(filePath(type), JSON.stringify(value), 'utf8')
  } catch (error) {
    // 忽略
  }
}

export function removeDetail(type: string): void {
  try {
    wx.getFileSystemManager().unlinkSync(filePath(type))
  } catch (error) {
    // 忽略
  }
}
