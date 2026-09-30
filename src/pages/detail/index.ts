/**
 * 详情页。
 *
 * 正文与图片列表按需加载：先从索引里定位条目（拿到分片号），再只拉那一个分片。
 * 从分享链接直接进入时索引可能还没加载，这里按 id 前缀与 source 参数判断类型，
 * 判断错就换另一种类型再找一次，保证链接不会打开成空页面。
 */

import { getCachedImageSync, cacheImageBatch } from '../../core/image-cache'
import { goBack, readPageQuery, safeDecode, switchTab } from '../../core/nav'
import { FavoriteItem, PromptIndexItem, PromptType } from '../../models/prompt'
import { favoriteRepository, promptRepository } from '../../repositories/index'

const DEFAULT_GALLERY_RATIO = 1.2
const MIN_GALLERY_HEIGHT = 240
const PAGE_PADDING_RPX = 60
const EMPTY_OFFSET = 88

Page({
  data: {
    loading: true,
    error: '',
    item: null as PromptIndexItem | null,
    promptText: '',
    images: [] as string[],
    isImage: false,
    isFavorite: false,
    galleryIndex: 0,
    galleryWidth: 320,
    galleryHeight: 384,
    emptyTop: 112,
  },

  galleryRatios: {} as Record<string, number>,

  onLoad() {
    this.resolveLayout()
    this.loadPrompt()
  },

  onShareAppMessage() {
    const item = this.data.item
    if (!item) return { title: '流金提示词' }
    return {
      title: item.name,
      path: `/pages/detail/index?id=${item.id}&source=${item.promptType}`,
      imageUrl: this.data.isImage ? item.coverImage || '' : '',
    }
  },

  onShareTimeline() {
    const item = this.data.item
    if (!item) return { title: '流金提示词' }
    return {
      title: `${item.name} · 流金提示词`,
      query: `id=${item.id}&source=${item.promptType}`,
      imageUrl: this.data.isImage ? item.coverImage || '' : '',
    }
  },

  resolveLayout() {
    let windowWidth = 375
    let statusBarHeight = 20

    try {
      const info =
        typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync()
      windowWidth = Number(info.windowWidth) || windowWidth
      statusBarHeight = Number(info.statusBarHeight) || statusBarHeight
    } catch (error) {
      // 使用默认值
    }

    let safeTop = statusBarHeight + 8
    try {
      const menu =
        typeof wx.getMenuButtonBoundingClientRect === 'function'
          ? wx.getMenuButtonBoundingClientRect()
          : null
      if (menu && menu.top) safeTop = Number(menu.top) || safeTop
    } catch (error) {
      // 使用默认值
    }

    const unit = windowWidth / 750
    const galleryWidth = Math.max(Math.round(windowWidth - PAGE_PADDING_RPX * unit), 200)

    this.setData({
      galleryWidth,
      // 这里必须用刚算出的宽度，不能调 galleryHeightOf：setData 之前 this.data 还是旧值
      galleryHeight: Math.max(
        Math.round(galleryWidth * DEFAULT_GALLERY_RATIO),
        MIN_GALLERY_HEIGHT
      ),
      emptyTop: Math.max(safeTop, 16) + EMPTY_OFFSET,
    })
  },

  galleryHeightOf(ratio: number): number {
    const width = this.data.galleryWidth || 320
    return Math.max(Math.round(width * (ratio || DEFAULT_GALLERY_RATIO)), MIN_GALLERY_HEIGHT)
  },

  async loadPrompt() {
    this.setData({ loading: true, error: '' })

    try {
      const query = readPageQuery()
      const id = safeDecode(query.id || '')
      if (!id) {
        this.setData({ loading: false, promptText: '', item: null })
        return
      }

      const preferred: PromptType =
        query.source === 'image' || id.startsWith('IMG_') ? 'image' : 'text'
      const item = await this.findItem(id, preferred)

      if (!item) {
        this.setData({ loading: false, item: null })
        return
      }

      const detail = await promptRepository.getDetail(item.promptType, id)
      const isImage = item.promptType === 'image'
      const rawImages = (detail && detail.images) || (item.coverImage ? [item.coverImage] : [])
      const images = rawImages.map((url) => getCachedImageSync(url) || url)

      this.galleryRatios = {}
      this.setData({
        loading: false,
        item,
        promptText: (detail && detail.prompt) || '',
        images,
        isImage,
        isFavorite: favoriteRepository.isFavorite(id),
        galleryIndex: 0,
        galleryHeight: this.galleryHeightOf(DEFAULT_GALLERY_RATIO),
      })

      if (images.length) cacheImageBatch(rawImages).catch(() => undefined)
    } catch (error) {
      this.setData({
        loading: false,
        item: null,
        error: '提示词加载失败，请检查网络后重试',
      })
    }
  },

  /** 先按预期类型找，找不到再换另一种，避免分享链接打开成空页 */
  async findItem(id: string, preferred: PromptType): Promise<PromptIndexItem | null> {
    const order: PromptType[] = preferred === 'image' ? ['image', 'text'] : ['text', 'image']

    for (const type of order) {
      await promptRepository.loadIndex(type).catch(() => [])
      const item = promptRepository.findIndexItem(id)
      if (item) return item
    }
    return null
  },

  onGalleryChange(event: { detail: { current: number } }) {
    const index = (event && event.detail && event.detail.current) || 0
    const ratio = this.galleryRatios[index] || DEFAULT_GALLERY_RATIO

    this.setData({
      galleryIndex: index,
      galleryHeight: this.galleryHeightOf(ratio),
    })
  },

  onGalleryImageLoad(event: { detail: { width: number; height: number }; currentTarget: { dataset: { index: number } } }) {
    const detail = event && event.detail
    const index =
      event && event.currentTarget && typeof event.currentTarget.dataset.index === 'number'
        ? event.currentTarget.dataset.index
        : 0

    if (!detail || !detail.width || !detail.height) return

    const ratio = Number((detail.height / detail.width).toFixed(4))
    this.galleryRatios[index] = ratio

    if (index === this.data.galleryIndex) {
      this.setData({ galleryHeight: this.galleryHeightOf(ratio) })
    }
  },

  onPreview(event: { currentTarget: { dataset: { index: number } } }) {
    const urls = this.data.images
    if (!urls.length) return

    const index = (event && event.currentTarget && event.currentTarget.dataset.index) || 0
    wx.previewImage({ current: urls[index], urls })
  },

  async onToggleFavorite() {
    const item = this.data.item
    if (!item) return

    const record: FavoriteItem = {
      id: item.id,
      promptType: item.promptType,
      name: item.name,
      description: item.description,
      emoji: item.emoji,
      group: (item.group || []).slice(0, 4),
      author: item.author || '',
      coverImage: item.coverImage || '',
      createdAt: Date.now(),
    }

    const added = await favoriteRepository.toggle(record)
    this.setData({ isFavorite: added })
    wx.showToast({ title: added ? '已加入收藏' : '已取消收藏', icon: 'none' })
  },

  onCopy() {
    const text = this.data.promptText
    if (!text) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'none' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' }),
    })
  },

  onGoHome() {
    goBack()
  },

  onTabHome() {
    switchTab('/pages/index/index')
  },
})
