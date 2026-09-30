/**
 * 提示词仓储：云端整包 JSON 直连 + 本地缓存。
 *
 * 数据源就是云端那一份 JSON（见 core/config.ts 的 DATA_SOURCES），中间不存在需要
 * 人工再加工的产物，所以「云端更新 → 客户端生效」之间没有手工步骤。
 *
 * 读取顺序：内存 → 本地缓存 → 网络。
 * 本地缓存分两处：
 *   - 索引（约 196KB）放 storage，体积小，用于秒开首屏；
 *   - 正文（约 1.2MB）放文件系统，因为 storage 单 key 上限 1MB 装不下。
 * 两处都由同一次网络请求写入。
 *
 * 冷启动流程：命中缓存 → 立即返回让页面渲染 → 后台带 ETag 校验云端 →
 * 真有更新才重建缓存并发 DATA_UPDATED；服务端回 304 就什么都不做。
 */

import { CHECK_INTERVAL, DATA_SOURCES, STORAGE_KEYS } from '../core/config'
import { clearMemoryCache, dropCache, readCache, writeCache } from '../core/cache'
import { readDetailSync, writeDetail } from '../core/data-file'
import { requestJsonMerge, requestJsonMergeConditional } from '../core/http'
import { resolveImageUrl } from '../core/image'
import { readString, writeString } from '../core/storage'
import { DATA_UPDATED, emit } from '../features/event-bus'
import { PromptDetail, PromptIndexItem, PromptType } from '../models/prompt'
import { PromptRepository } from './types'

const ALL_CATEGORY = '全部'
const FEATURED_CATEGORY = '精选'
const LEGACY_IMAGE_CATEGORY = '图片提示'

type TypeKey = PromptType

/** id -> 正文，落文件缓存的结构 */
type DetailTable = Record<string, PromptDetail>

interface BuiltData {
  index: PromptIndexItem[]
  details: DetailTable
}

export class RemotePromptRepository implements PromptRepository {
  private index: Record<TypeKey, PromptIndexItem[]> = { text: [], image: [] }
  private indexMap = new Map<string, PromptIndexItem>()
  private details = new Map<string, PromptDetail>()
  private loaded: Record<TypeKey, boolean> = { text: false, image: false }
  private detailsLoaded: Record<TypeKey, boolean> = { text: false, image: false }
  private pending: Partial<Record<TypeKey, Promise<PromptIndexItem[]>>> = {}
  private checking: Partial<Record<TypeKey, boolean>> = {}
  private mode: 'remote' | 'cache' | 'unknown' = 'unknown'

  private indexKey(type: TypeKey): string {
    return type === 'text' ? STORAGE_KEYS.textIndex : STORAGE_KEYS.imageIndex
  }

  private etagKey(type: TypeKey): string {
    return type === 'text' ? STORAGE_KEYS.textEtag : STORAGE_KEYS.imageEtag
  }

  private checkedKey(type: TypeKey): string {
    return type === 'text' ? STORAGE_KEYS.textCheckedAt : STORAGE_KEYS.imageCheckedAt
  }

  /** 文本一个源；图片由两份 JSON 拼成，各自独立做条件请求 */
  private groups(type: TypeKey): string[][] {
    return type === 'text' ? [DATA_SOURCES.text] : DATA_SOURCES.image.map((url) => [url])
  }

  private applyIndex(type: TypeKey, items: PromptIndexItem[]): void {
    this.index[type] = items
    items.forEach((item) => this.indexMap.set(item.id, item))
  }

  private readEtags(type: TypeKey): string[] {
    const raw = readString(this.etagKey(type))
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch (error) {
      return []
    }
  }

  private writeEtags(type: TypeKey, etags: string[]): void {
    writeString(this.etagKey(type), JSON.stringify(etags))
  }

  peekIndex(type: PromptType): PromptIndexItem[] {
    return this.index[type] || []
  }

  findIndexItem(id: string): PromptIndexItem | null {
    return this.indexMap.get(id) || null
  }

  sourceMode(): 'remote' | 'cache' | 'unknown' {
    return this.mode
  }

  loadIndex(type: PromptType, force = false): Promise<PromptIndexItem[]> {
    if (!force && this.loaded[type]) {
      this.scheduleCheck(type)
      return Promise.resolve(this.index[type])
    }

    const existing = this.pending[type]
    if (existing && !force) return existing

    const task = this.doLoadIndex(type, force).finally(() => {
      delete this.pending[type]
    })
    this.pending[type] = task
    return task
  }

  private async doLoadIndex(type: TypeKey, force: boolean): Promise<PromptIndexItem[]> {
    if (!force) {
      const cached = this.hydrateIndex(type)
      if (cached.length) {
        this.loaded[type] = true
        this.mode = 'cache'
        this.scheduleCheck(type)
        return cached
      }
    }

    // 没有可用缓存，或用户主动刷新：必须等网络
    try {
      await this.pull(type)
      writeString(this.checkedKey(type), String(Date.now()))
    } catch (error) {
      if (this.index[type].length) {
        this.loaded[type] = true
        return this.index[type]
      }
      throw error
    }

    this.loaded[type] = true
    return this.index[type]
  }

  /** 只恢复索引，正文留到真正要看详情时再读文件，避免冷启动同步解析大 JSON */
  private hydrateIndex(type: TypeKey): PromptIndexItem[] {
    const cached = readCache<PromptIndexItem[]>(this.indexKey(type))
    if (cached && cached.length) this.applyIndex(type, cached)
    return this.index[type]
  }

  private hydrateDetails(type: TypeKey): void {
    if (this.detailsLoaded[type]) return
    this.detailsLoaded[type] = true

    const table = readDetailSync<PromptDetail>(type)
    if (!table) {
      this.detailsLoaded[type] = false
      return
    }
    Object.keys(table).forEach((id) => this.details.set(id, table[id]))
  }

