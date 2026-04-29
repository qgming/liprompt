<template>
	<view class="container">
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<page-hero-search v-model="searchKeyword" eyebrow="AI PROMPTS" title="流金提示词" placeholder="搜索提示词..."
				@input="handleSearch" />

			<view v-if="isLoading" class="loading-state">
				<view class="loading-card">
					<icon class="loading-icon" type="waiting" size="36" color="#b89467" />
					<text class="loading-title">正在加载提示词</text>
					<text class="loading-desc">首页和图片库数据正在统一同步，请稍候片刻</text>
				</view>
			</view>

			<template v-else>
				<view v-if="visibleRandomPrompts.length" class="recommend-section">
					<view class="recommend-header">
						<text class="recommend-title">随机推荐</text>
					</view>
					<scroll-view scroll-x class="recommend-scroll" show-scrollbar="false">
						<view class="recommend-list">
							<trending-card v-for="prompt in visibleRandomPrompts" :key="prompt.id" :prompt="prompt"
								@click="viewPromptDetail" />
						</view>
					</scroll-view>
				</view>

				<view class="results-bar">
					<text class="results-title">{{ searchKeyword ? '搜索结果' : '全部提示词' }}</text>
					<view class="results-action" @click="openCategoryPage">分类浏览</view>
				</view>

				<view v-if="paginatedPrompts.length" class="waterfall">
					<view v-for="(column, columnIndex) in waterfallColumns" :key="columnIndex" class="waterfall-column">
						<prompt-waterfall-card v-for="prompt in column" :key="prompt.id" :prompt="prompt"
							@click="viewPromptDetail" @tagClick="goToCategory" />
					</view>
				</view>

				<view v-else class="empty-state">
					<view class="empty-icon">📝</view>
					<text class="empty-title">暂无相关提示词</text>
					<text class="empty-desc">试试其他关键词吧</text>
				</view>

				<view v-if="totalPages > 1" class="pagination">
					<view class="page-btn" :class="{ disabled: currentPage <= 1 }" @click="prevPage">上一页</view>
					<view class="page-info" @click="showPageSelector">{{ currentPage }} / {{ totalPages }}</view>
					<view class="page-btn" :class="{ disabled: currentPage >= totalPages }" @click="nextPage">下一页</view>
				</view>
			</template>
		</scroll-view>

		<view v-if="showPicker" class="picker-mask" @click="hidePicker">
			<view class="picker-content" @click.stop>
				<view class="picker-header">
					<view class="picker-cancel" @click="hidePicker">取消</view>
					<view class="picker-title">选择页数</view>
					<view class="picker-confirm" @click="confirmPicker">确定</view>
				</view>
				<picker-view class="picker-view" :value="pickerValue" @change="onPickerChange">
					<picker-view-column>
						<view v-for="item in pickerPages" :key="item" class="picker-item">第 {{ item }} 页</view>
					</picker-view-column>
				</picker-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { bootstrapRemoteData } from '@/data/bootstrap.js'
import { getAllPrompts } from '@/data/prompts-manager.js'
import PageHeroSearch from '@/components/page-hero-search/page-hero-search.vue'
import PromptWaterfallCard from '@/components/prompt-waterfall-card/prompt-waterfall-card.vue'
import TrendingCard from '@/components/trending-card/trending-card.vue'

const COLUMN_COUNT = 2
const BASE_CARD_WEIGHT = 1

const searchKeyword = ref('')
const prompts = ref([])
const currentPage = ref(1)
const pageSize = ref(24)
const isLoading = ref(true)
const showPicker = ref(false)
const pickerValue = ref([0])
const randomPrompts = ref([])

const filteredPrompts = computed(() => {
	const keyword = searchKeyword.value.trim().toLowerCase()
	if (!keyword) {
		return prompts.value
	}

	return prompts.value.filter((prompt) => {
		return [prompt.name, prompt.description, prompt.prompt]
			.filter(Boolean)
			.some((item) => item.toLowerCase().includes(keyword))
	})
})

const visibleRandomPrompts = computed(() => {
	return searchKeyword.value.trim() ? [] : randomPrompts.value
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredPrompts.value.length / pageSize.value)))
const paginatedPrompts = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value
	return filteredPrompts.value.slice(start, start + pageSize.value)
})
const pickerPages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))

const getPromptWeight = (prompt) => {
	const titleLength = prompt.name?.length || 0
	const descLength = prompt.description?.length || 0
	const tagCount = Array.isArray(prompt.group) ? Math.min(prompt.group.length, 4) : 0
	return BASE_CARD_WEIGHT + titleLength / 40 + descLength / 60 + tagCount * 0.12
}

const waterfallColumns = computed(() => {
	const columns = Array.from({ length: COLUMN_COUNT }, () => [])
	const heights = Array(COLUMN_COUNT).fill(0)

	paginatedPrompts.value.forEach((prompt) => {
		const targetIndex = heights[0] <= heights[1] ? 0 : 1
		columns[targetIndex].push(prompt)
		heights[targetIndex] += getPromptWeight(prompt)
	})

	return columns
})

