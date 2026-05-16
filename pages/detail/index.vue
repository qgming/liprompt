<template>
	<view class="container">
		<view v-if="isLoading" class="loading-state compact" :style="loadingStateStyle">
			<view class="loading-card">
				<icon class="loading-icon" type="waiting" size="36" color="#8e8e93" />
				<text class="loading-title">正在加载详情</text>
				<text class="loading-desc">正在准备完整提示词和图片</text>
			</view>
		</view>

		<template v-else-if="prompt">
			<page-back-bar />

			<view class="detail-content">
				<view v-if="isImagePrompt" class="gallery-section">
						<swiper class="gallery-swiper" :style="gallerySwiperStyle" circular indicator-dots
							indicator-active-color="#a66f24" @change="handleGalleryChange">
							<swiper-item v-for="(image, index) in galleryImages" :key="image">
								<image class="gallery-image" :src="image" mode="widthFix"
									@load="handleGalleryImageLoad(index, $event)" @click="previewImages(index)" />
							</swiper-item>
						</swiper>
					</view>

				<view class="header-section">
					<view class="header-top">
						<view v-if="prompt.emoji" class="prompt-emoji">{{ prompt.emoji }}</view>
						<view class="favorite-btn" :class="{ active: isFavorite }" @click="toggleFavorite">
							{{ isFavorite ? '已收藏' : '收藏' }}
						</view>
					</view>
					<text class="prompt-title">{{ prompt.name }}</text>
					<text class="prompt-description" user-select>{{ prompt.description }}</text>
					<text v-if="isImagePrompt && prompt.author" class="prompt-meta">{{ prompt.author }}</text>
					<view class="prompt-tags">
						<text class="tag" v-for="tag in prompt.group" :key="tag">{{ tag }}</text>
					</view>
				</view>

				<view class="content-section">
					<view class="section-header">
						<text class="section-title">完整提示词</text>
						<view class="section-actions">
							<button class="share-btn" open-type="share">分享给好友</button>
							<view class="copy-btn" @click="copyPrompt">复制</view>
						</view>
					</view>
					<view class="prompt-content">
						<text class="content-text" user-select>{{ prompt.prompt }}</text>
					</view>
				</view>
			</view>
		</template>

		<view v-else class="empty-state" :style="emptyStateStyle">
			<view class="empty-icon">📝</view>
			<text class="empty-text">提示词不存在</text>
			<view class="back-btn" @click="goBack">
				<text class="back-text">返回首页</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { bootstrapRemoteData } from '@/data/bootstrap.js'
import PageBackBar from '@/components/page-back-bar/page-back-bar.vue'
import { cacheImageBatch, getCachedImageSync } from '@/utils/image-cache.js'
import { getPromptById } from '@/data/prompts-manager.js'
import { getImagePromptById } from '@/data/image-prompts-manager.js'
import { isFavoritePrompt, toggleFavoritePrompt } from '@/data/favorites-manager.js'

const prompt = ref(null)
const isLoading = ref(true)
const isFavorite = ref(false)
const cachedImageMap = ref({})
const topSafeInset = ref(96)
const currentGalleryIndex = ref(0)
const galleryWidth = ref(0)
const galleryRatios = ref({})

const DEFAULT_GALLERY_RATIO = 1.2
const DETAIL_HORIZONTAL_PADDING = 64
const HERO_TOP_PADDING_RPX = 116

const isImagePrompt = computed(() => {
	return !!prompt.value && prompt.value.promptType === 'image'
})
const galleryImages = computed(() => {
	if (!isImagePrompt.value || !Array.isArray(prompt.value?.images)) {
		return []
	}

	return prompt.value.images.map((image) => {
		return cachedImageMap.value[image] || getCachedImageSync(image) || image
	})
})
const detailPath = computed(() => {
	if (!prompt.value) {
		return '/pages/index/index'
	}
	const query = isImagePrompt.value ? '&source=image' : ''
	return `/pages/detail/index?id=${prompt.value.id}${query}`
})
const loadingStateStyle = computed(() => ({
	paddingTop: `${topSafeInset.value + 24}px`
}))
const emptyStateStyle = computed(() => ({
	paddingTop: `${topSafeInset.value + 88}px`
}))
const galleryHeight = computed(() => {
	const ratio = galleryRatios.value[currentGalleryIndex.value] || DEFAULT_GALLERY_RATIO
	return Math.max(Math.round(galleryWidth.value * ratio), 240)
})
const gallerySwiperStyle = computed(() => ({
	height: `${galleryHeight.value}px`
}))