  /** 后台校验云端，带节流：距上次校验不足 CHECK_INTERVAL 就直接跳过 */
  private scheduleCheck(type: TypeKey): void {
    if (this.checking[type]) return

    const last = Number(readString(this.checkedKey(type))) || 0
    if (Date.now() - last < CHECK_INTERVAL) return

    this.checking[type] = true
    this.checkRemote(type)
      .catch(() => {
        // 后台校验失败不影响已渲染的缓存数据，下次启动再试
      })
      .then(() => {
        this.checking[type] = false
      })
  }

  private async checkRemote(type: TypeKey): Promise<void> {
    const groups = this.groups(type)
    const etags = this.readEtags(type)

    const result = await requestJsonMergeConditional<unknown[]>(groups, etags)

    writeString(this.checkedKey(type), String(Date.now()))
    this.writeEtags(type, result.etags)

    if (result.notModified) return

    if (result.payloads.length === groups.length) {
      // 各数据源都拿到了新内容，直接用，省掉一次重复下载
      this.store(type, buildData(type, result.payloads))
    } else {
      // 只有部分数据源有变化，拼不出完整数据集，整体重拉一次
      await this.pull(type)
    }

    emit(DATA_UPDATED, { type })
  }

  /** 无条件拉取并重建缓存 */
  private async pull(type: TypeKey): Promise<void> {
    const payloads = await requestJsonMerge<unknown[]>(this.groups(type))
    this.store(type, buildData(type, payloads))
  }

  private store(type: TypeKey, data: BuiltData): void {
    // 服务端返回空数据时保住本地缓存：宁可显示旧数据，也不能把列表清空
    if (!data.index.length) {
      throw new Error('云端返回的数据为空')
    }

    this.applyIndex(type, data.index)
    Object.keys(data.details).forEach((id) => this.details.set(id, data.details[id]))
    this.detailsLoaded[type] = true

    writeCache(this.indexKey(type), data.index)
    writeDetail(type, data.details)
    this.mode = 'remote'
  }

  async getDetail(type: PromptType, id: string): Promise<PromptDetail | null> {
    const cached = this.details.get(id)
    if (cached) return cached

    if (!this.indexMap.has(id)) return null

    this.hydrateDetails(type)
    const local = this.details.get(id)
    if (local) return local

    // 本地缓存不完整（例如用户清过缓存），补拉一次
    try {
      await this.pull(type)
    } catch (error) {
      return null
    }
    return this.details.get(id) || null
  }

  async refresh(): Promise<void> {
    clearMemoryCache()
    this.details.clear()
    this.indexMap.clear()
    this.index = { text: [], image: [] }
    this.loaded = { text: false, image: false }
    this.detailsLoaded = { text: false, image: false }

    await Promise.all([this.loadIndex('text', true), this.loadIndex('image', true)])
  }
}

function stripCaseWord(value: unknown): string {
  return typeof value === 'string' ? value.replace(/案例/g, '').trim() : ''
}

/** 把云端整包（可能由多份 JSON 拼成）转成列表索引 + 正文表 */
function buildData(type: TypeKey, payloads: unknown[]): BuiltData {
  const rawItems = payloads.reduce<unknown[]>((acc, payload) => {
    if (Array.isArray(payload)) acc.push(...payload)
    return acc
  }, [])

  const details: DetailTable = {}
  const index: PromptIndexItem[] = []
  const seen = new Set<string>()

  for (const raw of rawItems) {
    const item = raw as Record<string, unknown>
    const id = typeof item.id === 'string' ? item.id : ''
    if (!id || seen.has(id)) continue
    seen.add(id)

    const prompt = String(item.prompt || '')

    if (type === 'text') {
      index.push({
        id,
        name: String(item.name || ''),
        description: String(item.description || ''),
        emoji: String(item.emoji || ''),
        group: Array.isArray(item.group) ? (item.group as string[]) : [],
        promptType: 'text',
      })
      details[id] = { prompt }
      continue
    }

    const image = normalizeImageItem(item)
    index.push(image.item)
    details[id] = { prompt, images: image.imageList }
  }

  return { index, details }
}

/** 图片案例的字段清理：group 去掉「案例」后缀与「图片提示」这类容器分类 */
function normalizeImageItem(source: Record<string, unknown>): {
  item: PromptIndexItem
  imageList: string[]
} {
  const group = (Array.isArray(source.group) ? (source.group as string[]) : [])
    .map((name) => stripCaseWord(name))
    .filter((name) => name && name !== LEGACY_IMAGE_CATEGORY)

  const primary = group.find((name) => name !== FEATURED_CATEGORY) || group[0] || ''
  const section = primary || stripCaseWord(source.section)

  const sourceImages =
    Array.isArray(source.images) && source.images.length
      ? (source.images as string[])
      : source.coverImage
        ? [String(source.coverImage)]
        : []

  const imageList = Array.from(
    new Set(sourceImages.map((url) => resolveImageUrl(url)).filter(Boolean))
  )

  return {
    item: {
      id: String(source.id || ''),
      name: String(source.name || ''),
      description: String(source.description || ''),
      emoji: String(source.emoji || ''),
      group,
      promptType: 'image',
      coverImage: imageList[0] || '',
      author: String(source.author || ''),
      section,
      images: imageList.length,
    },
    imageList,
  }
}

export const ALL_CATEGORY_NAME = ALL_CATEGORY
export const FEATURED_CATEGORY_NAME = FEATURED_CATEGORY

export function dropIndexCache(type: PromptType): void {
  dropCache(type === 'text' ? STORAGE_KEYS.textIndex : STORAGE_KEYS.imageIndex)
}
