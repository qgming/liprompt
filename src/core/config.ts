/** 远程数据与服务配置。所有域名都必须在小程序后台加入 request / download 白名单。 */

const CDN_BASE = 'https://pages.qgming.com/ljprompt'

/**
 * 数据源：云端整包 JSON，直接使用，不做任何本地再加工。
 *
 * 这样「云端更新 → 客户端生效」之间没有任何人工步骤：数据变了客户端下次拉取就是新的。
 * 代价是整包较大（文本约 1.7MB），因此配套两项措施：
 *   1. data-file.ts 把正文落到文件系统（storage 单 key 上限 1MB 装不下整包）；
 *   2. prompt-repository 用 ETag 条件请求 + 分级节流，避免每次冷启动都重下。
 */
export const DATA_SOURCES = {
  text: [`${CDN_BASE}/textprompt.json`],
  image: [`${CDN_BASE}/gptimage.json`, `${CDN_BASE}/starimage.json`],
}

export const REQUEST_TIMEOUT = 20000

export const STORAGE_KEYS = {
  /** 列表索引（约 196KB），体积小，可整包放 storage 用于秒开首屏 */
  textIndex: 'lp_text_index_v1',
  imageIndex: 'lp_image_index_v1',
  /** 各数据源的 ETag，用于条件请求 */
  textEtag: 'lp_etag_text_v1',
  imageEtag: 'lp_etag_image_v1',
  /** 上次成功向云端校验数据的时间戳，用于节流 */
  textCheckedAt: 'lp_checked_text_v1',
  imageCheckedAt: 'lp_checked_image_v1',
  favorites: 'lp_favorites_v1',
  recentSearch: 'lp_recent_search_v1',
}

/** 正文的文件缓存目录名（相对 wx.env.USER_DATA_PATH） */
export const DATA_CACHE_DIR = 'lp-data'

/**
 * 向云端校验数据的最小间隔（毫秒）。
 *
 * 注意：当前托管（Cloudflare 回源，cf-cache-status: DYNAMIC）**不返回 ETag / Last-Modified**，
 * 所以 http.ts 里的 If-None-Match 拿不到 304，每次校验都等于完整下载整包（文本约 1.65MB）。
 * 数据是月级更新，因此把间隔放宽到 24 小时：最多晚一天拿到更新，但平均每天只下一次。
 * 若托管方以后能给出 ETag（例如在 Cloudflare 加 Cache Rule 让该路径进缓存），
 * 条件请求会自动开始生效，届时可把这里调小。
 */
export const CHECK_INTERVAL = 24 * 60 * 60 * 1000

/**
 * 图片镜像顺序。
 * 默认保持 raw.githubusercontent.com（现有白名单内）；jsDelivr 需要自行在小程序后台
 * 把 cdn.jsdelivr.net 加入 downloadFile 白名单后，再把它放到首位。
 */
export const IMAGE_MIRRORS = [
  { name: 'github', prefix: 'https://raw.githubusercontent.com', enabled: true },
  { name: 'gitee', prefix: 'https://gitee.com', enabled: true },
]

export const IMAGE_MIRROR_STATE_KEY = 'lp_image_mirror_v1'

/** storage 保护：单个缓存超过此字节数就不再写入 */
export const MAX_CACHE_BYTES = 1024 * 1024

/** 首页/图片页每次追加的条目数 */
export const PAGE_SIZE = 24
