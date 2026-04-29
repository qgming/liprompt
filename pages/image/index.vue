<template>
	<view class="container">
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<view class="hero">
				<text class="hero-title">GPT-Image-2 案例库</text>
			</view>

			<view class="toolbar">
				<view class="search-box">
					<input class="search-input" v-model="searchKeyword" placeholder="搜索案例、作者、提示词..." @input="handleSearch" />
				</view>
				<scroll-view scroll-x class="chips" show-scrollbar="false">
					<view class="chip-list">
						<view v-for="category in categories" :key="category" class="chip"
							:class="{ active: selectedCategory === category }" @click="selectCategory(category)">
							{{ category }}
						</view>
					</view>
				</scroll-view>
			</view>

			<view v-if="isLoading" class="loading-state">
				<view class="loading-card">
					<icon class="loading-icon" type="waiting" size="36" color="#b89467" />
					<text class="loading-title">正在加载图片案例</text>
					<text class="loading-desc">图片提示词和封面数据正在统一同步，请稍候片刻</text>
				</view>
			</view>

			<view v-else-if="paginatedPrompts.length" class="waterfall">
				<view v-for="(column, columnIndex) in waterfallColumns" :key="columnIndex" class="waterfall-column">
					<view v-for="prompt in column" :key="prompt.id" class="card waterfall-card" @click="viewPromptDetail(prompt)">
						<view class="cover-wrap">
							<image class="cover" :src="getPromptCoverSrc(prompt)" mode="widthFix" lazy-load
								@load="handleImageLoad(prompt.id, $event)" />
							<view class="badge">{{ prompt.section }}</view>
							<view v-if="getImageCount(prompt) > 1" class="count">{{ getImageCount(prompt) }} 图</view>
						</view>
						<view class="card-content">
							<text class="card-title">{{ prompt.name }}</text>
							<view class="card-meta">
								<text class="card-author">{{ prompt.author }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view v-else-if="!isLoading" class="empty-state">
				<text class="empty-icon">🖼️</text>
				<text class="empty-title">没有找到匹配案例</text>
				<text class="empty-desc">换个关键词或分类会更快找到灵感。</text>
			</view>

			<view v-if="totalPages > 1" class="pagination">
				<view class="page-btn" :class="{ disabled: currentPage === 1 }" @click="prevPage">上一页</view>
				<text class="page-text">{{ currentPage }} / {{ totalPages }}</text>
				<view class="page-btn" :class="{ disabled: currentPage === totalPages }" @click="nextPage">下一页</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { bootstrapRemoteData } from '@/data/bootstrap.js'
import { cacheImageBatch, getCachedImageSync } from '@/utils/image-cache.js'
import {
	getImageCategories,
	getImagePromptsPaginated
} from '@/data/image-prompts-manager.js'

const COLUMN_COUNT = 2
const DEFAULT_IMAGE_RATIO = 1.2
const CARD_CONTENT_WEIGHT = 0.42

const categories = ref([])
const searchKeyword = ref('')
const selectedCategory = ref('全部')
const currentPage = ref(1)
const pageSize = ref(12)
const isLoading = ref(true)
const imageRatios = ref({})
const cachedImageMap = ref({})

const paginationData = computed(() =>
	getImagePromptsPaginated(currentPage.value, pageSize.value, {
		category: selectedCategory.value,
		search: searchKeyword.value
	})
)

const paginatedPrompts = computed(() => paginationData.value.data)
const totalPages = computed(() => Math.max(1, Math.ceil(paginationData.value.total / pageSize.value)))

const getShortestColumnIndex = (heights) => {
	return heights.reduce((bestIndex, currentHeight, currentIndex) => {
		return currentHeight < heights[bestIndex] ? currentIndex : bestIndex
	}, 0)
}

const getPromptWeight = (prompt) => {
	const ratio = imageRatios.value[prompt.id] || DEFAULT_IMAGE_RATIO
	return ratio + CARD_CONTENT_WEIGHT
}

const waterfallColumns = computed(() => {
	const columns = Array.from({ length: COLUMN_COUNT }, () => [])
	const heights = Array(COLUMN_COUNT).fill(0)

	paginatedPrompts.value.forEach((prompt) => {
		const targetIndex = getShortestColumnIndex(heights)
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

const selectCategory = (category) => {
	selectedCategory.value = category
	resetPage()
}

const getImageCount = (prompt) => {
	return Array.isArray(prompt.images) ? prompt.images.length : 0
}

const getPromptCoverSrc = (prompt) => {
	return cachedImageMap.value[prompt.coverImage] || getCachedImageSync(prompt.coverImage) || prompt.coverImage
}

const handleImageLoad = (id, event) => {
	const { width, height } = event.detail || {}
	if (!width || !height) {
		return
	}

	const nextRatio = Number((height / width).toFixed(4))
	if (imageRatios.value[id] === nextRatio) {
		return
	}

	imageRatios.value = {
		...imageRatios.value,
		[id]: nextRatio
	}
}

let visibleBatchId = 0

const seedVisibleCache = (prompts = []) => {
	const nextMap = { ...cachedImageMap.value }
	prompts.forEach((prompt) => {
		const cached = getCachedImageSync(prompt.coverImage)
		if (cached) {
			nextMap[prompt.coverImage] = cached
		}
	})
	cachedImageMap.value = nextMap
}

const cacheVisibleCovers = async (prompts = []) => {
	const coverUrls = prompts.map((prompt) => prompt.coverImage).filter(Boolean)
	seedVisibleCache(prompts)
	if (!coverUrls.length) {
		return
	}

	const currentBatchId = ++visibleBatchId
	const result = await cacheImageBatch(coverUrls)
	if (currentBatchId !== visibleBatchId) {
		return
	}

	cachedImageMap.value = {
		...cachedImageMap.value,
		...result
	}
}

const loadImagePromptsData = async () => {
	try {
		await bootstrapRemoteData()
		imageRatios.value = {}
		cachedImageMap.value = {}
		categories.value = getImageCategories()
		cacheVisibleCovers(paginatedPrompts.value)
	} catch (error) {
		console.error('加载图片提示失败:', error)
		uni.showToast({
			title: '图片提示加载失败',
			icon: 'none'
		})
	} finally {
		isLoading.value = false
	}
}

const viewPromptDetail = (prompt) => {
	uni.navigateTo({
		url: `/pages/detail/index?id=${prompt.id}&source=image`
	})
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

onMounted(() => {
	loadImagePromptsData()
})

watch(paginatedPrompts, (prompts) => {
	if (!isLoading.value) {
		cacheVisibleCovers(prompts)
	}
})
</script>

<style>
.container,
.page-scroll {
	width: 100vw;
	height: 100vh;
	background: linear-gradient(180deg, #fcfaf6 0%, #ffffff 24%);
}

.hero {
	padding: 116rpx 32rpx 20rpx;
}

.hero-title,
.empty-title,
.empty-desc,
.page-text {
	display: block;
}

.hero-eyebrow {
	font-size: 22rpx;
	letter-spacing: 4rpx;
	color: #9d8560;
}

.hero-title {
	font-size: 52rpx;
	font-weight: 700;
	color: #221c12;
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

.toolbar,
.waterfall,
.pagination,
.empty-state {
	padding: 0 32rpx;
}

.search-box {
	padding: 0 32rpx 0 0;
}

.search-input {
	height: 84rpx;
	padding: 0 28rpx;
	background: rgba(255, 255, 255, 0.96);
	border: 1rpx solid #ede3d4;
	border-radius: 24rpx;
	font-size: 28rpx;
	color: #1f1a14;
	box-shadow: 0 10rpx 24rpx rgba(42, 32, 18, 0.04);
}

.chips {
	margin-top: 20rpx;
	white-space: nowrap;
}

.chip-list {
	display: inline-flex;
	gap: 14rpx;
	padding-bottom: 6rpx;
}

.chip {
	padding: 14rpx 24rpx;
	border-radius: 999rpx;
	background: #f5efe4;
	font-size: 24rpx;
	color: #7a6b57;
}

.chip.active {
	background: linear-gradient(135deg, #c9b08b 0%, #a98355 100%);
	color: #ffffff;
	box-shadow: 0 10rpx 24rpx rgba(169, 131, 85, 0.22);
}

.waterfall {
	display: flex;
	gap: 18rpx;
	margin-top: 28rpx;
	padding-bottom: 24rpx;
}

.waterfall-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 18rpx;
}

.card {
	background: #ffffff;
	border-radius: 28rpx;
	overflow: hidden;
	border: 1rpx solid #efe7da;
	box-shadow: 0 10rpx 30rpx rgba(34, 28, 18, 0.06);
}

.waterfall-card {
	break-inside: avoid;
}

.card:active {
	transform: translateY(-2rpx);
}

.cover-wrap {
	position: relative;
	min-height: 220rpx;
	background: linear-gradient(135deg, #f3eee5 0%, #faf8f4 100%);
}

.cover {
	width: 100%;
	display: block;
}

.badge,
.count {
	position: absolute;
	top: 18rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 20rpx;
	color: #ffffff;
	background: rgba(26, 21, 16, 0.7);
}

.badge {
	left: 18rpx;
	max-width: 220rpx;
}

.count {
	right: 18rpx;
}

.card-content {
	padding: 22rpx 22rpx 22rpx;
}

.card-title,
.card-author {
	display: block;
}

.card-title {
	font-size: 28rpx;
	font-weight: 600;
	line-height: 1.4;
	color: #1f1a14;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-meta {
	display: flex;
	align-items: center;
	margin-top: 14rpx;
}

.card-author {
	font-size: 22rpx;
	color: #9a8f80;
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

.page-btn {
	padding: 16rpx 24rpx;
	border-radius: 20rpx;
	background: #f6f0e5;
	font-size: 24rpx;
	color: #6f614f;
}

.page-btn.disabled {
	opacity: 0.35;
}

.page-text {
	font-size: 24rpx;
	color: #7b6d5c;
}
</style>
