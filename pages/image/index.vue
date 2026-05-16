<template>
	<view class="container">
		<scroll-view scroll-y class="page-scroll" enhanced :show-scrollbar="false">
			<page-hero-search v-model="searchKeyword" eyebrow="GPT-IMAGE-2" title="图片提示库"
				placeholder="搜索图片、作者、提示词..." @input="handleSearch">
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
					<icon class="loading-icon" type="waiting" size="36" color="#8e8e93" />
					<text class="loading-title">正在加载图片提示</text>
					<text class="loading-desc">图片提示词和封面数据正在统一同步，请稍候片刻</text>
				</view>
			</view>

			<view v-else-if="paginatedPrompts.length" class="waterfall">
				<view v-for="(column, columnIndex) in waterfallColumns" :key="columnIndex" class="waterfall-column">
					<view v-for="prompt in column" :key="prompt.id" class="card waterfall-card" @click="viewPromptDetail(prompt)">
						<view class="cover-wrap">
							<image class="cover" :src="getPromptCoverSrc(prompt)" mode="widthFix" lazy-load
								@load="handleImageLoad(prompt.id, $event)" />
							<view v-if="getImageCount(prompt) > 1" class="count">{{ getImageCount(prompt) }} 图</view>
						</view>
						<view class="card-content">
							<text class="card-title">{{ prompt.name }}</text>
							<view class="card-meta">
								<text class="card-author">{{ prompt.author }}</text>
								<text v-if="prompt.section" class="card-section">#{{ prompt.section }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<view v-else-if="!isLoading" class="empty-state">
				<text class="empty-icon">🖼️</text>
				<text class="empty-title">没有找到匹配内容</text>
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

<style lang="scss">
.container,
.page-scroll {
	@include lp-viewport-page;
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
	@include lp-card;
	width: 100%;
	padding: 40rpx 32rpx;
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
	color: $lp-text-primary;
}

.loading-desc {
	margin-top: 14rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: $lp-text-secondary;
}

.waterfall,
.pagination,
.empty-state {
	padding: 0 $lp-page-padding;
}

.chips {
	margin-top: 20rpx;
	white-space: nowrap;
}

.chip-list {
	display: inline-flex;
	gap: 12rpx;
	padding: 2rpx 2rpx 8rpx;
}

.chip {
	@include lp-control;
	padding: 13rpx 22rpx;
	font-size: 24rpx;
	color: $lp-text-secondary;
}

.chip.active {
	@include lp-accent-fill;
	font-weight: 600;
}

.waterfall {
	display: flex;
	gap: 16rpx;
	margin-top: 26rpx;
	padding-bottom: 28rpx;
}

.waterfall-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.card {
	@include lp-card;
	width: 100%;
	min-width: 0;
	overflow: hidden;
	transition: background-color 0.16s ease;
}

.waterfall-card {
	break-inside: avoid;
	box-sizing: border-box;
}

.card:active {
	@include lp-card-active;
}

.cover-wrap {
	position: relative;
	min-height: 220rpx;
	background: $lp-media-bg;
}

.cover {
	width: 100%;
	display: block;
}

.count {
	@include lp-overlay-pill;
	position: absolute;
	top: 18rpx;
	padding: 8rpx 15rpx;
	font-size: 20rpx;
}

.count {
	right: 18rpx;
}

.card-content {
	padding: 22rpx 22rpx 24rpx;
	min-width: 0;
	overflow: hidden;
}

.card-title,
.card-author,
.card-section {
	display: block;
}

.card-title {
	font-size: 28rpx;
	font-weight: 600;
	line-height: 1.4;
	color: $lp-text-primary;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-meta {
	display: flex;
	align-items: center;
	gap: 10rpx;
	width: 100%;
	margin-top: 14rpx;
	min-width: 0;
	overflow: hidden;
}

.card-author {
	flex-shrink: 0;
	font-size: 22rpx;
	color: $lp-text-secondary;
	white-space: nowrap;
}

.card-section {
	display: block;
	flex: 1 1 0;
	width: 0;
	min-width: 0;
	font-size: 22rpx;
	color: $lp-text-secondary;
	@include lp-text-ellipsis;
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
	color: $lp-text-primary;
}

.empty-desc {
	margin-top: 12rpx;
	font-size: 24rpx;
	color: $lp-text-secondary;
}

.pagination {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 18rpx;
	padding-bottom: 48rpx;
}

.page-btn {
	@include lp-control;
	padding: 16rpx 24rpx;
	font-size: 24rpx;
	color: $lp-text-secondary;
}

.page-btn.disabled {
	opacity: 0.35;
}

.page-info {
	@include lp-control;
	padding: 16rpx 24rpx;
	font-size: 24rpx;
	color: $lp-accent-text;
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
	background: $lp-mask-bg;
}

.picker-content {
	@include lp-bottom-sheet;
	width: 100%;
	overflow: hidden;
}

.picker-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 32rpx;
	border-bottom: 1rpx solid $lp-border-subtle;
}

.picker-cancel,
.picker-confirm {
	padding: 8rpx 16rpx;
	font-size: 32rpx;
	color: $lp-accent-text;
}

.picker-title {
	font-size: 32rpx;
	font-weight: 600;
	color: $lp-text-primary;
}

.picker-view {
	width: 100%;
	height: 500rpx;
	background: $lp-card-bg;
}

.picker-item {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	font-size: 32rpx;
	color: $lp-text-primary;
}
</style>
