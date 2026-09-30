/**
 * 分类浏览页：左侧分类导航 + 右侧提示词列表。
 *
 * 分类计数一次算完（countByCategory），不在 WXML 里对每条提示词做 filter，
 * 旧实现每渲染一个分类就要遍历一遍全量数据，分类多时是纯浪费。
 * 右侧列表按 40 条一屏增量渲染，避免一次 setData 推几百条节点。
 */

import { readPageQuery, safeDecode } from '../../core/nav'
import { collectCategories, countByCategory, matchesCategory } from '../../features/prompts'
import { PromptIndexItem } from '../../models/prompt'
import { promptRepository } from '../../repositories/index'

const CONTENT_PAGE_SIZE = 40

interface NavItem {
  name: string
  count: number
}

Page({
  data: {
    loading: true,
    error: '',
    navItems: [] as NavItem[],
    selected: '',
    list: [] as PromptIndexItem[],
    total: 0,
    hasMore: false,
    contentScrollTop: 0,
  },

  all: [] as PromptIndexItem[],
  filtered: [] as PromptIndexItem[],
  visibleCount: 0,

  onLoad() {
    this.loadData()
  },

  onShareAppMessage() {
    return {
      title: '提示词分类 · 流金提示词',
      path: '/pages/category/index',
    }
  },

  onShareTimeline() {
    return { title: '提示词分类大全 · 流金提示词' }
  },

  async loadData() {
    this.setData({ loading: true, error: '' })

    try {
      const items = await promptRepository.loadIndex('text')
      this.all = items

      const categories = collectCategories(items, 'text')
      const counts = countByCategory(items)
      const navItems: NavItem[] = categories.map((name) => ({
        name,
        count: counts[name] || 0,
      }))

      const query = readPageQuery()
      const requested = safeDecode(query.name || '').trim()
      const selected =
        requested && categories.indexOf(requested) >= 0 ? requested : categories[0] || ''

      this.setData({ navItems, loading: false, selected })
      this.applyCategory(selected)
    } catch (error) {
      this.setData({
        loading: false,
        error: '分类数据加载失败，请检查网络后重试',
      })
    }
  },

  applyCategory(name: string) {
    this.filtered = this.all.filter((item) => matchesCategory(item, name))
    this.visibleCount = CONTENT_PAGE_SIZE
    this.syncList()
  },

  syncList() {
    this.setData({
      list: this.filtered.slice(0, this.visibleCount),
      total: this.filtered.length,
      hasMore: this.visibleCount < this.filtered.length,
      // scroll-top 值不变时不会触发滚动，交替两个值即可在切换分类时回到顶部
      contentScrollTop: this.data.contentScrollTop === 0 ? 0.5 : 0,
    })
  },

  onSelectCategory(event: { currentTarget: { dataset: { name: string } } }) {
    const name = event && event.currentTarget && event.currentTarget.dataset.name
    if (!name || name === this.data.selected) return

    this.setData({ selected: name })
    this.applyCategory(name)
  },

  onScrollToLower() {
    if (!this.data.hasMore) return
    this.visibleCount += CONTENT_PAGE_SIZE
    this.syncList()
  },

  onOpenDetail(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = event && event.currentTarget && event.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/detail/index?id=${id}&source=text` })
  },

  onRetry() {
    this.loadData()
  },
})
