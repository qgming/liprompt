/** 提示词业务用例：分类、筛选、搜索、随机推荐、视图模型转换 */

import { splitHighlight } from '../core/highlight'
import {
  PromptIndexItem,
  PromptType,
  PromptViewItem,
} from '../models/prompt'
import { ALL_CATEGORY_NAME, FEATURED_CATEGORY_NAME } from '../repositories/prompt-repository'

const MAX_TAGS = 4

export function collectCategories(items: PromptIndexItem[], type: PromptType): string[] {
  const set = new Set<string>()
  items.forEach((item) => {
    ;(item.group || []).forEach((name) => {
      if (name) set.add(name)
    })
  })

  const all = Array.from(set)

  if (type === 'image') {
    const rest = all.filter((name) => name !== FEATURED_CATEGORY_NAME)
    return set.has(FEATURED_CATEGORY_NAME)
      ? [ALL_CATEGORY_NAME, FEATURED_CATEGORY_NAME, ...rest.sort()]
      : [ALL_CATEGORY_NAME, ...rest.sort()]
  }

  return all.sort()
}

export function countByCategory(items: PromptIndexItem[]): Record<string, number> {
  const counter: Record<string, number> = {}
  items.forEach((item) => {
    const names = new Set(item.group || [])
    names.forEach((name) => {
      counter[name] = (counter[name] || 0) + 1
    })
  })
  return counter
}

export function matchesKeyword(item: PromptIndexItem, keyword: string): boolean {
  const term = keyword.trim().toLowerCase()
  if (!term) return true

  const haystack = [item.name, item.description, item.author, ...(item.group || [])]
  return haystack.some((field) => (field || '').toLowerCase().includes(term))
}

export function matchesCategory(item: PromptIndexItem, category: string): boolean {
  if (!category || category === ALL_CATEGORY_NAME) return true
  return (item.group || []).includes(category)
}

export function filterPrompts(
  items: PromptIndexItem[],
  options: { keyword?: string; category?: string } = {}
): PromptIndexItem[] {
  const keyword = options.keyword || ''
  const category = options.category || ''
  return items.filter(
    (item) => matchesKeyword(item, keyword) && matchesCategory(item, category)
  )
}

export function sortForDisplay(
  items: PromptIndexItem[],
  categories: string[]
): PromptIndexItem[] {
  const order = new Map<string, number>()
  categories.forEach((name, index) => order.set(name, index))

  return items.slice().sort((left, right) => {
    const leftIndex = primaryIndex(left, order)
    const rightIndex = primaryIndex(right, order)
    return leftIndex - rightIndex
  })
}

function primaryIndex(item: PromptIndexItem, order: Map<string, number>): number {
  const group = item.group || []
  const primary = group.find((name) => name !== FEATURED_CATEGORY_NAME) || group[0] || ''
  return order.has(primary) ? (order.get(primary) as number) : Number.MAX_SAFE_INTEGER
}

export function toViewItems(items: PromptIndexItem[], keyword: string): PromptViewItem[] {
  return items.map((item) => ({
    ...item,
    nameParts: splitHighlight(item.name, keyword),
    descParts: splitHighlight(item.description, keyword),
    tags: (item.group || []).slice(0, MAX_TAGS),
  }))
}

export function pickRandom<T>(items: T[], count: number): T[] {
  const pool = items.slice()
  const size = Math.min(count, pool.length)
  const result: T[] = []

  for (let i = 0; i < size; i += 1) {
    const index = Math.floor(Math.random() * pool.length)
    result.push(pool[index])
    pool.splice(index, 1)
  }

  return result
}