const resetPage = () => {
	currentPage.value = 1
}

const handleSearch = () => {
	resetPage()
}

const openCategoryPage = () => {
	uni.navigateTo({ url: '/pages/category/index' })
}

const goToCategory = (category) => {
	uni.navigateTo({
		url: `/pages/category/index?name=${encodeURIComponent(category)}`
	})
}

const viewPromptDetail = (prompt) => {
	uni.navigateTo({ url: `/pages/detail/index?id=${prompt.id}` })
}

const prevPage = () => {
	if (currentPage.value > 1) {
		currentPage.value -= 1
	}
}

const nextPage = () => {
	if (currentPage.value < totalPages.value) {
		currentPage.value += 1
	}
}

const showPageSelector = () => {
	pickerValue.value = [currentPage.value - 1]
	showPicker.value = true
}

const hidePicker = () => {
	showPicker.value = false
}

const onPickerChange = (event) => {
	pickerValue.value = event.detail.value
}

const confirmPicker = () => {
	const selectedPage = pickerPages.value[pickerValue.value[0]]
	if (!selectedPage) {
		hidePicker()
		return
	}

	currentPage.value = selectedPage
	hidePicker()
	uni.showToast({ title: `已跳转到第${selectedPage}页`, icon: 'success', duration: 1500 })
}

const loadPromptsData = async () => {
	try {
		await bootstrapRemoteData()
		prompts.value = getAllPrompts()
		randomPrompts.value = [...prompts.value].sort(() => Math.random() - 0.5).slice(0, 10)
	} catch (error) {
		console.error('加载提示词失败:', error)
		uni.showToast({ title: '提示词加载失败', icon: 'none' })
	} finally {
		isLoading.value = false
	}
}

onMounted(() => {
	loadPromptsData()
})

const onShareAppMessage = () => {
	return {
		title: '流金提示词 - 精选AI提示词库',
		path: '/pages/index/index',
		desc: '发现精选和推荐的高质量AI提示词，提升你的AI创作效率',
		imageUrl: ''
	}
}

const onShareTimeline = () => {
	return {
		title: '流金提示词 - 精选AI提示词库，提升AI创作效率',
		query: '',
		imageUrl: ''
	}
}
</script>

<style>
.container,
.page-scroll {
	width: 100vw;
	height: 100vh;
	background: #ffffff;
}

.results-title,
.recommend-title,
.loading-title,
.loading-desc,
.empty-title,
.empty-desc,
.page-info {
	display: block;
}

.recommend-section,
.results-bar,
.waterfall,
.pagination,
.empty-state {
	padding: 0 32rpx;
}

.recommend-section {
	margin-top: 20rpx;
}

.recommend-header {
	margin-bottom: 22rpx;
}

.recommend-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #241d14;
}

.recommend-scroll {
	white-space: nowrap;
}

.recommend-list {
	display: inline-flex;
	gap: 16rpx;
	padding-bottom: 8rpx;
}

.loading-state {
	display: flex;
	justify-content: center;
	padding: 80rpx 32rpx 24rpx;
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

.results-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 24rpx;
}

.results-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #241d14;
}

.results-action {
	padding: 14rpx 22rpx;
	border-radius: 999rpx;
	background: #f6f0e5;
	font-size: 24rpx;
	font-weight: 500;
	color: #7b6d5c;
}

.waterfall {
	display: flex;
	gap: 18rpx;
	margin-top: 24rpx;
	padding-bottom: 24rpx;
}

.waterfall-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 120rpx;
}

.empty-icon {
	font-size: 88rpx;
}

.empty-title {
	margin-top: 24rpx;
	font-size: 32rpx;
	color: #251d13;
}

.empty-desc {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #8f806d;
}

.pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 18rpx;
	padding-bottom: 48rpx;
}

.page-btn,
.page-info {
	padding: 16rpx 24rpx;
	border-radius: 20rpx;
	background: #f6f0e5;
	font-size: 24rpx;
}

.page-btn {
	color: #6f614f;
}

.page-btn.disabled {
	opacity: 0.35;
}

.page-info {
	color: #7b6d5c;
}

.picker-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.5);
}

.picker-content {
	width: 100%;
	background: #ffffff;
	border-radius: 24rpx 24rpx 0 0;
	overflow: hidden;
}

.picker-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 32rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.picker-cancel,
.picker-confirm {
	padding: 8rpx 16rpx;
	font-size: 32rpx;
	color: #007aff;
}

.picker-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1d1d1f;
}

.picker-view {
	width: 100%;
	height: 500rpx;
	background: #ffffff;
}

.picker-item {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	font-size: 32rpx;
	color: #1d1d1f;
}
</style>
