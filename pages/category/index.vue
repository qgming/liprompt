<template>
	<view class="container">
		<!-- 搜索栏 -->
		<view class="search-section">
			<view class="search-box">
				<input
					class="search-input"
					type="text"
					v-model="searchKeyword"
					placeholder="搜索提示词..."
					@input="handleSearch"
				/>
				<view class="search-icon">🔍</view>
			</view>
		</view>

		<scroll-view scroll-y class="scroll-content">
			<!-- 分类列表 -->
			<view class="category-section">
				<view class="section-title">
					<text class="title-text">所有分类</text>
					<text class="title-count">({{ filteredCategories.length }})</text>
				</view>

				<view class="category-grid">
					<view
						class="category-card"
						v-for="category in filteredCategories"
						:key="category"
						@click="selectCategory(category)"
						:class="{ active: selectedCategory === category }"
					>
						<view class="category-emoji">{{ getCategoryEmoji(category) }}</view>
						<text class="category-name">{{ category }}</text>
						<text class="category-count">({{ getCategoryCount(category) }})</text>
					</view>
				</view>
			</view>

			<!-- 选中分类的提示词列表 -->
			<view v-if="selectedCategory" class="prompts-section">
				<view class="section-title">
					<text class="title-text">{{ selectedCategory }}</text>
					<text class="title-count">({{ filteredPrompts.length }})</text>
				</view>

				<view class="prompt-list">
					<view
						class="prompt-card"
						v-for="prompt in filteredPrompts"
						:key="prompt.id"
						@click="viewPromptDetail(prompt)"
					>
						<view class="prompt-header">
							<view class="prompt-emoji">{{ prompt.emoji }}</view>
							<view class="prompt-info">
								<text class="prompt-name">{{ prompt.name }}</text>
								<text class="prompt-desc">{{ prompt.description }}</text>
							</view>
						</view>
						<view class="prompt-tags">
							<text
								class="tag"
								v-for="tag in prompt.group"
								:key="tag"
							>
								{{ tag }}
							</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getAllPrompts, getPromptsByCategory, getAllCategories } from '@/data/prompts.js'

const searchKeyword = ref('')
const selectedCategory = ref('')
const prompts = ref([])
const categories = ref([])

// 计算过滤后的分类
const filteredCategories = computed(() => {
	if (!searchKeyword.value) {
		return categories.value
	}
	return categories.value.filter(category =>
		category.toLowerCase().includes(searchKeyword.value.toLowerCase())
	)
})

// 计算过滤后的提示词 - 使用新的分类查询函数
const filteredPrompts = computed(() => {
	if (!selectedCategory.value) return []
	return getPromptsByCategory(selectedCategory.value)
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
		'金融': '💰'
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
	if (searchKeyword.value) {
		// 如果有搜索关键词，清除选中的分类
		selectedCategory.value = ''
	}
}, 300)

// 选择分类
const selectCategory = (category) => {
	selectedCategory.value = category
	searchKeyword.value = ''
}

// 查看提示词详情
const viewPromptDetail = (prompt) => {
	// 将提示词内容存储到本地
	uni.setStorageSync('currentPrompt', prompt)
	// 跳转到首页显示详情
	uni.switchTab({
		url: '/pages/index/index'
	})
}

// 加载提示词数据 - 使用新的数据加载方式
const loadPrompts = async () => {
	try {
		// 显示加载提示
		uni.showLoading({
			title: '加载中...',
			mask: true
		})

		// 直接从数据模块加载所有提示词和分类
		const allPrompts = getAllPrompts()
		const allCategories = getAllCategories()

		prompts.value = allPrompts
		categories.value = allCategories

		uni.hideLoading()

		console.log('成功加载', prompts.value.length, '个提示词')
		console.log('分类:', categories.value)

		// 显示成功提示
		uni.showToast({
			title: `已加载${prompts.value.length}个提示词`,
			icon: 'success',
			duration: 2000
		})
	} catch (error) {
		uni.hideLoading()
		console.error('加载提示词失败:', error)

		uni.showToast({
			title: '加载提示词失败',
			icon: 'none',
			duration: 3000
		})
	}
}

onMounted(() => {
	loadPrompts()

	// 监听来自首页的选中分类事件
	uni.$on('selectCategory', (category) => {
		selectedCategory.value = category
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
	background: #fafbfc;
	display: flex;
	flex-direction: column;
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 搜索区域 */
.search-section {
	padding: 24rpx 32rpx;
	background: #ffffff;
	border-bottom: 1rpx solid #f0f0f0;
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

.scroll-content {
	flex: 1;
	padding: 0 32rpx 32rpx;
}

/* 分类区域 */
.category-section {
	margin-bottom: 32rpx;
}

.section-title {
	display: flex;
	align-items: center;
	margin-bottom: 24rpx;
}

.title-text {
	font-size: 36rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-right: 12rpx;
}

.title-count {
	font-size: 26rpx;
	color: #8e8e93;
}

.category-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16rpx;
}

.category-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 28rpx 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
}

.category-card:active {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	background: #f8f9fa;
}

.category-card.active {
	border-color: #B8A88C;
	background: linear-gradient(135deg, #f8f4e6 0%, #f0e6d2 100%);
}

.category-emoji {
	font-size: 44rpx;
	margin-bottom: 16rpx;
}

.category-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 8rpx;
}

.category-count {
	font-size: 24rpx;
	color: #8e8e93;
}

/* 提示词列表 */
.prompts-section {
	margin-top: 40rpx;
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
}

.prompt-info {
	flex: 1;
}

.prompt-name {
	display: block;
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 8rpx;
}

.prompt-desc {
	display: block;
	font-size: 28rpx;
	color: #8e8e93;
	line-height: 1.4;
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
}

.tag:active {
	background: #B8A88C;
	color: #ffffff;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.category-grid {
		grid-template-columns: 1fr;
	}

	.search-section {
		padding: 20rpx 24rpx;
	}

	.scroll-content {
		padding: 0 24rpx 32rpx;
	}

	.category-card {
		padding: 24rpx 20rpx;
	}

	.category-emoji {
		font-size: 40rpx;
	}

	.category-name {
		font-size: 28rpx;
	}

	.prompt-card {
		padding: 20rpx 24rpx;
	}

	.prompt-emoji {
		font-size: 36rpx;
		margin-right: 16rpx;
	}

	.prompt-name {
		font-size: 30rpx;
	}

	.prompt-desc {
		font-size: 26rpx;
	}
}
</style>