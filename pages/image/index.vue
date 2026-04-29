<template>
	<view class="container">
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<page-hero-search v-model="searchKeyword" eyebrow="GPT-IMAGE-2" title="图片案例库"
				placeholder="搜索案例、作者、提示词..." @input="handleSearch">
				<scroll-view scroll-x class="chips" show-scrollbar="false">
					<view class="chip-list">
						<view v-for="category in categories" :key="category" class="chip"
							:class="{ active: selectedCategory === category }" @click="selectCategory(category)">
							{{ category }}
						</view>
					</view>
				</scroll-view>
			</page-hero-search>

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
				<view class="page-info" @click="showPageSelector">{{ currentPage }} / {{ totalPages }}</view>
				<view class="page-btn" :class="{ disabled: currentPage === totalPages }" @click="nextPage">下一页</view>
			</view>
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
						<view v-for="(item, index) in pickerPages" :key="index" class="picker-item">
							第 {{ item }} 页
						</view>
					</picker-view-column>
				</picker-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { bootstrapRemoteData } from '@/data/bootstrap.js'
import PageHeroSearch from '@/components/page-hero-search/page-hero-search.vue'
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
const pageSize = ref(24)
const isLoading = ref(true)
const imageRatios = ref({})
const cachedImageMap = ref({})
const showPicker = ref(false)
const pickerValue = ref([0])

const paginationData = computed(() =>
	getImagePromptsPaginated(currentPage.value, pageSize.value, {
		category: selectedCategory.value,
		search: searchKeyword.value
	})
)

const paginatedPrompts = computed(() => paginationData.value.data)
const totalPages = computed(() => Math.max(1, Math.ceil(paginationData.value.total / pageSize.value)))
const pickerPages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))

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
	currentPage.value = selectedPage
	hidePicker()

	uni.showToast({
		title: `已跳转到第${selectedPage}页`,
		icon: 'success',
		duration: 1500
	})
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
	background: #ffffff;
}

.loading-title,
.loading-desc,
.empty-title,
.empty-desc,
.page-info {
	display: block;
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

.waterfall,
.pagination,
.empty-state {
	padding: 0 32rpx;
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

.page-info {
	padding: 16rpx 24rpx;
	border-radius: 20rpx;
	background: #f6f0e5;
	font-size: 24rpx;
	color: #7b6d5c;
	cursor: pointer;
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
