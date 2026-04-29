<template>
	<view class="container">
		<page-back-bar />

		<view v-if="isLoading" class="loading-state compact">
			<view class="loading-card">
				<icon class="loading-icon" type="waiting" size="36" color="#b89467" />
				<text class="loading-title">正在加载分类</text>
				<text class="loading-desc">分类和提示词数据正在统一同步，请稍候片刻</text>
			</view>
		</view>

		<view v-else class="page-layout">
			<scroll-view scroll-y class="sidebar" enhanced :show-scrollbar="false">
				<view class="category-nav">
					<view class="nav-item" v-for="category in categories" :key="category" @click="selectCategory(category)"
						:class="{ active: selectedCategory === category }">
						<text class="nav-name">{{ category }}</text>
						<view class="nav-count-badge">{{ getCategoryCount(category) }}</view>
					</view>
				</view>
			</scroll-view>

			<scroll-view scroll-y class="content-area" enhanced :show-scrollbar="false" :bounces="true">
				<view v-if="selectedCategory" class="content-wrapper">
					<view class="prompt-grid">
						<view class="prompt-card" v-for="prompt in filteredPrompts" :key="prompt.id"
							@click="viewPromptDetail(prompt)">
							<view class="card-header">
								<text class="card-emoji">{{ prompt.emoji }}</text>
								<text class="card-name">{{ prompt.name }}</text>
							</view>
							<text class="card-desc">{{ prompt.description }}</text>
							<view class="card-tags">
								<text class="tag" v-for="tag in prompt.group" :key="tag">{{ tag }}</text>
							</view>
						</view>
					</view>
				</view>

				<view v-else class="empty-state">
					<view class="empty-emoji">📂</view>
					<text class="empty-title">选择分类</text>
					<text class="empty-desc">请从左侧选择一个分类查看提示词</text>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { bootstrapRemoteData } from '@/data/bootstrap.js'
import PageBackBar from '@/components/page-back-bar/page-back-bar.vue'
import { getAllPrompts, getAllCategories } from '@/data/prompts-manager.js'

const selectedCategory = ref('')
const prompts = ref([])
const categories = ref([])
const isLoading = ref(true)

// 计算过滤后的提示词 - 根据分类过滤
const filteredPrompts = computed(() => {
	if (!selectedCategory.value) return []
	return prompts.value.filter(prompt =>
		prompt.group && prompt.group.includes(selectedCategory.value)
	)
})


// 获取分类下的提示词数量
const getCategoryCount = (category) => {
	return prompts.value.filter(prompt =>
		prompt.group.includes(category)
	).length
}

// 选择分类
const selectCategory = (category) => {
	selectedCategory.value = category
}

// 自动选择第一个分类
const autoSelectFirstCategory = () => {
	if (categories.value.length > 0 && !selectedCategory.value) {
		selectedCategory.value = categories.value[0]
	}
}

const resolveInitialCategory = (options = {}) => {
	const categoryName = decodeURIComponent(options.name || '').trim()
	if (!categoryName) {
		autoSelectFirstCategory()
		return
	}

	selectedCategory.value = categories.value.includes(categoryName) ? categoryName : categories.value[0]
}

// 查看提示词详情
const viewPromptDetail = (prompt) => {
	// 跳转到详情页面，传递ID参数
	uni.navigateTo({
		url: `/pages/detail/index?id=${prompt.id}`
	})
}

// 加载提示词数据 - 使用新的数据加载方式
const loadPromptsData = async () => {
	try {
		await bootstrapRemoteData()
		const allPrompts = getAllPrompts()
		const allCategories = getAllCategories()

		prompts.value = allPrompts
		categories.value = allCategories
	} catch (error) {
		console.error('加载提示词失败:', error)
		uni.showToast({
			title: '提示词加载失败',
			icon: 'none'
		})
	} finally {
		isLoading.value = false
	}
}

onMounted(() => {
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const options = currentPage ? currentPage.options : {}

	loadPromptsData().then(() => {
		resolveInitialCategory(options)
	})

	// 监听来自首页的选中分类事件
	uni.$on('selectCategory', (category) => {
		selectedCategory.value = category
	})
})

// 分享给好友
const onShareAppMessage = (res) => {
	return {
		title: '提示词分类 - 流金提示词',
		path: '/pages/category/index',
		desc: '探索各种分类的优质AI提示词，找到适合的创作灵感',
		imageUrl: ''
	}
}

// 分享到朋友圈
const onShareTimeline = () => {
	return {
		title: '提示词分类大全 - 流金提示词',
		query: '',
		imageUrl: ''
	}
}

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
	display: flex;
	flex-direction: column;
	font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
	overflow: hidden;
}

.page-layout {
	flex: 1;
	display: flex;
	min-height: 0;
}

.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	padding: 80rpx 32rpx;
}

.loading-state.compact {
	min-height: 60vh;
}

.loading-card {
	width: 100%;
	padding: 40rpx 32rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.96);
	border: 1rpx solid #efe3d4;
	box-shadow: 0 14rpx 32rpx rgba(52, 38, 18, 0.08);
	text-align: center;
}

