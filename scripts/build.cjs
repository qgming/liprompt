/**
 * 把 src/ 下的 TypeScript 与 Sass 源码编译成根目录可直接发布的小程序产物。
 *   .ts   -> esbuild -> .js
 *   .scss -> sass    -> .wxss（下划线开头的 partial 不产出）
 *   其余文件（.wxml / .json / 图片）原样拷贝
 *
 * 为什么产物直接落在仓库根目录：微信开发者工具与平台发布链路都按「根目录即小程序根」
 * 工作，这样 src/ 是唯一的书写位置，根目录里就是可直接预览发布的工程。
 * 生成的产物都在 .gitignore 里，不参与版本管理。
 *
 * 用法：
 *   npm run build      编译一次
 *   npm run watch      监听 src/ 变化增量编译
 *   npm run clean      删除全部产物
 */

const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')
const sass = require('sass')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const TARGET = 'es2018'

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function outPathFor(srcFile) {
  return path.join(ROOT, path.relative(SRC, srcFile))
}

/** 下划线开头的 scss 是 partial，只被 @use 引入，不单独产出 */
function isPartial(file) {
  return path.basename(file).startsWith('_')
}

/** 类型声明文件不产出 JS */
function isDeclaration(file) {
  return file.endsWith('.d.ts')
}

function sourceFiles() {
  return walk(SRC).filter((file) => !isPartial(file) && !isDeclaration(file))
}

function targetOf(file) {
  const ext = path.extname(file)
  const target = outPathFor(file)
  if (ext === '.ts') return target.replace(/\.ts$/, '.js')
  if (ext === '.scss') return target.replace(/\.scss$/, '.wxss')
  return target
}

async function compileOne(file) {
  const ext = path.extname(file)
  const target = targetOf(file)
  ensureDir(path.dirname(target))

  if (ext === '.ts') {
    const result = await esbuild.transform(fs.readFileSync(file, 'utf8'), {
      loader: 'ts',
      format: 'cjs',
      target: TARGET,
      // 保留中文字面量：默认 ascii 会把每个汉字转成 \uXXXX，白白撑大包体
      charset: 'utf8',
      sourcefile: file,
    })
    fs.writeFileSync(target, result.code, 'utf8')
    return 'ts'
  }

  if (ext === '.scss') {
    const result = sass.compileString(fs.readFileSync(file, 'utf8'), {
      loadPaths: [path.dirname(file), path.join(SRC, 'styles')],
      style: 'expanded',
    })
    fs.writeFileSync(target, result.css, 'utf8')
    return 'scss'
  }

  fs.copyFileSync(file, target)
  return 'copy'
}

function clean() {
  let removed = 0
  for (const file of sourceFiles()) {
    const target = targetOf(file)
    if (fs.existsSync(target)) {
      fs.unlinkSync(target)
      removed += 1
    }
  }
  console.log(`[clean] 已移除 ${removed} 个产物文件`)
}

/** 产物自检：app 三件套与每个页面的四件套是否齐全，问题早发现 */
function verify() {
  const problems = []

  ;['app.js', 'app.json', 'app.wxss'].forEach((name) => {
    if (!fs.existsSync(path.join(ROOT, name))) problems.push(`缺少 ${name}`)
  })

  const appJsonPath = path.join(ROOT, 'app.json')
  if (fs.existsSync(appJsonPath)) {
    let pages = []
    try {
      pages = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).pages || []
    } catch (error) {
      problems.push('app.json 无法解析')
    }

    pages.forEach((page) => {
      ;['js', 'wxml', 'json', 'wxss'].forEach((ext) => {
        const file = path.join(ROOT, `${page}.${ext}`)
        if (!fs.existsSync(file)) problems.push(`缺少页面文件 ${page}.${ext}`)
      })
    })
  }

  return problems
}

async function buildOnce() {
  const started = Date.now()
  const files = sourceFiles()
  const counts = { ts: 0, scss: 0, copy: 0 }

  for (const file of files) {
    try {
      const kind = await compileOne(file)
      counts[kind] += 1
    } catch (error) {
      console.error(`[build] 失败: ${path.relative(ROOT, file)}`)
      console.error(error && error.message ? error.message : error)
      process.exitCode = 1
      return false
    }
  }

  const problems = verify()

  console.log(
    `[build] 完成：ts ${counts.ts} / scss ${counts.scss} / 拷贝 ${counts.copy}，` +
      `耗时 ${Date.now() - started}ms`
  )

  if (problems.length) {
    console.error('[build] 产物自检未通过:')
    problems.forEach((item) => console.error(`  - ${item}`))
    process.exitCode = 1
    return false
  }

  console.log('[build] 产物自检通过')
  return true
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--clean')) {
    clean()
    return
  }

  await buildOnce()

  if (args.includes('--watch')) {
    console.log('[watch] 监听 src/ 变化…')
    let timer = null
    fs.watch(SRC, { recursive: true }, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => buildOnce(), 150)
    })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
