/**
 * 图片案例页。
 *
 * 瀑布流的关键点：图片高度在下载完成前不可知，因此先用默认比例排一次，
 * 等 image 组件回报真实宽高比后再重排。重排按 120ms 合并，避免几十张图
 * 同时 load 触发几十次 setData。
 */

import { PAGE_SIZE } from '../../core/config'
import { debounce, Debounced } from '../../core/debounce'
import { cacheImageBatch } from '../../core/image-cache'
import { openDetail } from '../../core/nav'
import { DATA_UPDATED, off, on } from '../../features/event-bus'
import { collectCategories, filterPrompts } from '../../features/prompts'
import {
  distribute,
  imageCardWeight,
  toColumnViews,
} from '../../features/waterfall'
import { PromptIndexItem } from '../../models/prompt'
import { promptRepository } from '../../repositories/index'

const COLUMN_COUNT = 2
const SEARCH_DEBOUNCE = 260
const REDISTRIBUTE_DELAY = 120
const ALL = '全部'

interface ColumnView {
  key: number
  items: PromptIndexItem[]
}

Page({
  data: {
    loading: true,
    error: '',
    activeKeyword: '',
    categories: [] as string[],
    selectedCategory: ALL,
    columns: [] as ColumnView[],
    total: 0,
    hasMore: false,
  },

  all: [] as PromptIndexItem[],
  filtered: [] as PromptIndexItem[],
  visibleCount: 0,
  ratios: {} as Record<string, number>,
  redistributeTimer: null as number | null,
  onSearchDebounced: ((_value: string): void => undefined) as Debounced<[string]>,
  onDataUpdated: (_payload?: unknown): void => undefined,

  onLoad() {
    this.onSearchDebounced = debounce((value: string) => {
      const term = (value || '').trim()
      this.setData({ activeKeyword: term })
      this.applyFilter()
    }, SEARCH_DEBOUNCE)

    this.onDataUpdated = (payload?: unknown): void => {
      const detail = payload as { type?: string } | undefined
      if (detail && detail.type && detail.type !== 'image') return
      this.applyLatest()
    }
    on(DATA_UPDATED, this.onDataUpdated)

    this.loadData()
  },

  onUnload() {
    this.onSearchDebounced.cancel()
    off(DATA_UPDATED, this.onDataUpdated)
    if (this.redistributeTimer !== null) clearTimeout(this.redistributeTimer)
  },

  /** 后台校验发现云端有更新：换新数据并清掉实测比例，重新走一次量高 */
  applyLatest() {
    const items = promptRepository.peekIndex('image')
    if (!items.length) return

    this.all = items
    this.ratios = {}
    this.setData({ categories: collectCategories(items, 'image') })
    this.applyFilter()
  },

  onShareAppMessage() {
    return {
      title: '流金提示词 · GPT-Image 图片提示库',
      path: '/pages/image/index',
    }
  },

  onShareTimeline() {
    return { title: '流金提示词 · 图片提示库' }
  },

  async loadData() {
    this.setData({ loading: true, error: '' })

    try {
      const items = await promptRepository.loadIndex('image')
      this.all = items
      this.ratios = {}
      this.setData({
        categories: collectCategories(items, 'image'),
        loading: false,
      })
      this.applyFilter()
    } catch (error) {
      this.setData({
        loading: false,
        error: '图片提示加载失败，请检查网络后重试',
      })
    }
  },

  applyFilter() {
    this.filtered = filterPrompts(this.all, {
      keyword: this.data.activeKeyword,
      category: this.data.selectedCategory,
    })
    this.visibleCount = PAGE_SIZE
    this.syncView()
  },

  syncView() {
    const items = this.filtered.slice(0, this.visibleCount)

    const weights: Record<string, number> = {}
    items.forEach((item) => {
      weights[item.id] = imageCardWeight(this.ratios[item.id])
    })

    const result = distribute<PromptIndexItem>({
      items,
      columns: COLUMN_COUNT,
      heights: weights,
      estimate: (item) => imageCardWeight(this.ratios[item.id]),
      getId: (item) => item.id,
    })

    this.setData({
      columns: toColumnViews(result.columns),
      total: this.filtered.length,
      hasMore: this.visibleCount < this.filtered.length,
    })

    this.warmCoverCache(items)
  },

  /** 预热本地图片缓存：这次访问下载，下次进来直接读本地文件 */
  warmCoverCache(items: PromptIndexItem[]) {
    const covers = items.map((item) => item.coverImage || '').filter(Boolean)
    if (!covers.length) return
    cacheImageBatch(covers).catch(() => undefined)
  },

  onCardMeasured(event: { detail: { id: string; ratio: number } }) {
    const detail = event && event.detail
    if (!detail || !detail.id || !detail.ratio) return
    if (this.ratios[detail.id] === detail.ratio) return

    this.ratios[detail.id] = detail.ratio
    this.scheduleRedistribute()
  },

  scheduleRedistribute() {
    if (this.redistributeTimer !== null) return
    this.redistributeTimer = setTimeout(() => {
      this.redistributeTimer = null
      this.syncView()
    }, REDISTRIBUTE_DELAY)
  },

  onSearchInput(event: { detail: { value: string } }) {
    const value = (event && event.detail && event.detail.value) || ''
    this.onSearchDebounced(value)
  },

  onSelectCategory(event: { currentTarget: { dataset: { category: string } } }) {
    const category =
      (event && event.currentTarget && event.currentTarget.dataset.category) || ALL
    if (category === this.data.selectedCategory) return

    this.setData({ selectedCategory: category })
    this.applyFilter()
  },

  onScrollToLower() {
    if (!this.data.hasMore) return
    this.visibleCount += PAGE_SIZE
    this.syncView()
  },

  onCardTap(event: { detail: { item: PromptIndexItem } }) {
    const item = event && event.detail && event.detail.item
    if (!item) return
    openDetail(item.id, 'image')
  },

  onRetry() {
    this.loadData()
  },
})
