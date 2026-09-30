/**
 * 瀑布流分列。
 *
 * 两列等宽，因此「一张卡片落在哪一列」不会改变它自身的高度，分列问题就退化成
 * 按高度做贪心装箱。高度来源有两种：
 *   图片卡片 —— 图片加载完成后 image 组件回报真实宽高比，用真实比例；
 *   文本卡片 —— 文字高度在渲染前即可推算（列宽与字号都是常量），用解析式估算，
 *              不在渲染后测量，避免测量 → 重排 → 再测量的抖动。
 */

export interface WaterfallInput<T> {
  items: T[]
  columns: number
  /** id -> 已知高度权重（优先使用，例如图片实测比例） */
  heights: Record<string, number>
  /** 缺少实测值时的兜底估算 */
  estimate: (item: T) => number
  getId: (item: T) => string
}

export interface WaterfallResult<T> {
  columns: T[][]
  totals: number[]
}

export function distribute<T>(input: WaterfallInput<T>): WaterfallResult<T> {
  const { items, columns, heights, estimate, getId } = input
  const buckets: T[][] = Array.from({ length: columns }, () => [])
  const totals = new Array(columns).fill(0)

  items.forEach((item) => {
    const measured = heights[getId(item)]
    const weight = typeof measured === 'number' && measured > 0 ? measured : estimate(item)
    const target = shortestColumnIndex(totals)

    buckets[target].push(item)
    totals[target] += weight
  })

  return { columns: buckets, totals }
}

export function shortestColumnIndex(totals: number[]): number {
  let target = 0
  for (let i = 1; i < totals.length; i += 1) {
    if (totals[i] < totals[target]) target = i
  }
  return target
}

/* ------------------------------------------------------------------ *
 * 高度估算
 *
 * 页面宽度按设计稿 750rpx 计：列表左右各留 32rpx、两列之间 16rpx，
 * 单列宽 = (750 - 64 - 16) / 2 = 335rpx；卡片左右内边距各 24rpx，
 * 正文可用宽度约 287rpx。中文在对应字号下每字约占 1 个字宽，
 * 因此「每行字数 ≈ 内宽 / 字号」，据此推算行数。
 * ------------------------------------------------------------------ */

const TEXT_CARD_PADDING = 24 + 22
const TEXT_CARD_EMOJI = 50 * 1.05 + 16
const TEXT_TITLE_LINE = 30 * 1.42
const TEXT_DESC_LINE = 24 * 1.6
const TEXT_TAG_ROW = 22 + 14 + 10
const TEXT_DESC_OFFSET = 10
const TEXT_TAG_OFFSET = 20
const TITLE_CHARS_PER_LINE = 9
const DESC_CHARS_PER_LINE = 11
const MAX_DESC_LINES = 4
const MAX_TAG_ROWS = 2

export interface TextCardInput {
  name?: string
  description?: string
  emoji?: string
  group?: string[]
}

/** 文本卡片的估算高度（rpx） */
export function estimateTextHeight(item: TextCardInput): number {
  const name = typeof item.name === 'string' ? item.name : ''
  const description = typeof item.description === 'string' ? item.description : ''
  const tagCount = Array.isArray(item.group) ? Math.min(item.group.length, 4) : 0

  const titleLines = Math.max(1, Math.ceil(name.length / TITLE_CHARS_PER_LINE))
  const descLines = Math.min(
    MAX_DESC_LINES,
    Math.max(1, Math.ceil(description.length / DESC_CHARS_PER_LINE))
  )
  // 标签一行大约放得下两个
  const tagRows = Math.min(MAX_TAG_ROWS, Math.ceil(tagCount / 2))

  let height = TEXT_CARD_PADDING
  if (item.emoji) height += TEXT_CARD_EMOJI
  height += titleLines * TEXT_TITLE_LINE
  height += TEXT_DESC_OFFSET + descLines * TEXT_DESC_LINE
  if (tagCount) height += TEXT_TAG_OFFSET + tagRows * TEXT_TAG_ROW

  return height
}

/** 图片卡片内容区的固定高度权重（标题 + 作者行 + 内边距） */
export const IMAGE_CARD_CONTENT_WEIGHT = 0.42

/** 封面还没加载出来时的默认宽高比 */
export const DEFAULT_IMAGE_RATIO = 1.2

export function imageCardWeight(ratio?: number): number {
  const value = typeof ratio === 'number' && ratio > 0 ? ratio : DEFAULT_IMAGE_RATIO
  return value + IMAGE_CARD_CONTENT_WEIGHT
}

/** 把列数组包成带稳定 key 的结构，供 WXML 的 wx:for 使用 */
export function toColumnViews<T>(columns: T[][]): Array<{ key: number; items: T[] }> {
  return columns.map((items, key) => ({ key, items }))
}

/* ------------------------------------------------------------------ *
 * 收藏卡片的估算高度
 *
 * 「我的」页收藏卡片是另一种版式：顶部一行类型徽标 + 收藏按钮，然后是 emoji、
 * 标题、作者行、标签。列宽与两列瀑布流一致（335rpx），因此标题每行同样约 9 字。
 * ------------------------------------------------------------------ */

const FAVORITE_PADDING = 28 + 28
const FAVORITE_BADGE_ROW = 42 + 18
const FAVORITE_EMOJI_BLOCK = 48 + 18
const FAVORITE_TITLE_OFFSET = 16
const FAVORITE_TITLE_LINE = 30 * 1.42
const FAVORITE_TAG_OFFSET = 18
const FAVORITE_TAG_ROW = 22 + 14 + 10
const FAVORITE_META_OFFSET = 12

export interface FavoriteCardInput {
  name?: string
  emoji?: string
  group?: string[]
  author?: string
  promptType?: string
}

export function estimateFavoriteHeight(item: FavoriteCardInput): number {
  const name = typeof item.name === 'string' ? item.name : ''
  const tagCount = Array.isArray(item.group) ? Math.min(item.group.length, 4) : 0
  const titleLines = Math.max(1, Math.ceil(name.length / TITLE_CHARS_PER_LINE))
  const tagRows = Math.min(MAX_TAG_ROWS, Math.ceil(tagCount / 2))
  const hasMeta = !!item.author && item.promptType !== 'image'

  let height = FAVORITE_PADDING + FAVORITE_BADGE_ROW
  if (item.emoji) height += FAVORITE_EMOJI_BLOCK
  height += FAVORITE_TITLE_OFFSET + titleLines * FAVORITE_TITLE_LINE
  if (hasMeta) height += FAVORITE_META_OFFSET
  if (tagCount) height += FAVORITE_TAG_OFFSET + tagRows * FAVORITE_TAG_ROW

  return height
}
