/** 页面跳转的薄封装：统一拼接查询参数、统一兜底，避免各页面各写一份 */

export function buildUrl(path: string, query: Record<string, string | number | undefined> = {}): string {
  const pairs: string[] = []
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') return
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  })
  return pairs.length ? `${path}?${pairs.join('&')}` : path
}

export function navigateTo(url: string): void {
  wx.navigateTo({
    url,
    fail: () => {
      wx.redirectTo({ url })
    },
  })
}

export function switchTab(url: string): void {
  wx.switchTab({ url })
}

/** 返回上一页；栈底页面回退到指定 tab，避免「返回」按钮在首页失效 */
export function goBack(fallbackTab = '/pages/index/index'): void {
  let depth = 0
  try {
    depth = getCurrentPages().length
  } catch (error) {
    depth = 0
  }

  if (depth > 1) {
    wx.navigateBack({ delta: 1 })
    return
  }
  switchTab(fallbackTab)
}

export function openDetail(id: string, promptType: 'text' | 'image'): void {
  navigateTo(buildUrl('/pages/detail/index', { id, source: promptType }))
}

export function openCategory(name?: string): void {
  navigateTo(buildUrl('/pages/category/index', { name }))
}

/** 平台侧的 query 是否已解码各版本不一致，解一次失败就原样返回 */
export function safeDecode(value: string): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch (error) {
    return value
  }
}

/** 读取当前页面 query（原生页面 options 在部分版本上不可靠，这里做统一读取） */
export function readPageQuery(): Record<string, string> {
  try {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as { options?: Record<string, string> } | undefined
    return (current && current.options) || {}
  } catch (error) {
    return {}
  }
}
