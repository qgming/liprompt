/**
 * 小程序宿主环境的最小类型声明。
 *
 * 只声明本项目实际用到的宿主 API，不额外引入 @types 依赖。
 *
 * Page / Component 的类型要点：
 *   - 对象字面量自身的成员（含 Page 的顶层方法与 Component 的 methods）都挂在 this 上；
 *   - 宿主注入的成员（setData / data / properties / triggerEvent）单独描述，
 *     这样 this.setData 与自定义方法都能被检查到；
 *   - properties 放宽为任意对象：组件里读的是「属性的值」，而声明的却是属性描述符
 *     （{ type, value }），逐字段推导得不偿失。
 */

type AnyRecord = Record<string, any>

interface MpInstance<TData> {
  data: TData
  setData(data: AnyRecord, callback?: () => void): void
  route: string
}

interface MpComponentInstance<TData> extends MpInstance<TData> {
  properties: AnyRecord
  triggerEvent(name: string, detail?: AnyRecord, options?: AnyRecord): void
  selectComponent(selector: string): any
}

type DataOf<T> = T extends { data: infer D } ? D : AnyRecord
type MethodsOf<T> = T extends { methods: infer M } ? M : unknown
type PageThis<TOptions> = MpInstance<DataOf<TOptions>> & Omit<TOptions, 'data'>
type ComponentThis<TOptions> = MpComponentInstance<DataOf<TOptions>> &
  MethodsOf<TOptions> &
  Omit<TOptions, 'data' | 'properties' | 'methods' | 'lifetimes' | 'observers' | 'behaviors'>

declare function Page<TOptions extends AnyRecord>(
  options: TOptions & ThisType<PageThis<TOptions>>
): void

declare function Component<TOptions extends AnyRecord>(
  options: TOptions & ThisType<ComponentThis<TOptions>>
): void

declare function App<TOptions extends AnyRecord>(
  options: TOptions & ThisType<TOptions>
): void

declare const wx: any
declare const getApp: () => any
declare const getCurrentPages: () => any[]

declare const console: {
  log(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  debug(...args: unknown[]): void
}

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number): number
declare function clearTimeout(handle: number): void
declare function setInterval(handler: (...args: unknown[]) => void, timeout?: number): number
declare function clearInterval(handle: number): void
