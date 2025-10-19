# 提示词库小程序

这是一个基于uniapp开发的微信小程序，提供专业的AI提示词库功能。

## 功能特点

- 📚 提示词库：收录大量专业AI提示词
- 🔍 智能搜索：支持按名称、描述、分类搜索
- 🏷️ 分类浏览：按类别组织提示词
- 📱 响应式设计：适配不同屏幕尺寸
- ⚡ 快速复制：一键复制提示词到剪贴板

## 项目结构

```
liprompt/
├── pages/
│   ├── index/          # 首页
│   └── category/       # 分类页面
├── static/
│   ├── prompts.json    # 提示词数据
│   └── tabs/           # 导航栏图标
├── pages.json          # 页面配置
├── manifest.json       # 应用配置
└── App.vue            # 应用入口
```

## 数据加载说明

### 当前方案
- **位置**：`/static/prompts.json`
- **大小**：约1.6MB
- **加载方式**：使用`uni.request()`异步加载
- **超时设置**：30秒

### 优化建议

#### 1. 数据分包加载
```javascript
// 按分类拆分JSON文件
// prompts/
// ├── career.json    # 职业类
// ├── business.json  # 商业类
// └── tools.json     # 工具类
```

#### 2. 懒加载策略
- 首次只加载热门提示词和分类列表
- 点击分类时再加载对应数据
- 实现分页加载减少初始加载时间

#### 3. 数据压缩
- 移除提示词中的冗余空白字符
- 使用gzip压缩（需要服务器支持）
- 精简描述文本长度

#### 4. 缓存机制
```javascript
// 使用本地缓存
try {
  const cachedData = uni.getStorageSync('prompts_cache')
  if (cachedData && cachedData.expire > Date.now()) {
    prompts.value = cachedData.data
  } else {
    // 重新加载并缓存
    loadPrompts()
  }
} catch (e) {
  console.error('缓存读取失败', e)
}
```

## 开发说明

### 环境要求
- HBuilderX
- 微信开发者工具
- uniapp框架

### 运行步骤
1. 使用HBuilderX打开项目
2. 运行到微信开发者工具
3. 在微信开发者工具中预览和调试

### 注意事项
- 确保网络连接正常，首次加载数据需要一定时间
- JSON文件较大，建议在WiFi环境下加载
- 如遇到加载超时，请检查网络连接或增加超时时间

## 性能优化

1. **减少初始加载数据量**
   - 分页显示，每页20个提示词
   - 优先显示热门内容

2. **优化网络请求**
   - 设置合理的超时时间
   - 添加加载状态提示
   - 实现错误重试机制

3. **用户体验**
   - 加载动画
   - 错误提示
   - 空状态处理

## 许可证

MIT License