<template>
	<view class="container">
		<!-- 固定顶部 -->
		<view class="fixed-header" :style="headerStyle">
			<view class="header-content">
				<text class="title-gradient">流金提示词</text>
			</view>
		</view>

		<!-- 滚动内容区域 -->
		<scroll-view scroll-y class="scroll-content" :style="{ paddingTop: scrollPaddingTop }" show-scrollbar="false">
			<!-- 搜索栏 -->
			<view class="search-section">
				<view class="search-box">
					<input class="search-input" type="text" v-model="searchKeyword" placeholder="搜索提示词..."
						@input="handleSearch" />
					<view class="search-icon">🔍</view>
				</view>
			</view>
			<!-- 精选提示词 -->
			<view v-if="!searchKeyword" class="featured-section">
				<view class="section-title">
					<text class="title-text">精选提示词</text>
				</view>

				<view class="featured-list">
					<view class="featured-prompt" v-for="prompt in featuredPrompts" :key="prompt.id"
						@click="viewPromptDetail(prompt)">
						<view class="featured-emoji">{{ prompt.emoji }}</view>
						<view class="featured-content">
							<text class="featured-name">{{ prompt.name }}</text>
							<text class="featured-desc">{{ prompt.description }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 随机推荐横向滚动 -->
			<view v-if="!searchKeyword" class="trending-section">
				<view class="section-title">
					<text class="title-text">随机推荐</text>
					<text class="title-desc">滑动查看更多</text>
				</view>

				<scroll-view scroll-x class="trending-scroll" show-scrollbar="false">
					<view class="trending-list">
						<view class="trending-card" v-for="prompt in randomPrompts" :key="prompt.id"
							@click="viewPromptDetail(prompt)">
							<view class="trending-emoji">{{ prompt.emoji }}</view>
							<text class="trending-name">{{ prompt.name }}</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 搜索结果或全部提示词 -->
			<view class="prompts-section">
				<view class="section-title">
					<text class="title-text">{{ searchKeyword ? '搜索结果' : '全部提示词' }}</text>
					<text class="title-count">({{ totalPages > 0 ? `${currentPage}/${totalPages}` : '0' }})</text>
				</view>

				<view class="prompt-list">
					<view class="prompt-card" v-for="prompt in paginatedPrompts" :key="prompt.id"
						@click="viewPromptDetail(prompt)">
						<view class="prompt-header">
							<view class="prompt-emoji">{{ prompt.emoji }}</view>
							<view class="prompt-info">
								<text class="prompt-name">{{ prompt.name }}</text>
								<text class="prompt-desc">{{ prompt.description }}</text>
							</view>
						</view>
						<view class="prompt-tags">
							<text class="tag" v-for="tag in prompt.group" :key="tag" @click.stop="goToCategory(tag)">
								{{ tag }}
							</text>
						</view>
					</view>
				</view>

				<!-- 分页控件 -->
				<view v-if="totalPages > 1" class="pagination">
					<view class="page-btn prev-btn" :class="{ disabled: currentPage <= 1 }" @click="prevPage">
						上一页
					</view>
					<view class="page-info">
						{{ currentPage }} / {{ totalPages }}
					</view>
					<view class="page-btn next-btn" :class="{ disabled: currentPage >= totalPages }" @click="nextPage">
						下一页
					</view>
				</view>

				<!-- 空状态 -->
				<view v-if="paginatedPrompts.length === 0" class="empty-state">
					<view class="empty-icon">📝</view>
					<text class="empty-text">暂无相关提示词</text>
					<text class="empty-desc">试试其他关键词吧</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getAllPrompts, getAllCategories } from '@/data/prompts.js'

const searchKeyword = ref('')
const prompts = ref([])
const categories = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// 胶囊按钮位置信息
const menuButtonInfo = ref({})
// 计算后的样式
const headerStyle = ref({})
// 计算滚动区域的padding-top
const scrollPaddingTop = ref('150rpx')

// 计算精选提示词（筛选分组为'精选'的提示词）
const featuredPrompts = computed(() => {
	if (!searchKeyword.value && prompts.value.length > 0) {
		return prompts.value.filter(prompt =>
			prompt.group && prompt.group.includes('精选')
		).slice(0, 5)
	}
	return []
})

