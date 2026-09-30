/**
 * 收藏仓储 —— 本地存储实现（默认）。
 * 想换成云端同步时，新增一个实现同名接口的类，在 repositories/index.ts 换掉装配即可，
 * 页面与业务层不需要改动。
 */

import { STORAGE_KEYS } from '../core/config'
import { emit, FAVORITES_CHANGED } from '../features/event-bus'
import { readJson, writeJson } from '../core/storage'
import { FavoriteItem } from '../models/prompt'
import { FavoriteRepository } from './types'

const MAX_FAVORITES = 500

export class LocalFavoriteRepository implements FavoriteRepository {
  private items: FavoriteItem[] = []
  private map = new Map<string, FavoriteItem>()
  private loaded = false

  private ensure(): void {
    if (this.loaded) return
    const stored = readJson<FavoriteItem[]>(STORAGE_KEYS.favorites)
    this.apply(Array.isArray(stored) ? stored : [])
    this.loaded = true
  }

  private apply(items: FavoriteItem[]): void {
    const normalized = items
      .filter((item) => item && typeof item.id === 'string' && item.id)
      .slice(0, MAX_FAVORITES)
      .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0))

    this.items = normalized
    this.map = new Map(normalized.map((item) => [item.id, item]))
  }

  private persist(): void {
    writeJson(STORAGE_KEYS.favorites, this.items)
  }

  listSync(): FavoriteItem[] {
    this.ensure()
    return this.items.slice()
  }

  count(): number {
    this.ensure()
    return this.items.length
  }

  isFavorite(id: string): boolean {
    this.ensure()
    return this.map.has(id)
  }

  async list(): Promise<FavoriteItem[]> {
    this.ensure()
    return this.items.slice()
  }

  async toggle(input: FavoriteItem): Promise<boolean> {
    this.ensure()
    if (!input || !input.id) return false

    if (this.map.has(input.id)) {
      const next = this.items.filter((item) => item.id !== input.id)
      this.apply(next)
      this.persist()
      emit(FAVORITES_CHANGED, { id: input.id, isFavorite: false })
      return false
    }

    const record: FavoriteItem = {
      id: input.id,
      promptType: input.promptType === 'image' ? 'image' : 'text',
      name: input.name || '未命名提示词',
      description: input.description || '',
      emoji: input.emoji || '',
      group: Array.isArray(input.group) ? input.group.slice(0, 4) : [],
      author: input.author || '',
      coverImage: input.coverImage || '',
      createdAt: Date.now(),
    }

    this.apply([record, ...this.items])
    this.persist()
    emit(FAVORITES_CHANGED, { id: record.id, isFavorite: true })
    return true
  }
}
