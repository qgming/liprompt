/** 防抖：搜索输入、瀑布流重排等高频触发场景共用 */

export interface Debounced<A extends unknown[]> {
  (...args: A): void
  /** 立即执行尚未触发的调用，用于页面卸载前收尾 */
  flush(): void
  cancel(): void
}

export function debounce<A extends unknown[]>(
  handler: (...args: A) => void,
  wait = 200
): Debounced<A> {
  let timer: number | null = null
  let lastArgs: A | null = null

  const run = (): void => {
    timer = null
    if (!lastArgs) return
    const args = lastArgs
    lastArgs = null
    handler(...args)
  }

  const debounced = ((...args: A): void => {
    lastArgs = args
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(run, wait)
  }) as Debounced<A>

  debounced.flush = (): void => {
    if (timer === null) return
    clearTimeout(timer)
    run()
  }

  debounced.cancel = (): void => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    lastArgs = null
  }

  return debounced
}