// 计算随机推荐提示词（横向滚动）
const randomPrompts = computed(() => {
	if (!searchKeyword.value) {
		// 随机选择10个提示词作为随机推荐
		const shuffled = [...prompts.value].sort(() => 0.5 - Math.random())
		return shuffled.slice(0, 10)
	}
	return []
})

// 计算过滤后的提示词
const filteredPrompts = computed(() => {
	if (!prompts.value.length) return []

	let filtered = prompts.value

	if (searchKeyword.value) {
		filtered = prompts.value.filter(prompt =>
			prompt.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
			prompt.description.toLowerCase().includes(searchKeyword.value.toLowerCase())
		)
	}

	return filtered
})

// 计算总页数
const totalPages = computed(() => {
	return Math.ceil(filteredPrompts.value.length / pageSize.value)
})

// 计算当前页的提示词
const paginatedPrompts = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value
	const end = start + pageSize.value
	return filteredPrompts.value.slice(start, end)
})

// 获取分类表情符号
const getCategoryEmoji = (category) => {
	const emojiMap = {
		'职业': '💼',
		'商业': '📊',
		'工具': '🔧',
		'生活': '🏠',
		'教育': '📚',
		'娱乐': '🎮',
		'技术': '💻',
		'创意': '✨',
		'健康': '🏥',
		'金融': '💰',
		'营销': '📈',
		'写作': '✍️',
		'设计': '🎨',
		'分析': '📈',
		'开发': '⚙️',
		'管理': '📋'
	}
	return emojiMap[category] || '📂'
}

// 获取分类下的提示词数量
const getCategoryCount = (category) => {
	return prompts.value.filter(prompt =>
		prompt.group.includes(category)
	).length
}

// 防抖函数
const debounce = (func, wait) => {
	let timeout
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout)
			func(...args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

// 处理搜索 - 带防抖
const handleSearch = debounce(() => {
	currentPage.value = 1
}, 300)

// 跳转到分类页面
const goToCategory = (category) => {
	uni.switchTab({
		url: '/pages/category/index'
	})
	// 延迟设置选中的分类，确保页面已加载
	setTimeout(() => {
		uni.$emit('selectCategory', category)
	}, 100)
}

// 查看提示词详情
const viewPromptDetail = (prompt) => {
	// 将提示词内容存储到本地
	uni.setStorageSync('currentPrompt', prompt)
	// 跳转到详情页面
	uni.navigateTo({
		url: '/pages/detail/index'
	})
}

// 分页控制
const prevPage = () => {
	if (currentPage.value > 1) {
		currentPage.value--
	}
}

const nextPage = () => {
	if (currentPage.value < totalPages.value) {
		currentPage.value++
	}
}

// 加载提示词数据 - 使用新的数据加载方式
const loadPrompts = async () => {
	try {
		loading.value = true

		// 直接从数据模块加载所有提示词
		const allPrompts = getAllPrompts()
		const allCategories = getAllCategories()

		prompts.value = allPrompts
		categories.value = allCategories

		console.log('成功加载', prompts.value.length, '个提示词')
		console.log('分类:', categories.value)
	} catch (error) {
		console.error('加载提示词失败:', error)
	} finally {
		loading.value = false
	}
}

// 获取胶囊按钮位置信息并计算样式
const getMenuButtonStyle = () => {
	try {
		const systemInfo = uni.getSystemInfoSync()
		const menuButton = uni.getMenuButtonBoundingClientRect()

		menuButtonInfo.value = menuButton

		// 计算顶部安全距离（状态栏高度）
		const statusBarHeight = systemInfo.statusBarHeight || 0

		// 计算胶囊按钮的高度和上边距
		const menuButtonHeight = menuButton.height
		const menuButtonTop = menuButton.top - statusBarHeight

		// 计算header的样式 - 文字与胶囊按钮上下对齐，文字左边距等于胶囊按钮右边距
		const headerHeight = menuButtonHeight + menuButtonTop * 2
		const textLeftMargin = systemInfo.windowWidth - menuButton.right

		headerStyle.value = {
			paddingTop: `${statusBarHeight}px`,
			paddingLeft: `${textLeftMargin}px`,
			paddingRight: `${textLeftMargin}px`,
			height: `${headerHeight}px`
		}

		// 计算滚动区域的padding-top（转换为rpx）
		const rpxRatio = 750 / systemInfo.windowWidth
		const scrollPadding = Math.round(headerHeight * rpxRatio)
		// 增加更多的间距，确保搜索框完全不被遮挡
		const extraPadding = 100 // 额外100rpx间距
		scrollPaddingTop.value = `${scrollPadding + extraPadding}rpx`

		console.log('胶囊按钮信息:', menuButton)
		console.log('计算后的样式:', headerStyle.value)
	} catch (error) {
		console.error('获取胶囊按钮位置失败:', error)
		// 使用默认值
		headerStyle.value = {
			paddingTop: '44px',
			paddingLeft: '32rpx',
			paddingRight: '32rpx',
			height: '88px'
		}
		// 设置默认的滚动区域padding-top
		scrollPaddingTop.value = '200rpx'
	}
}

// 监听来自分类页面的事件
onMounted(() => {
	loadPrompts()
	getMenuButtonStyle()

	// 监听分类页面传递的选中分类
	uni.$on('selectCategory', (category) => {
		searchKeyword.value = ''
		// 这里可以处理选中分类的逻辑
	})
})

// 组件卸载时移除事件监听
onUnmounted(() => {
	uni.$off('selectCategory')
})
</script>

<style>
.container {
	width: 100vw;
	height: 100vh;
	background: #ffffff;
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
	display: flex;
	flex-direction: column;
}

/* 固定顶部区域 */
.fixed-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: #ffffff;
}