const showToast = (title, icon = 'success') => {
	uni.showToast({ title, icon })
}

const copyPrompt = () => {
	if (!prompt.value) {
		return
	}
	uni.setClipboardData({
		data: prompt.value.prompt,
		success: () => showToast('已复制到剪贴板'),
		fail: () => showToast('复制失败', 'none')
	})
}

const toggleFavorite = () => {
	if (!prompt.value) {
		return
	}

	const result = toggleFavoritePrompt(prompt.value)
	isFavorite.value = result.isFavorite
	showToast(result.isFavorite ? '已加入收藏' : '已取消收藏')
}

const previewImages = (current = 0) => {
	if (!isImagePrompt.value) {
		return
	}
	uni.previewImage({
		current: galleryImages.value[current],
		urls: galleryImages.value
	})
}

const handleGalleryChange = (event) => {
	currentGalleryIndex.value = event.detail?.current || 0
}

const handleGalleryImageLoad = (index, event) => {
	const { width, height } = event.detail || {}
	if (!width || !height) {
		return
	}

	const ratio = Number((height / width).toFixed(4))
	if (galleryRatios.value[index] === ratio) {
		return
	}

	galleryRatios.value = {
		...galleryRatios.value,
		[index]: ratio
	}
}

const goBack = () => {
	uni.navigateBack({
		fail: () => {
			uni.switchTab({
				url: '/pages/index/index'
			})
		}
	})
}

const resolvePrompt = (options = {}) => {
	if (!options.id) {
		return null
	}
	if (options.source === 'image' || options.id.startsWith('IMG_')) {
		return getImagePromptById(options.id)
	}
	return getPromptById(options.id) || getImagePromptById(options.id)
}

const cachePromptImages = async (images = []) => {
	const nextMap = {}
	images.forEach((image) => {
		const cached = getCachedImageSync(image)
		if (cached) {
			nextMap[image] = cached
		}
	})
	cachedImageMap.value = nextMap

	if (!images.length) {
		return
	}

	const result = await cacheImageBatch(images)
	cachedImageMap.value = {
		...cachedImageMap.value,
		...result
	}
}

const resolveTopSafeInset = () => {
	const defaultTopInset = uni.upx2px(HERO_TOP_PADDING_RPX)
	const defaultTopbarHeight = uni.upx2px(64)

	try {
		const windowInfo = wx.getWindowInfo()
		const statusBarHeight = Number(windowInfo.statusBarHeight) || 0
		const viewportWidth = Number(windowInfo.windowWidth) || 0
		let safeTop = statusBarHeight + 8
		let nextTopbarHeight = defaultTopbarHeight

		if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
			const menuButtonRect = uni.getMenuButtonBoundingClientRect()
			if (menuButtonRect?.top) {
				safeTop = menuButtonRect.top
			}
		}

		topSafeInset.value = Math.max(safeTop, defaultTopInset - nextTopbarHeight - uni.upx2px(24))
		galleryWidth.value = Math.max(viewportWidth - uni.upx2px(DETAIL_HORIZONTAL_PADDING), 200)
	} catch {
		topSafeInset.value = defaultTopInset - defaultTopbarHeight - uni.upx2px(24)
		galleryWidth.value = 320
	}
}

