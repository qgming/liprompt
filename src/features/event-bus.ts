/** 极简事件总线，用于跨页面同步收藏等状态 */

type Handler = (payload?: unknown) => void

const handlers = new Map<string, Handler[]>()

export const FAVORITES_CHANGED = 'favorites:changed'

/** 后台校验发现云端数据有更新、本地缓存已重建；payload 为 { type } */
export const DATA_UPDATED = 'data:updated'

export function on(event: string, handler: Handler): void {
  const list = handlers.get(event) || []
  list.push(handler)
  handlers.set(event, list)
}

export function off(event: string, handler: Handler): void {
  const list = handlers.get(event)
  if (!list) return
  const next = list.filter((item) => item !== handler)
  if (next.length) handlers.set(event, next)
  else handlers.delete(event)
}

export function emit(event: string, payload?: unknown): void {
  const list = handlers.get(event)
  if (!list) return
  list.slice().forEach((handler) => {
    try {
      handler(payload)
    } catch (error) {
      console.error('[event-bus] 处理事件失败', event, error)
    }
  })
}