/* 自定义头部样式 */
.header {
	border-bottom: 1rpx solid #f0f0f0;
	display: flex;
	align-items: center;
}

.header-content {
	display: flex;
	align-items: center;
	height: 100%;
	justify-content: flex-start;
}

/* 滚动内容区域 */
.scroll-content {
	flex: 1;
}

.title-gradient {
	font-size: 48rpx;
	font-weight: 700;
	background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6347 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	letter-spacing: 2rpx;
	text-shadow: 0 2rpx 8rpx rgba(255, 215, 0, 0.2);
}

/* 搜索区域 */
.search-section {
	padding: 24rpx 32rpx;
	background: #ffffff;
	border: none;
}

.search-box {
	position: relative;
	display: flex;
	align-items: center;
}

.search-input {
	flex: 1;
	height: 80rpx;
	padding: 0 80rpx 0 28rpx;
	background: #f5f5f7;
	border: none;
	border-radius: 24rpx;
	font-size: 30rpx;
	color: #1d1d1f;
	transition: all 0.2s ease;
}

.search-input:focus {
	background: #e8e8ed;
}

.search-input::placeholder {
	color: #8e8e93;
}

.search-icon {
	position: absolute;
	right: 28rpx;
	font-size: 32rpx;
	color: #8e8e93;
}


/* 章节标题 */
.section-title {
	margin-bottom: 24rpx;
}

.title-text {
	display: block;
	font-size: 36rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 8rpx;
}

.title-desc {
	display: block;
	font-size: 26rpx;
	color: #8e8e93;
}

.title-count {
	font-size: 26rpx;
	color: #8e8e93;
}

/* 精选提示词 */
.featured-section {
	margin-top: 32rpx;
	padding: 0 32rpx;
}

.featured-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.featured-prompt {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	display: flex;
	align-items: flex-start;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.featured-prompt:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.featured-prompt::after {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.02) 100%);
	border-radius: 20rpx;
	opacity: 0;
	transition: opacity 0.2s ease;
	pointer-events: none;
}

.featured-prompt:active::after {
	opacity: 1;
}

.featured-emoji {
	font-size: 44rpx;
	margin-right: 20rpx;
	margin-top: 4rpx;
	width: 44rpx;
	text-align: center;
}

.featured-content {
	flex: 1;
}

