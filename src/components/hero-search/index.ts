/** 页面顶部：标题 + 搜索框 + 可插内容（分类筛选条等） */

Component({
  properties: {
    eyebrow: { type: String, value: '' },
    title: { type: String, value: '' },
    placeholder: { type: String, value: '搜索提示词' },
    value: { type: String, value: '' },
  },

  data: {
    safeTop: 56,
    innerValue: '',
  },

  observers: {
    value(next: string) {
      this.setData({ innerValue: next || '' })
    },
  },

  lifetimes: {
    attached() {
      this.setData({ innerValue: this.properties.value || '' })
      this.resolveSafeTop()
    },
  },

  methods: {
    resolveSafeTop() {
      try {
        const windowInfo =
          typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const menu =
          typeof wx.getMenuButtonBoundingClientRect === 'function'
            ? wx.getMenuButtonBoundingClientRect()
            : null
        const base = menu && menu.top ? menu.top + (menu.height || 32) : (windowInfo.statusBarHeight || 20) + 44
        this.setData({ safeTop: Math.max(base, 48) })
      } catch (error) {
        this.setData({ safeTop: 56 })
      }
    },

    onInput(event: { detail: { value: string } }) {
      const value = (event && event.detail && event.detail.value) || ''
      this.setData({ innerValue: value })
      this.triggerEvent('input', { value })
    },

    onClear() {
      this.setData({ innerValue: '' })
      this.triggerEvent('input', { value: '' })
    },
  },
})
