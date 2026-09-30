/** 统一的加载态卡片：三处页面共用，避免各写一套 loading 样式 */

Component({
  properties: {
    title: { type: String, value: '正在加载' },
    desc: { type: String, value: '' },
  },
})
