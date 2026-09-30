/** 首页「随机推荐」横滑卡片 */

Component({
  properties: {
    item: { type: Object, value: null },
  },

  methods: {
    onTap() {
      this.triggerEvent('cardtap', { item: this.properties.item })
    },
  },
})
