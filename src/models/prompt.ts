/** 提示词类型：文本提示词 / 图片案例 */
export type PromptType = 'text' | 'image'

/** 列表索引条目：只有列表渲染需要的字段，体积小、可整包缓存 */
export interface PromptIndexItem {
  id: string
  name: string
  description: string
  emoji: string
  group: string[]
  promptType: PromptType
  /** 仅图片案例：封面图 */
  coverImage?: string
  /** 仅图片案例：作者 */
  author?: string
  /** 仅图片案例：主分类 */
  section?: string
  /** 仅图片案例：图片张数 */
  images?: number
}

/** 正文与图集，整包下载后落到本地文件缓存 */
export interface PromptDetail {
  prompt: string
  images?: string[]
}

/** 列表渲染用的视图模型：索引 + 关键词高亮分段 */
export interface HighlightSegment {
  text: string
  hit: boolean
}

export interface PromptViewItem extends PromptIndexItem {
  nameParts: HighlightSegment[]
  descParts: HighlightSegment[]
  tags: string[]
}

/** 收藏记录：只存展示必需字段，避免整包正文占满 storage */
export interface FavoriteItem {
  id: string
  promptType: PromptType
  name: string
  description: string
  emoji: string
  group: string[]
  author: string
  coverImage: string
  createdAt: number
}
