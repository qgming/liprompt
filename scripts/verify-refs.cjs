/**
 * 小程序工程静态自检。
 *
 * 微信开发者工具只在运行时才暴露「事件处理函数写错名字」「组件没声明」这类问题，
 * 那时往往已经在真机上点了半天。这里在编译前把四类引用关系对齐检查一遍：
 *   1. WXML 里 bind/catch 绑定的处理函数，是否在对应的 .ts 里定义
 *   2. WXML 里用到的 lp-* 自定义组件，是否写进了同名 .json 的 usingComponents
 *   3. usingComponents 声明的路径，是否真的有对应文件
 *   4. app.json 的 tabBar 图标文件是否存在
 *
 * 用法：npm run verify
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')

function walk(dir, filter) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full, filter))
    else if (!filter || filter(full)) out.push(full)
  }
  return out
}

const rel = (file) => path.relative(ROOT, file).replace(/\\/g, '/')

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    return null
  }
}

/** 收集 WXML 里 bind:xxx="handler" / catchtap="handler" 形式绑定的处理函数名 */
function collectHandlers(wxml) {
  const names = new Set()
  const pattern = /(?:bind|catch)[:]?[a-zA-Z-]+\s*=\s*"([^"{}]+)"/g
  let match = pattern.exec(wxml)
  while (match) {
    names.add(match[1].trim())
    match = pattern.exec(wxml)
  }
  return names
}

/** 粗略判断脚本里是否存在该成员（方法简写、箭头函数属性、赋值都算） */
function hasMember(script, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[\\s,{])${escaped}\\s*[:(]`, 'm').test(script)
}

function main() {
  const problems = []
  const wxmlFiles = walk(SRC, (file) => file.endsWith('.wxml'))

  // 1 + 2：事件处理函数与组件声明
  for (const wxml of wxmlFiles) {
    const base = wxml.replace(/\.wxml$/, '')
    const scriptFile = ['.ts', '.js'].map((ext) => base + ext).find((f) => fs.existsSync(f))
    const markup = fs.readFileSync(wxml, 'utf8')

    if (!scriptFile) {
      problems.push(`${rel(wxml)} 缺少同名脚本文件（.ts / .js）`)
    } else {
      const script = fs.readFileSync(scriptFile, 'utf8')
      for (const handler of collectHandlers(markup)) {
        // 带 {{}} 的是动态绑定，跳过
        if (handler.includes('{{')) continue
        if (!hasMember(script, handler)) {
          problems.push(`${rel(wxml)} 绑定的事件处理函数 "${handler}" 未在 ${path.basename(scriptFile)} 中定义`)
        }
      }
    }

    const jsonFile = base + '.json'
    const config = fs.existsSync(jsonFile) ? readJson(jsonFile) || {} : {}
    const declared = new Set(Object.keys(config.usingComponents || {}))

    for (const tag of new Set(markup.match(/<([a-z][a-z0-9]*-[a-z0-9-]+)/g) || [])) {
      const name = tag.slice(1)
      if (!name.startsWith('lp-')) continue
      if (!declared.has(name)) {
        problems.push(`${rel(wxml)} 使用了组件 <${name}> 但未在 its json 的 usingComponents 中声明`)
      }
    }
  }

  // 3：usingComponents 声明的路径是否存在
  for (const jsonFile of walk(SRC, (file) => file.endsWith('.json'))) {
    const config = readJson(jsonFile)
    if (!config || !config.usingComponents) continue

    for (const [name, target] of Object.entries(config.usingComponents)) {
      const resolved = target.startsWith('/')
        ? path.join(SRC, target.replace(/^\//, ''))
        : path.resolve(path.dirname(jsonFile), target)

      // 组件的逻辑文件在 src 里是 .ts，编译后才变成 .js，两者都算存在
      const required = ['.wxml', '.json', ['.ts', '.js']]
      required.forEach((ext) => {
        const candidates = Array.isArray(ext) ? ext : [ext]
        const found = candidates.some((candidate) => fs.existsSync(resolved + candidate))
        if (!found) {
          problems.push(
            `${rel(jsonFile)} 声明的组件 "${name}" -> ${target} 缺少 ${path.basename(target)}${candidates.join(' / ')}`
          )
        }
      })
    }
  }

  // 4：app.json 的 tabBar 图标
  const appJson = readJson(path.join(SRC, 'app.json'))
  const tabList = (appJson && appJson.tabBar && appJson.tabBar.list) || []
  tabList.forEach((item) => {
    ;['iconPath', 'selectedIconPath'].forEach((key) => {
      const icon = item[key]
      if (!icon) return
      // tabBar 图标相对小程序根目录（即仓库根目录），不走 src/
      if (!fs.existsSync(path.join(ROOT, icon))) {
        problems.push(`app.json 的 ${key} 指向的文件不存在：${icon}`)
      }
    })
  })

  console.log(
    `[verify] 检查 ${wxmlFiles.length} 个 WXML、` +
      `${walk(SRC, (f) => f.endsWith('.json')).length} 个 JSON、${tabList.length} 个 tabBar 项`
  )

  if (problems.length) {
    console.error(`[verify] 发现 ${problems.length} 个问题：`)
    problems.forEach((item) => console.error(`  - ${item}`))
    process.exitCode = 1
    return
  }

  console.log('[verify] 全部通过')
}

main()
