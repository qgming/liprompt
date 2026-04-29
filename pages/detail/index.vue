<template>
	<view class="container">
		<view v-if="isLoading" class="loading-state compact" :style="loadingStateStyle">
			<view class="loading-card">
				<icon class="loading-icon" type="waiting" size="36" color="#b89467" />
				<text class="loading-title">正在加载详情</text>
				<text class="loading-desc">正在准备完整提示词和案例图片</text>
			</view>
		</view>

		<view v-else-if="prompt" class="detail-content" :style="detailContentStyle">
			<view class="page-topbar" :style="pageTopbarStyle">
				<view class="back-pill" @click="goBack">
					<image class="back-icon" src="/static/icons/back-arrow.svg" mode="aspectFit" />
					<text class="back-label">返回</text>
				</view>
			</view>

			<view v-if="isImagePrompt" class="gallery-section">
				<swiper class="gallery-swiper" :style="gallerySwiperStyle" circular indicator-dots
					indicator-active-color="#b89467" @change="handleGalleryChange">
					<swiper-item v-for="(image, index) in galleryImages" :key="image">
						<image class="gallery-image" :src="image" mode="widthFix" @load="handleGalleryImageLoad(index, $event)"
							@click="previewImages(index)" />
					</swiper-item>
				</swiper>
				<view class="gallery-tip">点击图片可查看原图，共 {{ galleryImages.length }} 张</view>
			</view>

			<view class="header-section">
				<view v-if="prompt.emoji" class="prompt-emoji">{{ prompt.emoji }}</view>
				<text class="prompt-title">{{ prompt.name }}</text>
				<text class="prompt-description" user-select>{{ prompt.description }}</text>
				<text v-if="isImagePrompt" class="prompt-meta">{{ prompt.author }} · {{ prompt.section }}</text>
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
import { cacheImageBatch, getCachedImageSync } from '@/utils/image-cache.js'
import { getPromptById } from '@/data/prompts-manager.js'
import { getImagePromptById } from '@/data/image-prompts-manager.js'

const prompt = ref(null)
const isLoading = ref(true)
const cachedImageMap = ref({})
const topSafeInset = ref(96)
const topbarHeight = ref(32)
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
const detailContentStyle = computed(() => ({
	paddingTop: `${topSafeInset.value}px`
}))
const pageTopbarStyle = computed(() => ({
	minHeight: `${topbarHeight.value}px`
}))
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
		const systemInfo = uni.getSystemInfoSync ? uni.getSystemInfoSync() : {}
		const statusBarHeight = Number(systemInfo.statusBarHeight) || 0
		const viewportWidth = Number(systemInfo.windowWidth) || 0
		let safeTop = statusBarHeight + 8
		let nextTopbarHeight = defaultTopbarHeight

		if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
			const menuButtonRect = uni.getMenuButtonBoundingClientRect()
			if (menuButtonRect?.top) {
				safeTop = menuButtonRect.top
			}
			if (menuButtonRect?.height) {
				nextTopbarHeight = menuButtonRect.height
			}
		}

		topSafeInset.value = Math.max(safeTop, defaultTopInset - nextTopbarHeight - uni.upx2px(24))
		topbarHeight.value = Math.max(nextTopbarHeight, defaultTopbarHeight)
		galleryWidth.value = Math.max(viewportWidth - uni.upx2px(DETAIL_HORIZONTAL_PADDING), 200)
	} catch {
		topSafeInset.value = defaultTopInset - defaultTopbarHeight - uni.upx2px(24)
		topbarHeight.value = defaultTopbarHeight
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

<style>
.container {
	min-height: 100vh;
	background: #ffffff;
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

.detail-content {
	padding: 0 32rpx 32rpx;
}

.page-topbar {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	margin-bottom: 24rpx;
	position: relative;
	z-index: 2;
}

.back-pill {
	display: inline-flex;
	align-items: center;
}

.back-pill {
	gap: 8rpx;
	padding: 10rpx 22rpx 10rpx 14rpx;
	border-radius: 999rpx;
	background: #ffffff;
	border: 1rpx solid rgba(0, 0, 0, 0.14);
}

.back-icon {
	width: 28rpx;
	height: 28rpx;
	display: block;
}

.back-label {
	display: block;
	font-size: 24rpx;
	font-weight: 500;
	color: #4b4b4b;
}

.gallery-section,
.header-section,
.content-section {
	background: #ffffff;
	border-radius: 28rpx;
	border: 1rpx solid #efe6d8;
	box-shadow: 0 8rpx 24rpx rgba(44, 31, 14, 0.05);
	margin-bottom: 24rpx;
	overflow: hidden;
}

.gallery-swiper {
	background: #f5efe5;
	transition: height 0.24s ease;
}

.gallery-image {
	width: 100%;
	display: block;
}

.gallery-tip,
.prompt-title,
.prompt-description,
.prompt-meta,
.section-title,
.content-text,
.empty-text,
.back-text {
	display: block;
}

.gallery-tip {
	padding: 18rpx 24rpx 22rpx;
	font-size: 24rpx;
	color: #866f4d;
	background: #fffaf1;
}

.header-section {
	padding: 40rpx 32rpx;
	text-align: left;
}

.prompt-emoji {
	font-size: 76rpx;
	margin-bottom: 18rpx;
}

.prompt-title {
	font-size: 42rpx;
	font-weight: 700;
	line-height: 1.35;
	color: #1f1a14;
}

.prompt-description {
	margin-top: 14rpx;
	font-size: 28rpx;
	line-height: 1.6;
	color: #7c6e5b;
}

.prompt-meta {
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #a18b6a;
}

.prompt-tags {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: 12rpx;
	margin-top: 22rpx;
}

.tag {
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	color: #7d6d5a;
	background: #f6f0e6;
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
	color: #1f1a14;
}

.section-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.share-btn,
.copy-btn {
	padding: 12rpx 22rpx;
	border-radius: 18rpx;
	font-size: 24rpx;
	color: #7b6c59;
	background: #f5efe4;
	line-height: 1;
}

.share-btn {
	margin: 0;
	border: none;
}

.prompt-content {
	padding: 24rpx;
	border-radius: 20rpx;
	background: #fbfaf7;
	border: 1rpx solid #f0eadf;
}

.content-text {
	font-size: 27rpx;
	line-height: 1.72;
	color: #241d14;
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
	color: #8e7f6c;
	margin-bottom: 40rpx;
}

.back-btn {
	padding: 20rpx 40rpx;
	background: #b89467;
	border-radius: 24rpx;
}

.back-text {
	font-size: 28rpx;
	font-weight: 500;
	color: #ffffff;
}
</style>
