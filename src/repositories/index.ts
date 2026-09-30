/**
 * 仓储装配点 —— 唯一决定「用哪个实现」的地方。
 * 将来接入云端时，只改这里的两行赋值。
 */

import { FavoriteRepository, PromptRepository } from './types'
import { RemotePromptRepository } from './prompt-repository'
import { LocalFavoriteRepository } from './favorite-repository'

export const promptRepository: PromptRepository = new RemotePromptRepository()
export const favoriteRepository: FavoriteRepository = new LocalFavoriteRepository()

/** 启动预热：只拉文本索引，不阻塞首屏，失败静默由页面各自兜底 */
export function warmUp(): void {
  promptRepository.loadIndex('text').catch(() => {
    // 预热失败不打扰用户，页面会自行重试并展示错误态
  })
}

export { ALL_CATEGORY_NAME, FEATURED_CATEGORY_NAME } from './prompt-repository'
