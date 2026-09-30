/** 图片地址与镜像切换：GitHub raw 与 Gitee raw 之间互转，失败自动降级 */

import { IMAGE_MIRRORS, IMAGE_MIRROR_STATE_KEY } from './config'
import { readString, writeString } from './storage'

interface RawParts {
  owner: string
  repo: string
  branch: string
  path: string
}

const GITHUB_RAW = 'https://raw.githubusercontent.com'
const GITEE_HOST = 'https://gitee.com'

function parseGithubRaw(url: string): RawParts | null {
  if (typeof url !== 'string' || !url.startsWith(GITHUB_RAW)) return null

  const segments = url.slice(GITHUB_RAW.length).replace(/^\//, '').split('/')
  if (segments.length < 5) return null

  const [owner, repo] = segments
  if (segments[2] === 'refs' && segments[3] === 'heads') {
    const branch = segments[4]
    const path = segments.slice(5).join('/')
    return branch && path ? { owner, repo, branch, path } : null
  }

  const branch = segments[2]
  const path = segments.slice(3).join('/')
  return branch && path ? { owner, repo, branch, path } : null
}

function buildGithubUrl(parts: RawParts): string {
  return `${GITHUB_RAW}/${parts.owner}/${parts.repo}/refs/heads/${parts.branch}/${parts.path}`
}

function buildGiteeUrl(parts: RawParts): string {
  return `${GITEE_HOST}/${parts.owner}/${parts.repo}/raw/${parts.branch}/${parts.path}`
}

function isEnabled(name: string): boolean {
  const mirror = IMAGE_MIRRORS.find((item) => item.name === name)
  return !!mirror && mirror.enabled
}

let preferred = readString(IMAGE_MIRROR_STATE_KEY) || 'github'
if (!isEnabled(preferred)) preferred = 'github'

/** 把图片地址解析成当前优先镜像下的可用地址 */
export function resolveImageUrl(url: string): string {
  if (!url) return ''

  const parts = parseGithubRaw(url)
  if (!parts) return url
  if (preferred === 'gitee') return buildGiteeUrl(parts)
  return buildGithubUrl(parts)
}

/** 图片加载失败时上报，连续失败会把优先镜像切到另一个源 */
let failureCount = 0
export function reportImageFailure(url: string): void {
  if (!parseGithubRaw(url)) return

  failureCount += 1
  if (failureCount < 3) return

  failureCount = 0
  const next = preferred === 'github' ? 'gitee' : 'github'
  if (!isEnabled(next)) return

  preferred = next
  writeString(IMAGE_MIRROR_STATE_KEY, next)
}

export function reportImageSuccess(): void {
  failureCount = 0
}

export function currentMirror(): string {
  return preferred
}

/** 与镜像无关的稳定 key，用于本地文件缓存的索引 */
export function canonicalImageKey(url: string): string {
  const parts = parseGithubRaw(url)
  return parts ? buildGithubUrl(parts) : url || ''
}

/** 按优先级给出同一个资源的多个可用地址，供下载失败时依次重试 */
export function imageMirrorCandidates(url: string): string[] {
  if (!url) return []

  const parts = parseGithubRaw(url)
  if (!parts) return [url]

  const primary = preferred === 'gitee' ? buildGiteeUrl(parts) : buildGithubUrl(parts)
  const fallback = preferred === 'gitee' ? buildGithubUrl(parts) : buildGiteeUrl(parts)
  const fallbackName = preferred === 'gitee' ? 'github' : 'gitee'

  return isEnabled(fallbackName) ? [primary, fallback] : [primary]
}