.loading-icon,
.loading-title,
.loading-desc {
	display: block;
}

.loading-title {
	margin-top: 18rpx;
	font-size: 32rpx;
	font-weight: 600;
	color: #2a2116;
}

.loading-desc {
	margin-top: 14rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: #8b7a66;
}

/* 左侧导航栏 */
.sidebar {
	width: 160rpx;
	height: 100%;
	background: #ffffff;
	flex-shrink: 0;
}

.category-nav {
	padding-top: 0;
}

.nav-item {
	display: flex;
	align-items: center;
	padding: 16rpx 12rpx;
	margin: 8rpx 8rpx;
	border-radius: 16rpx;
	transition: all 0.2s ease;
	position: relative;
	gap: 8rpx;
	min-height: 60rpx;
	box-sizing: border-box;
}

.nav-item.active {
	background: linear-gradient(135deg, #f8f4e6 0%, #f0e6d2 100%);
	color: #B8A88C;
	box-shadow: 0 2rpx 8rpx rgba(184, 168, 140, 0.15);
}

.nav-item.active::before {
	content: '';
	position: absolute;
	left: -9rpx;
	top: 50%;
	transform: translateY(-50%);
	width: 4rpx;
	height: 36rpx;
	background: #B8A88C;
	border-radius: 0 2rpx 2rpx 0;
	z-index: 1;
}

.nav-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #1d1d1f;
	line-height: 1.3;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.nav-count-badge {
	background: #f2f2f7;
	color: #8e8e93;
	font-size: 20rpx;
	font-weight: 500;
	padding: 4rpx 10rpx;
	border-radius: 12rpx;
	min-width: 32rpx;
	text-align: center;
	transition: all 0.2s ease;
}

.nav-item.active .nav-name {
	color: #B8A88C;
}

.nav-item.active .nav-count-badge {
	background: #B8A88C;
	color: #ffffff;
}

/* 右侧内容区域 */
.content-area {
	flex: 1;
	height: 100%;
	background: #ffffff;
	-webkit-overflow-scrolling: touch;
	scroll-behavior: smooth;
}

.content-wrapper {
	padding: 20rpx;
	padding-right: 32rpx;
}

/* 提示词网格 */
.prompt-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300rpx, 1fr));
	gap: 24rpx;
}

.prompt-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 28rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid #f0f0f0;
	transition: all 0.2s ease;
	will-change: transform;
	backface-visibility: hidden;
	cursor: pointer;
}

.prompt-card:active {
	transform: translateY(-4rpx);
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
}

.card-header {
	display: flex;
	align-items: center;
	margin-bottom: 16rpx;
}

.card-emoji {
	font-size: 36rpx;
	margin-right: 16rpx;
}

.card-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
	line-height: 1.3;
}

.card-desc {
	display: block;
	font-size: 26rpx;
	color: #8e8e93;
	line-height: 1.5;
	margin-bottom: 20rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.card-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}

.tag {
	background: #f2f2f7;
	color: #8e8e93;
	font-size: 22rpx;
	padding: 6rpx 12rpx;
	border-radius: 12rpx;
	transition: all 0.2s ease;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	padding: 60rpx 40rpx;
}

.empty-emoji {
	font-size: 120rpx;
	margin-bottom: 32rpx;
	opacity: 0.6;
}

.empty-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #1d1d1f;
	margin-bottom: 16rpx;
}

.empty-desc {
	font-size: 28rpx;
	color: #8e8e93;
	text-align: center;
	line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 750rpx) {
	.sidebar {
		width: 140rpx;
	}

	.nav-item {
		padding: 12rpx 10rpx;
		margin: 6rpx 6rpx;
		gap: 6rpx;
	}

	.nav-name {
		font-size: 22rpx;
	}

	.nav-count-badge {
		font-size: 18rpx;
		padding: 3rpx 8rpx;
		border-radius: 10rpx;
		min-width: 28rpx;
	}

	.nav-item.active::before {
		left: -7rpx;
	}

	.content-wrapper {
		padding: 24rpx;
		padding-top: 16rpx;
	}

	.prompt-grid {
		grid-template-columns: 1fr;
		gap: 16rpx;
	}

	.prompt-card {
		padding: 24rpx;
	}

	.card-header {
		margin-bottom: 12rpx;
	}

	.card-emoji {
		font-size: 32rpx;
		margin-right: 12rpx;
	}

	.card-name {
		font-size: 30rpx;
	}

	.card-desc {
		font-size: 24rpx;
		margin-bottom: 16rpx;
		-webkit-line-clamp: 3;
	}

	.tag {
		font-size: 20rpx;
		padding: 4rpx 10rpx;
		border-radius: 10rpx;
	}
}

/* 横屏适配 */
@media (orientation: landscape) {
	.prompt-grid {
		grid-template-columns: repeat(auto-fill, minmax(280rpx, 1fr));
	}
}
</style>
