<template>
	<view class="container">
		<view v-if="isLoading" class="loading-state compact">
			<view class="loading-card">
				<icon class="loading-icon" type="waiting" size="36" color="#b89467" />
				<text class="loading-title">正在加载详情</text>
				<text class="loading-desc">正在准备完整提示词和案例图片</text>
			</view>
		</view>

		<view v-else-if="prompt" class="detail-content">
			<view v-if="isImagePrompt" class="gallery-section">
				<swiper class="gallery-swiper" circular indicator-dots indicator-active-color="#b89467">
					<swiper-item v-for="(image, index) in galleryImages" :key="image">
						<image class="gallery-image" :src="image" mode="aspectFill" @click="previewImages(index)" />
					</swiper-item>
				</swiper>
				<view class="gallery-tip">点击图片可查看原图，共 {{ galleryImages.length }} 张</view>
			</view>

			<view class="header-section">
				<view class="prompt-emoji">{{ prompt.emoji }}</view>
				<text class="prompt-title">{{ prompt.name }}</text>
				<text class="prompt-description">{{ prompt.description }}</text>
				<text v-if="isImagePrompt" class="prompt-meta">{{ prompt.author }} · {{ prompt.section }}</text>
				<view class="prompt-tags">
					<text class="tag" v-for="tag in prompt.group" :key="tag">{{ tag }}</text>
				</view>
			</view>

			<view class="content-section">
				<view class="section-header">
					<text class="section-title">完整提示词</text>
					<view class="copy-btn" @click="copyPrompt">复制</view>
				</view>
				<view class="prompt-content">
					<text class="content-text">{{ prompt.prompt }}</text>
				</view>
			</view>

			<view class="action-section" :class="{ 'image-actions': isImagePrompt }">
				<button class="action-btn primary" @click="copyPrompt">复制提示词</button>
				<button v-if="isImagePrompt" class="action-btn secondary" @click="previewImages()">预览原图</button>
				<button v-if="isImagePrompt" class="action-btn secondary" open-type="share">分享案例</button>
				<button v-else class="action-btn secondary" open-type="share">分享给好友</button>
			</view>
		</view>

		<view v-else class="empty-state">
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

onMounted(() => {
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const options = currentPage ? currentPage.options : {}
	bootstrapRemoteData()
		.then(() => {
			prompt.value = resolvePrompt(options)
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
	background: linear-gradient(180deg, #fcfaf6 0%, #ffffff 26%);
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
	padding-top: 80rpx;
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
	padding: 24rpx 32rpx 32rpx;
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
	height: 720rpx;
	background: #f5efe5;
}

.gallery-image {
	width: 100%;
	height: 100%;
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
	text-align: center;
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
	justify-content: center;
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

.copy-btn {
	padding: 12rpx 22rpx;
	border-radius: 18rpx;
	font-size: 24rpx;
	color: #7b6c59;
	background: #f5efe4;
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

.action-section {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16rpx;
}

.action-section.image-actions {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 22rpx;
	border-radius: 22rpx;
	font-size: 28rpx;
}

.action-btn.primary {
	background: linear-gradient(135deg, #c6a57a 0%, #a57d4e 100%);
	color: #ffffff;
	box-shadow: 0 12rpx 24rpx rgba(165, 125, 78, 0.24);
}

.action-btn.secondary {
	background: #ffffff;
	color: #726351;
	border: 1rpx solid #eadfce;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 140rpx 40rpx;
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
