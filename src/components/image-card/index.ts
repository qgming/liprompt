/** 图片案例卡片：懒加载封面、实测宽高比、失败占位 */

import { reportImageFailure, reportImageSuccess, resolveImageUrl } from '../../core/image'
import { getCachedImageSync } from '../../core/image-cache'

Component({
  properties: {
    item: { type: Object, value: null },
  },

  data: {
    cover: '',
    failed: false,
  },

  observers: {
    'item.coverImage'(coverImage: string) {
      this.applyCover(coverImage)
    },
  },

  lifetimes: {
    attached() {
      const raw = this.properties.item && this.properties.item.coverImage
      this.applyCover(raw || '')
    },
  },

  methods: {
    /** 优先使用本地缓存的图片路径，其次回退远程地址 */
    applyCover(raw: string) {
      if (!raw) {
        this.setData({ cover: '', failed: false })
        return
      }
      const local = getCachedImageSync(raw)
      this.setData({ cover: local || resolveImageUrl(raw), failed: false })
    },

    onLoad(event: { detail: { width: number; height: number } }) {
      const detail = event && event.detail
      if (!detail || !detail.width || !detail.height) return
      reportImageSuccess()
      this.triggerEvent('measured', {
        id: this.properties.item.id,
        ratio: Number((detail.height / detail.width).toFixed(4)),
      })
    },

    onError() {
      const raw = (this.properties.item && this.properties.item.coverImage) || ''
      reportImageFailure(raw)

      // 本地缓存文件可能已失效，退回远程地址再试一次
      const fallback = resolveImageUrl(raw)
      if (fallback && fallback !== this.data.cover) {
        this.setData({ cover: fallback })
        return
      }

      this.setData({ failed: true })
      this.triggerEvent('measured', { id: this.properties.item.id, ratio: 1.1 })
    },

    onTap() {
      this.triggerEvent('cardtap', { item: this.properties.item })
    },
  },
})
