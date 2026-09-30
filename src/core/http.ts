/** 网络请求：Promise 化 + 多源回退 */

import { REQUEST_TIMEOUT } from './config'

export class RequestError extends Error {
  code: number
  constructor(message: string, code = -1) {
    super(message)
    this.name = 'RequestError'
    this.code = code
  }
}

export function requestJson<T>(url: string, timeout: number = REQUEST_TIMEOUT): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      timeout,
      dataType: 'json',
      success: (response: { statusCode: number; data: unknown }) => {
        const status = Number(response && response.statusCode)
        if (status >= 200 && status < 300) {
          resolve(response.data as T)
          return
        }
        reject(new RequestError(`请求失败 ${status}: ${url}`, status))
      },
      fail: (error: { errMsg?: string }) => {
        reject(new RequestError((error && error.errMsg) || '网络异常', -1))
      },
    })
  })
}

/** 依次尝试多个地址，第一个成功即返回；全部失败抛出最后一个错误 */
export async function requestJsonWithFallback<T>(
  urls: string[],
  timeout: number = REQUEST_TIMEOUT
): Promise<T> {
  const candidates = (urls || []).filter(Boolean)
  if (!candidates.length) {
    throw new RequestError('远程数据地址未配置')
  }

  let lastError: unknown = null
  for (const url of candidates) {
    try {
      return await requestJson<T>(url, timeout)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new RequestError('远程数据加载失败')
}

/**
 * 并发拉取多组数据并按传入顺序合并（图片数据由两份 JSON 拼成）。
 * 不用 Promise.allSettled：小程序基础库较低版本不保证有这个方法，
 * 手写等价逻辑可避免为一次性的并发容忍度引入运行时依赖。
 */
export async function requestJsonMerge<T>(urlGroups: string[][]): Promise<T[]> {
  const slots: Array<T | undefined> = new Array(urlGroups.length)
  let lastError: unknown = null

  await Promise.all(
    urlGroups.map(async (group, index) => {
      try {
        slots[index] = await requestJsonWithFallback<T>(group)
      } catch (error) {
        lastError = error
      }
    })
  )

  const results = slots.filter((item): item is T => item !== undefined)
  if (results.length) return results

  throw lastError instanceof Error ? lastError : new RequestError('远程数据加载失败')
}

export interface ConditionalResult<T> {
  /** 服务端回 304：内容没变，调用方应继续用本地缓存 */
  notModified: boolean
  data?: T
  /** 本次响应的 ETag；为空表示服务端没给，下次无法做条件请求 */
  etag: string
}

/**
 * 带 If-None-Match 的 JSON 请求，用于「数据没变就别重下」。
 *
 * 静态托管一般都支持 ETag，但小程序宿主对 304 的处理并不完全一致：有的直接回 304，
 * 有的会被底层转成 200 且 body 为空。所以调用方**必须**把「解析结果为空」当成异常
 * 而不是「云端数据变空了」，否则会把本地缓存冲掉。
 */
export function requestJsonConditional<T>(
  url: string,
  etag: string,
  timeout: number = REQUEST_TIMEOUT
): Promise<ConditionalResult<T>> {
  return new Promise<ConditionalResult<T>>((resolve, reject) => {
    const header: Record<string, string> = {}
    if (etag) header['If-None-Match'] = etag

    wx.request({
      url,
      method: 'GET',
      timeout,
      header,
      dataType: 'json',
      success: (response: { statusCode: number; data: unknown; header?: AnyHeaders }) => {
        const status = Number(response && response.statusCode)
        const headers = (response && response.header) || {}
        const nextEtag = String(headers.ETag || headers.etag || etag || '')

        if (status === 304) {
          resolve({ notModified: true, etag: nextEtag })
          return
        }
        if (status >= 200 && status < 300) {
          resolve({ notModified: false, data: response.data as T, etag: nextEtag })
          return
        }
        reject(new RequestError(`请求失败 ${status}: ${url}`, status))
      },
      fail: (error: { errMsg?: string }) => {
        reject(new RequestError((error && error.errMsg) || '网络异常', -1))
      },
    })
  })
}

interface AnyHeaders {
  [key: string]: string
}

export interface ConditionalPayload<T> {
  /** 所有数据源都回 304：本地缓存仍然有效 */
  notModified: boolean
  payloads: T[]
  etags: string[]
}

/** 各组逐一做条件请求。只有全部 304 才算「未变更」，否则由调用方决定如何重建。 */
export async function requestJsonMergeConditional<T>(
  urlGroups: string[][],
  etags: string[]
): Promise<ConditionalPayload<T>> {
  const slots: Array<T | undefined> = new Array(urlGroups.length)
  const notModifiedFlags: boolean[] = new Array(urlGroups.length).fill(false)
  const nextEtags: string[] = etags.slice()
  let lastError: unknown = null

  await Promise.all(
    urlGroups.map(async (group, index) => {
      const target = (group || []).filter(Boolean)[0]
      if (!target) {
        notModifiedFlags[index] = false
        return
      }
      try {
        const result = await requestJsonConditional<T>(target, etags[index] || '')
        if (result.notModified) {
          notModifiedFlags[index] = true
          if (result.etag) nextEtags[index] = result.etag
          return
        }
        slots[index] = result.data as T
        if (result.etag) nextEtags[index] = result.etag
      } catch (error) {
        lastError = error
      }
    })
  )

  const payloads = slots.filter((item): item is T => item !== undefined)
  const notModified = notModifiedFlags.every(Boolean)

  // 既不是「全未变更」，又一条数据都没拿到 —— 才是真的失败
  if (!notModified && !payloads.length) {
    throw lastError instanceof Error ? lastError : new RequestError('远程数据加载失败')
  }

  return { notModified, payloads, etags: nextEtags }
}