.featured-name {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 8rpx;
}

.featured-desc {
	display: block;
	font-size: 26rpx;
	color: #8e8e93;
	line-height: 1.4;
}

/* 热门推荐横向滚动 */
.trending-section {
	margin-top: 48rpx;
	padding: 0 32rpx;
}

.trending-scroll {
	white-space: nowrap;
}

.trending-list {
	display: flex;
	gap: 16rpx;
	padding-bottom: 8rpx;
}

.trending-card {
	background: #ffffff;
	border-radius: 16rpx;
	padding: 20rpx 24rpx;
	min-width: 140rpx;
	max-width: 180rpx;
	text-align: center;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
}

.trending-card:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.trending-emoji {
	font-size: 40rpx;
	margin-bottom: 12rpx;
}

.trending-name {
	display: block;
	font-size: 26rpx;
	font-weight: 500;
	color: #1d1d1f;
	line-height: 1.3;
	word-break: break-all;
	overflow-wrap: break-word;
}

/* 分页控件 */
.pagination {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 24rpx;
	margin-top: 32rpx;
	padding: 24rpx 0;
	margin-bottom: 40rpx;
}

.page-btn {
	font-size: 28rpx;
	color: #007AFF;
	padding: 12rpx 24rpx;
	border-radius: 20rpx;
	background: #f2f2f7;
	transition: all 0.2s ease;
}

.page-btn:active:not(.disabled) {
	background: #e8e8ed;
	transform: scale(0.95);
}

.page-btn.disabled {
	color: #c7c7cc;
	opacity: 0.5;
}

.page-info {
	font-size: 28rpx;
	color: #1d1d1f;
	font-weight: 500;
}

/* 提示词列表 */
.prompts-section {
	margin-top: 48rpx;
	padding: 0 32rpx;
}

.prompt-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.prompt-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
	position: relative;
}

.prompt-card:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.prompt-header {
	display: flex;
	align-items: flex-start;
	margin-bottom: 16rpx;
}

.prompt-emoji {
	font-size: 40rpx;
	margin-right: 20rpx;
	margin-top: 4rpx;
	flex-shrink: 0;
}

.prompt-info {
	flex: 1;
	min-width: 0;
}

.prompt-name {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 8rpx;
	word-break: break-all;
	overflow-wrap: break-word;
	line-height: 1.4;
}

.prompt-desc {
	display: block;
	font-size: 28rpx;
	color: #8e8e93;
	line-height: 1.4;
	word-break: break-all;
	overflow-wrap: break-word;
}

.prompt-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.tag {
	background: #f2f2f7;
	color: #8e8e93;
	font-size: 24rpx;
	padding: 8rpx 16rpx;
	border-radius: 16rpx;
	transition: all 0.2s ease;
	flex-shrink: 0;
}

.tag:active {
	background: #B8A88C;
	color: #ffffff;
}


/* 空状态 */
.empty-state {
	text-align: center;
	padding: 80rpx 40rpx;
}

.empty-icon {
	font-size: 80rpx;
	margin-bottom: 24rpx;
	opacity: 0.6;
}

.empty-text {
	display: block;
	font-size: 32rpx;
	color: #8e8e93;
	margin-bottom: 12rpx;
}

.empty-desc {
	display: block;
	font-size: 28rpx;
	color: #c7c7cc;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.search-section {
		padding: 20rpx 24rpx;
	}

	.title {
		font-size: 44rpx;
	}

	.search-section {
		padding: 20rpx 24rpx;
	}

	.scroll-content {
		padding: 0 0 32rpx;
	}

	.featured-category {
		padding: 20rpx 24rpx;
	}

	.category-emoji {
		font-size: 40rpx;
		margin-right: 16rpx;
	}

	.category-name {
		font-size: 30rpx;
	}

	.category-desc {
		font-size: 24rpx;
	}

	.trending-card {
		min-width: 120rpx;
		max-width: 160rpx;
		padding: 16rpx 20rpx;
	}

	.trending-emoji {
		font-size: 36rpx;
	}

	.trending-name {
		font-size: 24rpx;
	}
}
</style>