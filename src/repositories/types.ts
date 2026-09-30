/**
 * 仓储接口。页面只依赖这里的抽象，具体实现可替换：
 * 现在默认用本地存储与 CDN JSON，将来接云端时新增一个实现即可，页面无需改动。
 */

import { FavoriteItem, PromptDetail, PromptIndexItem, PromptType } from '../models/prompt'

export interface PromptRepository {
  /**
   * 加载列表索引。
   * 命中本地缓存时**立即返回缓存**，随后在后台向云端校验；有更新则发 DATA_UPDATED 事件。
   * force=true 时跳过缓存与节流，直接向云端拉取。
   */
  loadIndex(type: PromptType, force?: boolean): Promise<PromptIndexItem[]>
  /** 已加载的索引，未加载时返回空数组 */
  peekIndex(type: PromptType): PromptIndexItem[]
  /** 按 id 取索引条目 */
  findIndexItem(id: string): PromptIndexItem | null
  /** 取正文；本地没有时会补一次网络加载 */
  getDetail(type: PromptType, id: string): Promise<PromptDetail | null>
  /** 强制刷新全部数据 */
  refresh(): Promise<void>
  /** 当前数据来源，用于「我的」页展示 */
  sourceMode(): 'remote' | 'cache' | 'unknown'
}

export interface FavoriteRepository {
  list(): Promise<FavoriteItem[]>
  listSync(): FavoriteItem[]
  isFavorite(id: string): boolean
  toggle(item: FavoriteItem): Promise<boolean>
  count(): number
}
