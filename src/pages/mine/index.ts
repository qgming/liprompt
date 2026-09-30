/**
 * 「我的」页。
 *
 * 收藏仍走本地仓储（repositories/index.ts 换一个实现即可切到云端同步，本页不用改）。
 * 统计数字直接读仓储已加载的索引长度，不再等全量数据下载完才显示，因此进页面
 * 立刻有数字，数据到齐后再刷新一次。
 */

import { switchTab } from '../../core/nav'
import { FAVORITES_CHANGED, off, on } from '../../features/event-bus'
import { distribute, estimateFavoriteHeight, toColumnViews } from '../../features/waterfall'
import { FavoriteItem } from '../../models/prompt'
import { favoriteRepository, promptRepository } from '../../repositories/index'

const COLUMN_COUNT = 2

const OPEN_SOURCE_PROJECTS = [
  {
    name: 'awesome-gpt-image-2-prompts',
    url: 'https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts',
  },
  {
    name: 'cherry-studio',
    url: 'https://github.com/CherryHQ/cherry-studio',
  },
]

interface ColumnView {
  key: number
  items: FavoriteItem[]
}

Page({
  data: {
    loading: true,
    refreshing: false,
    stats: { text: 0, image: 0 },
    favoriteCount: 0,
    columns: [] as ColumnView[],
    projects: OPEN_SOURCE_PROJECTS,
    sourceMode: '未知',
  },

  onFavoritesChanged: (): void => undefined,

  onLoad() {
    this.syncStats()
    this.syncFavorites()
    this.setData({ loading: false })

    this.onFavoritesChanged = (): void => {
      this.syncFavorites()
    }
    on(FAVORITES_CHANGED, this.onFavoritesChanged)

    promptRepository
      .loadIndex('text')
      .then(() => promptRepository.loadIndex('image'))
      .then(() => this.syncStats())
      .catch(() => {
        wx.showToast({ title: '数据加载失败', icon: 'none' })
      })
  },

  onShow() {
    this.syncFavorites()
    this.syncStats()
  },

  onUnload() {
    off(FAVORITES_CHANGED, this.onFavoritesChanged)
  },

  onShareAppMessage() {
    return { title: '流金提示词 · 精选 AI 提示词库', path: '/pages/index/index' }
  },

  syncStats() {
    this.setData({
      stats: {
        text: promptRepository.peekIndex('text').length,
        image: promptRepository.peekIndex('image').length,
      },
      sourceMode: this.sourceModeLabel(),
    })
  },

  sourceModeLabel(): string {
    const mode = promptRepository.sourceMode()
    if (mode === 'remote') return '云端直连'
    if (mode === 'cache') return '本地缓存'
    return '未知'
  },

  syncFavorites() {
    const favorites = favoriteRepository.listSync()

    const result = distribute<FavoriteItem>({
      items: favorites,
      columns: COLUMN_COUNT,
      heights: {},
      estimate: estimateFavoriteHeight,
      getId: (item) => item.id,
    })

    this.setData({
      columns: toColumnViews(result.columns),
      favoriteCount: favorites.length,
    })
  },

  async onRefreshContent() {
    if (this.data.refreshing) return

    this.setData({ refreshing: true })
    wx.showLoading({ title: '更新中', mask: true })

    try {
      await promptRepository.refresh()
      this.syncStats()
      wx.hideLoading()
      wx.showToast({ title: '内容已更新', icon: 'none' })
    } catch (error) {
      wx.hideLoading()
      wx.showToast({ title: '更新失败，请稍后再试', icon: 'none' })
    } finally {
      this.setData({ refreshing: false })
    }
  },

  onOpenFavorite(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = readDatasetId(event)
    if (!id) return

    const item = favoriteRepository.listSync().find((favorite) => favorite.id === id)
    const type = item ? item.promptType : 'text'
    wx.navigateTo({ url: `/pages/detail/index?id=${id}&source=${type}` })
  },

  async onRemoveFavorite(event: { currentTarget: { dataset: { id?: string } } }) {
    const id = readDatasetId(event)
    if (!id) return

    const existing = favoriteRepository.listSync().find((favorite) => favorite.id === id)
    if (!existing) return

    await favoriteRepository.toggle(existing)
    wx.showToast({ title: '已取消收藏', icon: 'none' })
  },

  onCopyProject(event: { currentTarget: { dataset: { url?: string } } }) {
    const url = event && event.currentTarget && event.currentTarget.dataset.url
    if (!url) return

    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '已复制项目地址', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' }),
    })
  },

  onGoExplore() {
    switchTab('/pages/index/index')
  },
})

function readDatasetId(event: { currentTarget?: { dataset?: { id?: string } } }): string {
  return (event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id) || ''
}
