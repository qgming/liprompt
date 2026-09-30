/** 搜索关键词高亮：把一段文本切成「命中 / 未命中」的分段，供 WXML 循环渲染 */

import { HighlightSegment } from '../models/prompt'

const MAX_SEGMENTS = 24

export function splitHighlight(text: string, keyword: string): HighlightSegment[] {
  const source = typeof text === 'string' ? text : ''
  const term = typeof keyword === 'string' ? keyword.trim() : ''

  if (!source) return []
  if (!term) return [{ text: source, hit: false }]

  const lowerSource = source.toLowerCase()
  const lowerTerm = term.toLowerCase()
  const segments: HighlightSegment[] = []

  let cursor = 0
  while (cursor < source.length && segments.length < MAX_SEGMENTS) {
    const hitIndex = lowerSource.indexOf(lowerTerm, cursor)
    if (hitIndex < 0) break

    if (hitIndex > cursor) {
      segments.push({ text: source.slice(cursor, hitIndex), hit: false })
    }
    segments.push({ text: source.slice(hitIndex, hitIndex + term.length), hit: true })
    cursor = hitIndex + term.length
  }

  if (cursor < source.length && segments.length < MAX_SEGMENTS) {
    segments.push({ text: source.slice(cursor), hit: false })
  }

  return segments.length ? segments : [{ text: source, hit: false }]
}
