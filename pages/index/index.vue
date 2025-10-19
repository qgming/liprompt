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
					<text class="title-text">精选</text>
				</view>

				<view class="featured-list">
					<prompt-card v-for="prompt in featuredPrompts" :key="prompt.id" :prompt="prompt" @click="viewPromptDetail"
						@tagClick="goToCategory" />
				</view>
			</view>

			<!-- 随机推荐横向滚动 -->
			<view v-if="!searchKeyword" class="trending-section">
				<view class="section-title">
					<text class="title-text">推荐</text>
				</view>

				<scroll-view scroll-x class="trending-scroll" show-scrollbar="false">
					<view class="trending-list">
						<trending-card v-for="prompt in randomPrompts" :key="prompt.id" :prompt="prompt"
							@click="viewPromptDetail" />
					</view>
				</scroll-view>
			</view>

			<!-- 搜索结果或全部提示词 -->
			<view class="prompts-section">
				<view class="section-title">
					<text class="title-text">{{ searchKeyword ? '搜索结果' : '全部' }}</text>
				</view>

				<view class="prompt-list">
					<prompt-card v-for="prompt in paginatedPrompts" :key="prompt.id" :prompt="prompt" @click="viewPromptDetail"
						@tagClick="goToCategory" />
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
import PromptCard from '@/components/prompt-card/prompt-card.vue'
import TrendingCard from '@/components/trending-card/trending-card.vue'

const searchKeyword = ref('')
const prompts = ref([])
const categories = ref([])
const currentPage = ref(1)
const pageSize = ref(20)

// 计算后的样式
const headerStyle = ref({})
// 计算滚动区域的padding-top
const scrollPaddingTop = ref('150rpx')

// 计算精选提示词（筛选分组为'精选'的提示词）
const featuredPrompts = computed(() => {
	if (searchKeyword.value || !prompts.value.length) return []

	return prompts.value
		.filter(prompt => prompt.group?.includes('精选'))
		.slice(0, 5)
})

// 计算随机推荐提示词（横向滚动）
const randomPrompts = computed(() => {
	if (searchKeyword.value || !prompts.value.length) return []

	// 随机选择10个提示词作为推荐
	return [...prompts.value].sort(() => Math.random() - 0.5).slice(0, 10)
})

// 计算过滤后的提示词
const filteredPrompts = computed(() => {
	if (!prompts.value.length) return []

	if (!searchKeyword.value) return prompts.value

	const keyword = searchKeyword.value.toLowerCase()
	return prompts.value.filter(prompt =>
		prompt.name.toLowerCase().includes(keyword) ||
		prompt.description.toLowerCase().includes(keyword)
	)
})

// 计算分页相关信息
const paginationInfo = computed(() => {
	const total = filteredPrompts.value.length
	const totalPages = Math.ceil(total / pageSize.value)
	const start = (currentPage.value - 1) * pageSize.value
	const end = start + pageSize.value

	return {
		totalPages,
		items: filteredPrompts.value.slice(start, end)
	}
})

// 分页相关属性
const totalPages = computed(() => paginationInfo.value.totalPages)
const paginatedPrompts = computed(() => paginationInfo.value.items)


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

// 加载提示词数据
const loadPrompts = async () => {
	try {
		// 直接从数据模块加载所有提示词
		const allPrompts = getAllPrompts()
		const allCategories = getAllCategories()

		prompts.value = allPrompts
		categories.value = allCategories

		console.log('成功加载', prompts.value.length, '个提示词')
		console.log('分类:', categories.value)
	} catch (error) {
		console.error('加载提示词失败:', error)
	}
}

// 获取胶囊按钮位置信息并计算样式
const getMenuButtonStyle = () => {
	try {
		const systemInfo = uni.getSystemInfoSync()
		const menuButton = uni.getMenuButtonBoundingClientRect()

		// 计算顶部安全距离（状态栏高度）
		const statusBarHeight = systemInfo.statusBarHeight || 0
		// 计算header的高度
		const headerHeight = menuButton.height + (menuButton.top - statusBarHeight) * 2
		// 计算文字左右边距
		const textMargin = systemInfo.windowWidth - menuButton.right

		headerStyle.value = {
			paddingTop: `${statusBarHeight}px`,
			paddingLeft: `${textMargin}px`,
			paddingRight: `${textMargin}px`,
			height: `${headerHeight}px`
		}

		// 计算滚动区域的padding-top（转换为rpx）
		const rpxRatio = 750 / systemInfo.windowWidth
		const scrollPadding = Math.round(headerHeight * rpxRatio) + 100 // 额外100rpx间距
		scrollPaddingTop.value = `${scrollPadding}rpx`

		console.log('胶囊按钮信息:', menuButton)
	} catch (error) {
		console.error('获取胶囊按钮位置失败:', error)
		// 使用默认值
		headerStyle.value = {
			paddingTop: '44px',
			paddingLeft: '32rpx',
			paddingRight: '32rpx',
			height: '88px'
		}
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

/* 热门推荐横向滚动 */
.trending-section {
	margin-top: 48rpx;
	padding: 0 32rpx;
}

.trending-scroll {
	white-space: nowrap;
}

.trending-list {
	display: inline-flex;
	gap: 16rpx;
	padding-bottom: 8rpx;
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

</style>