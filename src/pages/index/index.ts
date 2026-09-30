/**
 * 精选页（文本提示词）。
 *
 * 与旧实现的差别：
 *   1. 首屏先吃本地索引缓存立刻渲染，再在后台带 ETag 校验云端，有更新才换数据；
 *   2. 「上一页 / 下一页 + 选页弹窗」换成滚动到底自动追加，翻页手感更连续；
 *   3. 搜索加 260ms 防抖，命中关键词在卡片上高亮；
 *   4. 随机推荐只在无搜索词时展示，避免结果区与推荐区语义打架。
 */

import { PAGE_SIZE } from '../../core/config'
import { debounce, Debounced } from '../../core/debounce'
import { openCategory, openDetail } from '../../core/nav'
import { DATA_UPDATED, off, on } from '../../features/event-bus'
import { filterPrompts, pickRandom, toViewItems } from '../../features/prompts'
import {
  distribute,
  estimateTextHeight,
  toColumnViews,
} from '../../features/waterfall'
import { PromptIndexItem, PromptViewItem } from '../../models/prompt'
import { promptRepository } from '../../repositories/index'

const COLUMN_COUNT = 2
const TRENDING_COUNT = 10
const SEARCH_DEBOUNCE = 260

interface ColumnView {
  key: number
  items: PromptViewItem[]
}

Page({
  data: {
    loading: true,
    error: '',
    activeKeyword: '',
    trending: [] as PromptViewItem[],
    columns: [] as ColumnView[],
    total: 0,
    hasMore: false,
  },

  /** 非渲染状态放在实例上，避免每次 setData 都搬运大数组 */
  all: [] as PromptIndexItem[],
  filtered: [] as PromptIndexItem[],
  visibleCount: 0,
  onSearchDebounced: ((_value: string): void => undefined) as Debounced<[string]>,
  onDataUpdated: (_payload?: unknown): void => undefined,

  onLoad() {
    this.onSearchDebounced = debounce((value: string) => {
      this.applyKeyword(value)
    }, SEARCH_DEBOUNCE)

    this.onDataUpdated = (payload?: unknown): void => {
      const detail = payload as { type?: string } | undefined
      if (detail && detail.type && detail.type !== 'text') return
      this.applyLatest()
    }
    on(DATA_UPDATED, this.onDataUpdated)

    this.loadData()
  },

  onUnload() {
    this.onSearchDebounced.cancel()
    off(DATA_UPDATED, this.onDataUpdated)
  },

  /** 后台校验发现云端有更新：直接换新数据，不显示 loading 以免打断正在浏览的用户 */
  applyLatest() {
    const items = promptRepository.peekIndex('text')
    if (!items.length) return

    this.all = items
    this.setData({ trending: toViewItems(pickRandom(items, TRENDING_COUNT), '') })
    this.applyKeyword(this.data.activeKeyword)
  },

  onShareAppMessage() {
    return {
      title: '流金提示词 · 精选 AI 提示词库',
      path: '/pages/index/index',
    }
  },

  onShareTimeline() {
    return { title: '流金提示词 · 精选 AI 提示词库' }
  },

  async loadData() {
    this.setData({ loading: true, error: '' })

    try {
      const items = await promptRepository.loadIndex('text')
      this.all = items
      const trending = toViewItems(pickRandom(items, TRENDING_COUNT), '')

      this.setData({ trending, loading: false })
      this.applyKeyword(this.data.activeKeyword)
    } catch (error) {
      this.setData({
        loading: false,
        error: '提示词加载失败，请检查网络后重试',
      })
    }
  },

  /** 关键词变化后重置渲染窗口并重排瀑布流 */
  applyKeyword(keyword: string) {
    const term = (keyword || '').trim()
    this.filtered = filterPrompts(this.all, { keyword: term })
    this.visibleCount = PAGE_SIZE
    this.setData({ activeKeyword: term })
    this.syncView()
  },

  syncView() {
    const items = toViewItems(
      this.filtered.slice(0, this.visibleCount),
      this.data.activeKeyword
    )

    const result = distribute<PromptViewItem>({
      items,
      columns: COLUMN_COUNT,
      heights: {},
      estimate: estimateTextHeight,
      getId: (item) => item.id,
    })

    this.setData({
      columns: toColumnViews(result.columns),
      total: this.filtered.length,
      hasMore: this.visibleCount < this.filtered.length,
    })
  },

  onSearchInput(event: { detail: { value: string } }) {
    const value = (event && event.detail && event.detail.value) || ''
    this.onSearchDebounced(value)
  },

  onScrollToLower() {
    if (!this.data.hasMore) return
    this.visibleCount += PAGE_SIZE
    this.syncView()
  },

  onPromptTap(event: { detail: { item: PromptIndexItem } }) {
    const item = event && event.detail && event.detail.item
    if (!item) return
    openDetail(item.id, 'text')
  },

  onTrendingTap(event: { detail: { item: PromptIndexItem } }) {
    const item = event && event.detail && event.detail.item
    if (!item) return
    openDetail(item.id, 'text')
  },

  onTagTap(event: { detail: { tag: string } }) {
    const tag = event && event.detail && event.detail.tag
    if (!tag) return
    openCategory(tag)
  },

  openCategoryPage() {
    openCategory()
  },

  onRetry() {
    this.loadData()
  },
})
