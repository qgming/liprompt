import { warmUp } from './repositories/index'

App({
  globalData: {
    /** 数据是否已就绪，页面可据此决定要不要展示骨架屏 */
    dataReady: false,
  },

  onLaunch() {
    // 只做后台预热，不阻塞启动；页面自身也会发起加载并兜底
    warmUp()
  },
})