onMounted(() => {
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const options = currentPage ? currentPage.options : {}
	resolveTopSafeInset()
	bootstrapRemoteData()
		.then(() => {
			prompt.value = resolvePrompt(options)
			isFavorite.value = prompt.value ? isFavoritePrompt(prompt.value.id) : false
			currentGalleryIndex.value = 0
			galleryRatios.value = {}
			if (prompt.value?.promptType === 'image' && Array.isArray(prompt.value.images)) {
				cachePromptImages(prompt.value.images)
			}
		})
		.catch((error) => {
			console.error('加载详情失败:', error)
			uni.showToast({
				title: '提示词加载失败',
				icon: 'none'
			})
		})
		.finally(() => {
			isLoading.value = false
		})
})

const onShareAppMessage = () => {
	if (!prompt.value) {
		return {}
	}
	return {
		title: prompt.value.name,
		path: detailPath.value,
		desc: prompt.value.description,
		imageUrl: isImagePrompt.value ? prompt.value.coverImage : ''
	}
}

const onShareTimeline = () => {
	if (!prompt.value) {
		return {}
	}
	return {
		title: `${prompt.value.name} - 流金提示词`,
		query: detailPath.value.split('?')[1] || '',
		imageUrl: isImagePrompt.value ? prompt.value.coverImage : ''
	}
}
</script>

<style lang="scss">
.container {
	@include lp-page;
	min-height: 100vh;
	padding-bottom: 40rpx;
}

.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 120rpx 32rpx 80rpx;
}

.loading-state.compact {
	min-height: 60vh;
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

.detail-content {
	padding: 0 30rpx 36rpx;
}

.gallery-section,
.header-section,
.content-section {
	@include lp-card;
	margin-bottom: 24rpx;
	overflow: hidden;
}

.gallery-swiper {
	background: $lp-media-bg;
	transition: height 0.24s ease;
}

.gallery-image {
	width: 100%;
	display: block;
}

.prompt-title,
.prompt-description,
.prompt-meta,
.section-title,
.content-text,
.empty-text,
.back-text {
	display: block;
}

.header-section {
	padding: 38rpx 32rpx 34rpx;
	text-align: left;
}

.header-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
}

.prompt-emoji {
	font-size: 76rpx;
	margin-bottom: 18rpx;
}

.favorite-btn {
	@include lp-fill-control;
	flex-shrink: 0;
	padding: 13rpx 22rpx;
	font-size: 24rpx;
	line-height: 1;
	color: $lp-accent-text;
}

.favorite-btn.active {
	@include lp-primary-control;
}

.prompt-title {
	margin-top: 12rpx;
	font-size: 42rpx;
	font-weight: 700;
	line-height: 1.35;
	color: $lp-text-primary;
}

.prompt-description {
	margin-top: 14rpx;
	font-size: 28rpx;
	line-height: 1.6;
	color: $lp-text-secondary;
}

.prompt-meta {
	margin-top: 16rpx;
	font-size: 24rpx;
	color: $lp-text-tertiary;
}

.prompt-tags {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: 12rpx;
	margin-top: 22rpx;
}

.tag {
	@include lp-fill-control;
	padding: 7rpx 15rpx;
	font-size: 22rpx;
	color: $lp-text-secondary;
}

.content-section {
	padding: 28rpx;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 18rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	color: $lp-text-primary;
}

.section-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.share-btn,
.copy-btn {
	@include lp-fill-control($lp-radius-control);
	padding: 12rpx 22rpx;
	font-size: 24rpx;
	color: $lp-accent-text;
	line-height: 1;
}

.share-btn {
	margin: 0;
	border: none;
}

.prompt-content {
	@include lp-fill-control($lp-radius-control);
	padding: 28rpx;
}

.content-text {
	font-size: 27rpx;
	line-height: 1.72;
	color: $lp-text-primary;
	white-space: pre-wrap;
	word-break: break-word;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 0 40rpx 140rpx;
	text-align: center;
}

.empty-icon {
	font-size: 120rpx;
	margin-bottom: 24rpx;
}

.empty-text {
	font-size: 32rpx;
	color: $lp-text-secondary;
	margin-bottom: 40rpx;
}

.back-btn {
	@include lp-primary-control($lp-radius-card);
	padding: 20rpx 40rpx;
}

.back-text {
	font-size: 28rpx;
	font-weight: 500;
	color: inherit;
}
</style>
