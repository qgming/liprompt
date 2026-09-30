/** 文本提示词卡片：关键词高亮 + 分类标签 */

Component({
  properties: {
    item: { type: Object, value: null },
  },

  methods: {
    onTap() {
      this.triggerEvent('cardtap', { item: this.properties.item })
    },

    onTag(event: { currentTarget: { dataset: { tag: string } } }) {
      const tag = event && event.currentTarget && event.currentTarget.dataset.tag
      if (!tag) return
      this.triggerEvent('tagtap', { tag })
    },
  },
})
