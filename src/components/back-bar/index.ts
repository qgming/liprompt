/** 自定义返回栏：对齐右上角胶囊按钮，首页无上一页时回退到 tab */

Component({
  properties: {
    label: {
      type: String,
      value: '返回',
    },
  },

  data: {
    safeTop: 24,
    barHeight: 32,
  },

  lifetimes: {
    attached() {
      this.resolveInset()
    },
  },

  methods: {
    resolveInset() {
      try {
        const windowInfo =
          typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const menu =
          typeof wx.getMenuButtonBoundingClientRect === 'function'
            ? wx.getMenuButtonBoundingClientRect()
            : null

        const safeTop = menu && menu.top ? menu.top : (windowInfo.statusBarHeight || 20) + 8
        const barHeight = menu && menu.height ? menu.height : 32

        this.setData({
          safeTop: Math.max(safeTop, 16),
          barHeight: Math.max(barHeight, 28),
        })
      } catch (error) {
        this.setData({ safeTop: 24, barHeight: 32 })
      }
    },

    onBack() {
      try {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          wx.navigateBack({ delta: 1 })
          return
        }
      } catch (error) {
        // 继续走兜底
      }
      wx.switchTab({ url: '/pages/index/index' })
    },
  },
})
